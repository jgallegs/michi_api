import { findEnvironmentInCollection } from 'utils/collections';
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

const describeRequest = (item) => {
  const request = item?.draft?.request || item?.request;
  return {
    name: item?.name,
    method: request?.method,
    url: request?.url
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
      request: kind === 'request' ? describeRequest(item) : null,
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
