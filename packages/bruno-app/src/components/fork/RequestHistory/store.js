// Request history kept on this machine (localStorage): what was sent, when, with which environment
// and what came back. Bodies are cut to a short excerpt and anything that looks like a credential is
// masked, in the URL and in the excerpt. Request headers are never stored.

const STORAGE_KEY = 'michi.history';
export const MAX_ENTRIES = 300;
export const EXCERPT_LENGTH = 1000;
export const MASK = '***';

const SENSITIVE_NAME = /(token|password|passwd|pwd|secret|api[-_]?key|apikey|auth|signature|session|credential)/i;

const listeners = new Set();
let cache = null;

const read = () => {
  if (cache) {
    return cache;
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    cache = Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    cache = [];
  }
  return cache;
};

const write = (entries) => {
  cache = entries;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    // Storage full or blocked: keep the history for this session.
  }
  listeners.forEach((listener) => listener());
};

export const maskUrl = (url) => {
  if (typeof url !== 'string' || !url) {
    return '';
  }
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) {
      parsed.username = parsed.username ? MASK : '';
      parsed.password = parsed.password ? MASK : '';
    }
    for (const key of [...parsed.searchParams.keys()]) {
      if (SENSITIVE_NAME.test(key)) {
        parsed.searchParams.set(key, MASK);
      }
    }
    return decodeURI(parsed.toString());
  } catch (err) {
    return url.replace(/([?&]([^=&#]*)=)([^&#]*)/g, (match, prefix, key) => (SENSITIVE_NAME.test(key) ? `${prefix}${MASK}` : match));
  }
};

const maskText = (text) =>
  text
    .replace(/("([^"\\]*)"\s*:\s*)"(?:[^"\\]|\\.)*"/g, (match, prefix, key) => (SENSITIVE_NAME.test(key) ? `${prefix}"${MASK}"` : match))
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/g, `$1 ${MASK}`);

export const makeExcerpt = (data) => {
  if (data === undefined || data === null || data === '') {
    return '';
  }
  let text;
  try {
    text = typeof data === 'string' ? data : JSON.stringify(data);
  } catch (err) {
    return '';
  }
  const masked = maskText(text);
  return masked.length > EXCERPT_LENGTH ? `${masked.slice(0, EXCERPT_LENGTH)}…` : masked;
};

export const getHistory = () => read();

export const addHistoryEntry = (entry) => {
  const next = [{ id: `${entry.at}-${Math.random().toString(36).slice(2, 8)}`, ...entry }, ...read()];
  write(next.slice(0, MAX_ENTRIES));
};

export const clearHistory = () => write([]);

export const subscribeToHistory = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// Only for tests.
export const resetHistoryCache = () => {
  cache = null;
};
