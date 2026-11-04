import { useSyncExternalStore } from 'react';

// Sensitive flags live only on this machine so collections stay byte-compatible with upstream Bruno.
// Environment uids are regenerated on every mount, hence the collection path + environment name key.
export const STORAGE_KEY = 'fork.sensitiveEnvironments';
export const SNOOZE_MINUTES = 15;

const listeners = new Set();
const snoozedUntil = new Map();

const readAll = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeAll = (value) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  listeners.forEach((listener) => listener());
};

const getKeyParts = (collection, environment) => {
  if (!collection?.pathname || !environment?.name) {
    return null;
  }
  return { collectionPath: collection.pathname, environmentName: environment.name };
};

export const isSensitiveEnvironment = (collection, environment) => {
  const parts = getKeyParts(collection, environment);
  if (!parts) {
    return false;
  }
  return readAll()[parts.collectionPath]?.[parts.environmentName] === true;
};

export const setSensitiveEnvironment = (collection, environment, sensitive) => {
  const parts = getKeyParts(collection, environment);
  if (!parts) {
    return;
  }

  const all = readAll();
  const environments = { ...all[parts.collectionPath] };

  if (sensitive) {
    environments[parts.environmentName] = true;
  } else {
    delete environments[parts.environmentName];
  }

  if (Object.keys(environments).length) {
    all[parts.collectionPath] = environments;
  } else {
    delete all[parts.collectionPath];
  }

  writeAll(all);
};

const snoozeKey = ({ collectionPath, environmentName }) => `${collectionPath}::${environmentName}`;

export const snoozeSensitiveEnvironment = (collection, environment, now = Date.now()) => {
  const parts = getKeyParts(collection, environment);
  if (parts) {
    snoozedUntil.set(snoozeKey(parts), now + SNOOZE_MINUTES * 60 * 1000);
  }
};

export const isSensitiveEnvironmentSnoozed = (collection, environment, now = Date.now()) => {
  const parts = getKeyParts(collection, environment);
  if (!parts) {
    return false;
  }
  const until = snoozedUntil.get(snoozeKey(parts));
  return Boolean(until && until > now);
};

export const clearSnoozes = () => snoozedUntil.clear();

const subscribe = (listener) => {
  listeners.add(listener);
  const onStorage = (event) => {
    if (event.key === STORAGE_KEY) {
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
};

export const useIsSensitiveEnvironment = (collection, environment) => {
  return useSyncExternalStore(subscribe, () => isSensitiveEnvironment(collection, environment));
};
