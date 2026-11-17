import { useSyncExternalStore } from 'react';
import { MAX_FIELDS } from './paths';

// What the canvas knows about the responses beyond what is on screen: the field names seen in earlier
// responses of each request, kept on this computer between sessions, and the API documents open in the
// app. Only names are kept, never a value of a response.
const STORAGE_KEY = 'michi.flows.fields';
const MAX_REQUESTS = 400;
const NO_DOCUMENTS = [];

const listeners = new Set();
let remembered = null;
let documents = NO_DOCUMENTS;
let known = null;

const emit = () => {
  known = null;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const keyOf = (path) => String(path || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();

const isShape = (entry) => Boolean(entry) && Array.isArray(entry.fields) && Array.isArray(entry.lists);

const read = () => {
  if (remembered) {
    return remembered;
  }
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    remembered = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
  } catch (err) {
    remembered = {};
  }
  return remembered;
};

// A full or blocked storage only means the fields are asked again next session.
const write = () => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remembered));
  } catch (err) {
    // Nothing to do: the names are still known until the app closes.
  }
};

export const recallShape = (collectionPath, requestPath) => {
  const entry = read()[keyOf(collectionPath)]?.[keyOf(requestPath)];
  return isShape(entry) ? entry : null;
};

const sameItems = (a, b) => a.length === b.length && a.every((item, index) => item === b[index]);

// The newest response goes first; names seen before stay, because a failed answer and a good one do
// not carry the same fields and both are worth offering.
export const rememberShape = (collectionPath, requestPath, shape, now = Date.now()) => {
  const names = (shape?.fields || []).filter((name) => typeof name === 'string');
  if (!collectionPath || !requestPath || !names.length) {
    return;
  }
  const all = read();
  const collectionKey = keyOf(collectionPath);
  const requestKey = keyOf(requestPath);
  const before = isShape(all[collectionKey]?.[requestKey]) ? all[collectionKey][requestKey] : { fields: [], lists: [] };
  const fields = [...new Set([...names, ...before.fields])].slice(0, MAX_FIELDS);
  const lists = [...new Set([...(shape.lists || []), ...before.lists])].filter((path) => fields.includes(path));
  if (sameItems(fields, before.fields) && sameItems(lists, before.lists)) {
    return;
  }
  const requests = { ...(all[collectionKey] || {}), [requestKey]: { fields, lists, at: now } };
  const kept = Object.entries(requests)
    .sort(([, a], [, b]) => (b.at || 0) - (a.at || 0))
    .slice(0, MAX_REQUESTS);
  remembered = { ...all, [collectionKey]: Object.fromEntries(kept) };
  write();
  emit();
};

export const setApiDocuments = (next) => {
  const list = (next || []).filter((document) => document && typeof document === 'object');
  if (list.length === documents.length && list.every((document, index) => document === documents[index])) {
    return;
  }
  documents = list.length ? list : NO_DOCUMENTS;
  emit();
};

// What is known right now. It is a new object whenever something is learned, so the canvas can
// describe its steps again.
export const getKnownFields = () => {
  if (!known) {
    known = { documents, recall: recallShape };
  }
  return known;
};

export const useKnownFields = () => useSyncExternalStore(subscribe, getKnownFields);

// Only for tests.
export const resetKnownFields = () => {
  remembered = null;
  documents = NO_DOCUMENTS;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    // Storage is not there in every test environment.
  }
  emit();
};
