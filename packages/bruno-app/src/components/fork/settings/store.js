import { useSyncExternalStore } from 'react';

// Per-machine switches for the fork's own features. They live in localStorage so collection files
// never change and every feature can be turned off to get the upstream behaviour back.
const STORAGE_KEY = 'michi.settings';

export const FORK_SETTINGS = {
  SENSITIVE_WRITES_ONLY: 'sensitiveWritesOnly',
  LABEL_PREVIEW: 'labelPreview',
  LOCAL_TIME: 'localTime',
  REQUEST_HISTORY: 'requestHistory',
  SPANISH_UI: 'spanishUi'
};

const DEFAULTS = {
  [FORK_SETTINGS.SENSITIVE_WRITES_ONLY]: true,
  [FORK_SETTINGS.LABEL_PREVIEW]: true,
  [FORK_SETTINGS.LOCAL_TIME]: true,
  [FORK_SETTINGS.REQUEST_HISTORY]: true,
  [FORK_SETTINGS.SPANISH_UI]: false
};

const listeners = new Set();
let cache = null;

const read = () => {
  if (cache) {
    return cache;
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    cache = parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    cache = {};
  }
  return cache;
};

export const getForkSetting = (id) => {
  const value = read()[id];
  return typeof value === 'boolean' ? value : DEFAULTS[id] === true;
};

export const setForkSetting = (id, value) => {
  cache = { ...read(), [id]: value === true };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (err) {
    // Storage full or blocked: keep the value for this session.
  }
  listeners.forEach((listener) => listener());
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const subscribeToForkSettings = subscribe;

export const useForkSetting = (id) => useSyncExternalStore(subscribe, () => getForkSetting(id));

// Only for tests.
export const resetForkSettingsCache = () => {
  cache = null;
};
