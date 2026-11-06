import { FORK_SETTINGS, getForkSetting } from 'components/fork/settings/store';
import { addHistoryEntry, makeExcerpt, maskUrl } from './store';

const RESPONSE_RECEIVED = 'collections/responseReceived';

const findItem = (items, uid) => {
  for (const item of items || []) {
    if (item.uid === uid) {
      return item;
    }
    const found = findItem(item.items, uid);
    if (found) {
      return found;
    }
  }
  return null;
};

export const buildHistoryEntry = (state, payload, now = Date.now()) => {
  const { collectionUid, itemUid, response, requestSent } = payload || {};
  if (!response) {
    // Cancelled requests carry no response.
    return null;
  }
  const collection = (state.collections?.collections || []).find((c) => c.uid === collectionUid);
  if (!collection) {
    return null;
  }
  const item = findItem(collection.items, itemUid);
  const request = item?.draft?.request || item?.request || {};
  const environment = (collection.environments || []).find((env) => env.uid === collection.activeEnvironmentUid);

  return {
    at: now,
    collection: { name: collection.name, pathname: collection.pathname },
    request: { name: item?.name || '', pathname: item?.pathname || '', type: item?.type || '' },
    method: (requestSent?.method || request.method || '').toUpperCase(),
    url: maskUrl(requestSent?.url || request.url || ''),
    environment: environment ? environment.name : null,
    status: response.status ?? null,
    statusText: response.statusText || '',
    duration: typeof response.duration === 'number' ? response.duration : null,
    size: typeof response.size === 'number' ? response.size : null,
    isError: Boolean(response.isError),
    error: response.error ? String(response.error).slice(0, 300) : '',
    excerpt: makeExcerpt(response.data)
  };
};

// Records every request sent from a request tab. The collection runner keeps its own report.
export const requestHistoryMiddleware = (store) => (next) => (action) => {
  if (action?.type === RESPONSE_RECEIVED && getForkSetting(FORK_SETTINGS.REQUEST_HISTORY)) {
    try {
      const entry = buildHistoryEntry(store.getState(), action.payload);
      if (entry) {
        addHistoryEntry(entry);
      }
    } catch (err) {
      // The history must never get in the way of a response.
    }
  }
  return next(action);
};
