import { useEffect, useSyncExternalStore } from 'react';
import { flowsApi } from './api';
import { createFlow as buildFlow, flowSignature, normalizeFlow, normalizeFolder } from './model';

// Flows of every open collection, keyed by collection path. "saved" mirrors .michi.json; "drafts" holds
// edits not yet written, so switching tabs keeps unsaved work until the app is closed or the flow is
// saved or discarded. The file is re-read when the window regains focus, so a git pull shows up at once.
// "bases" remembers the saved version each draft started from, to tell when the file changed under it.
const EMPTY_ENTRY = { saved: {}, drafts: {}, bases: {}, loaded: false, loading: false, error: null };

const entries = new Map();
const listeners = new Set();

const emit = () => listeners.forEach((listener) => listener());

const getEntry = (collectionPath) => entries.get(collectionPath) || EMPTY_ENTRY;

const setEntry = (collectionPath, patch) => {
  entries.set(collectionPath, { ...getEntry(collectionPath), ...patch });
  emit();
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const loadFlows = async (collectionPath) => {
  if (!collectionPath) {
    return;
  }
  setEntry(collectionPath, { loading: true });
  try {
    const list = await flowsApi.list(collectionPath);
    const saved = {};
    (Array.isArray(list) ? list : []).forEach((raw) => {
      const flow = normalizeFlow(raw);
      if (flow) {
        saved[flow.id] = flow;
      }
    });
    setEntry(collectionPath, { saved, loaded: true, loading: false, error: null });
  } catch (err) {
    setEntry(collectionPath, { loaded: true, loading: false, error: err.message });
  }
};

export const useCollectionFlows = (collectionPath) => {
  const entry = useSyncExternalStore(subscribe, () => getEntry(collectionPath));

  useEffect(() => {
    if (collectionPath && !getEntry(collectionPath).loaded) {
      loadFlows(collectionPath);
    }
  }, [collectionPath]);

  return entry;
};

export const getFlow = (collectionPath, flowId) => {
  const entry = getEntry(collectionPath);
  return entry.drafts[flowId] || entry.saved[flowId] || null;
};

export const useFlow = (collectionPath, flowId) => useSyncExternalStore(subscribe, () => getFlow(collectionPath, flowId));

const findFlowName = (flowId) => {
  for (const { saved, drafts } of entries.values()) {
    const flow = drafts[flowId] || saved[flowId];
    if (flow) {
      return flow.name;
    }
  }
  return null;
};

// Tab titles only know the flow id; ids are unique across collections.
export const useFlowName = (flowId) => useSyncExternalStore(subscribe, () => findFlowName(flowId));

export const isFlowDirty = (collectionPath, flowId) => {
  const { saved, drafts } = getEntry(collectionPath);
  return Boolean(drafts[flowId]) && (!saved[flowId] || flowSignature(drafts[flowId]) !== flowSignature(saved[flowId]));
};

export const useFlowDirty = (collectionPath, flowId) => useSyncExternalStore(subscribe, () => isFlowDirty(collectionPath, flowId));

// A flow someone else changed (a git pull, usually) while it has unsaved edits here: saving replaces their version.
export const isFlowStale = (collectionPath, flowId) => {
  const { saved, drafts, bases } = getEntry(collectionPath);
  return Boolean(drafts[flowId] && saved[flowId] && bases[flowId] !== undefined && flowSignature(saved[flowId]) !== bases[flowId]);
};

export const useFlowStale = (collectionPath, flowId) => useSyncExternalStore(subscribe, () => isFlowStale(collectionPath, flowId));

const without = (map, key) => {
  const next = { ...map };
  delete next[key];
  return next;
};

export const updateFlowDraft = (collectionPath, flowId, updater) => {
  const current = getFlow(collectionPath, flowId);
  if (!current) {
    return;
  }
  const { saved, drafts, bases } = getEntry(collectionPath);
  const startsDraft = !drafts[flowId] && saved[flowId];
  setEntry(collectionPath, {
    drafts: { ...drafts, [flowId]: updater(current) },
    bases: startsDraft ? { ...bases, [flowId]: flowSignature(saved[flowId]) } : bases
  });
};

export const discardFlowDraft = (collectionPath, flowId) => {
  const { drafts, bases } = getEntry(collectionPath);
  if (!drafts[flowId]) {
    return;
  }
  setEntry(collectionPath, { drafts: without(drafts, flowId), bases: without(bases, flowId) });
};

const persist = async (collectionPath, flow) => {
  await flowsApi.save(collectionPath, flow);
  const { saved, drafts, bases } = getEntry(collectionPath);
  setEntry(collectionPath, { saved: { ...saved, [flow.id]: flow }, drafts: without(drafts, flow.id), bases: without(bases, flow.id) });
  return flow;
};

export const saveFlow = (collectionPath, flowId) => {
  const flow = getFlow(collectionPath, flowId);
  if (!flow) {
    return Promise.reject(new Error('Flow not found'));
  }
  return persist(collectionPath, flow);
};

export const createFlow = (collectionPath, { name, folder }) => persist(collectionPath, buildFlow({ name, folder }));

// Renames or moves a flow without saving pending graph edits: the saved copy gets the new name and
// folder, and a draft, if any, keeps its edits with the same new name and folder.
export const renameFlow = async (collectionPath, flowId, { name, folder }) => {
  const { saved, drafts } = getEntry(collectionPath);
  const base = saved[flowId] || drafts[flowId];
  if (!base) {
    throw new Error('Flow not found');
  }
  const meta = { name: name.trim(), folder: normalizeFolder(folder) };
  const nextSaved = { ...base, ...meta };
  await flowsApi.save(collectionPath, nextSaved);
  const nextDrafts = drafts[flowId] ? { ...drafts, [flowId]: { ...drafts[flowId], ...meta } } : drafts;
  const { bases } = getEntry(collectionPath);
  const nextBases = drafts[flowId] ? { ...bases, [flowId]: flowSignature(nextSaved) } : bases;
  setEntry(collectionPath, { saved: { ...saved, [flowId]: nextSaved }, drafts: nextDrafts, bases: nextBases });
  return nextSaved;
};

export const deleteFlow = async (collectionPath, flowId) => {
  await flowsApi.delete(collectionPath, flowId);
  const { saved, drafts, bases } = getEntry(collectionPath);
  setEntry(collectionPath, { saved: without(saved, flowId), drafts: without(drafts, flowId), bases: without(bases, flowId) });
};

export const reloadLoadedCollections = () => {
  [...entries.entries()].filter(([, entry]) => entry.loaded).forEach(([collectionPath]) => loadFlows(collectionPath));
};

export const installFlowsReload = () => {
  window.addEventListener('focus', reloadLoadedCollections);
  return () => window.removeEventListener('focus', reloadLoadedCollections);
};

// Only for tests.
export const resetFlowsStore = () => {
  entries.clear();
  emit();
};
