import { useEffect, useSyncExternalStore } from 'react';

// An environment is sensitive when it is listed in the collection's shared settings file (.michi.json,
// read and written by the main process) or, for marks made before that file existed, in this machine's
// local storage. Nothing is stored inside the environment files, so collections stay compatible with
// upstream Bruno. Environment uids change on every mount, hence the path + environment name keys.
export const STORAGE_KEY = 'fork.sensitiveEnvironments';
export const SNOOZE_MINUTES = 15;
const READ_CHANNEL = 'fork:sensitive-environments:read';
const WRITE_CHANNEL = 'fork:sensitive-environments:write';

const listeners = new Set();
const snoozedUntil = new Map();
const sharedByCollection = new Map();

const emit = () => listeners.forEach((listener) => listener());

const readLocal = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeLocal = (value) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
};

const getKeyParts = (collection, environment) => {
  if (!collection?.pathname || !environment?.name) {
    return null;
  }
  return { collectionPath: collection.pathname, environmentName: environment.name };
};

const setLocalMark = ({ collectionPath, environmentName }, sensitive) => {
  const all = readLocal();
  const environments = { ...all[collectionPath] };
  if (sensitive) {
    environments[environmentName] = true;
  } else {
    delete environments[environmentName];
  }
  if (Object.keys(environments).length) {
    all[collectionPath] = environments;
  } else {
    delete all[collectionPath];
  }
  writeLocal(all);
};

const isLocallySensitive = ({ collectionPath, environmentName }) => readLocal()[collectionPath]?.[environmentName] === true;

const isSharedSensitive = ({ collectionPath, environmentName }) => Boolean(sharedByCollection.get(collectionPath)?.has(environmentName));

const storeShared = (collectionPath, names) => {
  const next = new Set(Array.isArray(names) ? names : []);
  const previous = sharedByCollection.get(collectionPath);
  const changed = !previous || previous.size !== next.size || [...next].some((name) => !previous.has(name));
  sharedByCollection.set(collectionPath, next);
  if (changed) {
    emit();
  }
};

export const isSensitiveEnvironment = (collection, environment) => {
  const parts = getKeyParts(collection, environment);
  return Boolean(parts && (isSharedSensitive(parts) || isLocallySensitive(parts)));
};

export const loadSharedSensitiveEnvironments = async (collection) => {
  if (!collection?.pathname || !window.ipcRenderer) {
    return;
  }
  try {
    storeShared(collection.pathname, await window.ipcRenderer.invoke(READ_CHANNEL, collection.pathname));
  } catch {
    // Unreadable settings file: keep the last known state rather than dropping marks.
  }
};

// Resolves to true when the mark was saved in the collection file, false when it could only be kept locally.
export const setSensitiveEnvironment = async (collection, environment, sensitive) => {
  const parts = getKeyParts(collection, environment);
  if (!parts) {
    return false;
  }

  if (!sensitive) {
    setLocalMark(parts, false);
  }

  try {
    if (!window.ipcRenderer) {
      throw new Error('No main process available');
    }
    storeShared(parts.collectionPath, await window.ipcRenderer.invoke(WRITE_CHANNEL, parts.collectionPath, parts.environmentName, sensitive));
    emit();
    return true;
  } catch {
    if (sensitive) {
      setLocalMark(parts, true);
    }
    emit();
    return false;
  }
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

export const resetSharedCache = () => sharedByCollection.clear();

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

// Reloads the shared file on mount and whenever the window regains focus (e.g. after a git pull).
export const useIsSensitiveEnvironment = (collection, environment) => {
  const collectionPath = collection?.pathname;
  useEffect(() => {
    if (!collectionPath) {
      return undefined;
    }
    const reload = () => loadSharedSensitiveEnvironments({ pathname: collectionPath });
    reload();
    window.addEventListener('focus', reload);
    return () => window.removeEventListener('focus', reload);
  }, [collectionPath]);

  return useSyncExternalStore(subscribe, () => isSensitiveEnvironment(collection, environment));
};
