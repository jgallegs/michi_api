import { findEnvironmentInCollection, getAllVariables } from 'utils/collections';
import { interpolateUrl } from 'utils/url/index';
import { FORK_SETTINGS, getForkSetting } from 'components/fork/settings/store';
import {
  isSensitiveEnvironment,
  isSensitiveEnvironmentSnoozed,
  loadSharedSensitiveEnvironments,
  snoozeSensitiveEnvironment
} from './store';

const listeners = new Set();
let pendingConfirmation = null;
let mountedHosts = 0;

const emit = () => listeners.forEach((listener) => listener());

export const subscribeToConfirmations = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getPendingConfirmation = () => pendingConfirmation;

export const registerConfirmationHost = () => {
  mountedHosts += 1;
  return () => {
    mountedHosts -= 1;
  };
};

const READ_ONLY_METHODS = ['GET', 'HEAD', 'OPTIONS'];

// Only plain HTTP reads and GraphQL queries are treated as harmless; anything else may change data.
export const isReadOnlyRequest = (item) => {
  const request = item?.draft?.request || item?.request;
  if (!request) {
    return false;
  }
  if (item.type === 'http-request') {
    return READ_ONLY_METHODS.includes(String(request.method || '').toUpperCase());
  }
  if (item.type === 'graphql-request') {
    const query = String(request.body?.graphql?.query || '').replace(/#[^\n]*/g, '');
    return query.trim().length > 0 && !/\bmutation\b/.test(query);
  }
  return false;
};

const resolveUrl = (collection, item, url) => {
  if (!url || !collection) {
    return url;
  }
  try {
    return interpolateUrl({ url, variables: getAllVariables(collection, item) }) || url;
  } catch (err) {
    return url;
  }
};

const describeRequest = (collection, item) => {
  const request = item?.draft?.request || item?.request;
  return {
    name: item?.name,
    method: request?.method,
    url: resolveUrl(collection, item, request?.url)
  };
};

const requestConfirmation = async ({ kind, collection, item }) => {
  const environment = collection ? findEnvironmentInCollection(collection, collection.activeEnvironmentUid) : null;

  // Re-read the shared file on every send so a mark pulled from git applies immediately.
  if (environment) {
    await loadSharedSensitiveEnvironments(collection);
  }

  if (
    !environment
    || !isSensitiveEnvironment(collection, environment)
    || isSensitiveEnvironmentSnoozed(collection, environment)
  ) {
    return true;
  }

  if (kind === 'request' && getForkSetting(FORK_SETTINGS.SENSITIVE_WRITES_ONLY) && isReadOnlyRequest(item)) {
    return true;
  }

  // Without a mounted host there is no themed modal to show, but a sensitive call must never go out unconfirmed.
  if (!mountedHosts) {
    return window.confirm(`"${environment.name}" is a sensitive environment. Continue?`);
  }

  // A second trigger while the dialog is open (e.g. a repeated shortcut) is dropped, not queued.
  if (pendingConfirmation) {
    return false;
  }

  return new Promise((resolve) => {
    pendingConfirmation = {
      kind,
      collection,
      environment,
      request: kind === 'request' ? describeRequest(collection, item) : null,
      resolve
    };
    emit();
  });
};

export const resolvePendingConfirmation = ({ confirmed, snooze = false }) => {
  if (!pendingConfirmation) {
    return;
  }

  const { resolve, collection, environment } = pendingConfirmation;
  if (confirmed && snooze) {
    snoozeSensitiveEnvironment(collection, environment);
  }

  pendingConfirmation = null;
  emit();
  resolve(confirmed);
};

export const confirmSendInSensitiveEnvironment = (collection, item) => {
  return requestConfirmation({ kind: 'request', collection, item });
};

export const confirmRunInSensitiveEnvironment = (collection) => {
  return requestConfirmation({ kind: 'runner', collection });
};

export const confirmFlowInSensitiveEnvironment = (collection) => {
  return requestConfirmation({ kind: 'flow', collection });
};
