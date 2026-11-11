import { useSyncExternalStore } from 'react';

// The barcodes of every response received since the app was opened (or since the session was cleared),
// per collection: creating ten shipments leaves their numbers together, to draw them in one go.
// Kept in memory only. A value already in the session is not added twice.
export const MAX_SESSION_BARCODES = 500;

const NONE = [];
const sessions = new Map();
const listeners = new Set();
let counter = 0;

const emit = () => listeners.forEach((listener) => listener());

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getSession = (collectionUid) => sessions.get(collectionUid) || NONE;

// caption: what the barcodes of one response are shown under (the request and the time).
export const addToSession = (collectionUid, caption, barcodes) => {
  if (!collectionUid || !Array.isArray(barcodes)) {
    return 0;
  }
  const current = getSession(collectionUid);
  const known = new Set(current.map((barcode) => barcode.value));
  const fresh = barcodes.filter((barcode) => {
    if (known.has(barcode.value)) {
      return false;
    }
    known.add(barcode.value);
    return true;
  });
  if (!fresh.length) {
    return 0;
  }
  counter += 1;
  const added = fresh.map((barcode, index) => ({ ...barcode, id: `s${counter}-${index}`, caption }));
  sessions.set(collectionUid, [...current, ...added].slice(-MAX_SESSION_BARCODES));
  emit();
  return added.length;
};

export const clearSession = (collectionUid) => {
  if (sessions.delete(collectionUid)) {
    emit();
  }
};

export const useSession = (collectionUid) => useSyncExternalStore(subscribe, () => getSession(collectionUid));

// Only for tests.
export const resetSessions = () => {
  sessions.clear();
  emit();
};
