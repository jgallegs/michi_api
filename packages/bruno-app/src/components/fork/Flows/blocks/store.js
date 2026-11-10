import { useEffect, useSyncExternalStore } from 'react';
import { flowsApi } from '../api';
import { FLOW_VERSION, isValidFlowName } from '../model';

// The blocks a team saved in each open collection, read from .michi.json ("flowBlocks"). They are small
// and change rarely, so there are no drafts: saving or deleting one writes the file at once.
const NONE = [];
const entries = new Map();
const listeners = new Set();
let watchesFocus = false;

const emit = () => listeners.forEach((listener) => listener());

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const compareNames = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

const isUsable = (block) =>
  Boolean(block) && typeof block.id === 'string' && isValidFlowName(block.name) && block.version === FLOW_VERSION && Array.isArray(block.nodes) && Array.isArray(block.edges);

const setBlocks = (collectionPath, blocks) => {
  entries.set(collectionPath, [...blocks].sort(compareNames));
  emit();
};

export const getOwnBlocks = (collectionPath) => entries.get(collectionPath) || NONE;

// A collection whose file cannot be read simply has no blocks to offer; the flows panel already says why.
export const loadOwnBlocks = async (collectionPath) => {
  if (!collectionPath) {
    return;
  }
  try {
    const list = await flowsApi.listBlocks(collectionPath);
    setBlocks(collectionPath, (Array.isArray(list) ? list : []).filter(isUsable));
  } catch (err) {
    setBlocks(collectionPath, []);
  }
};

const reloadAll = () => [...entries.keys()].forEach(loadOwnBlocks);

export const useOwnBlocks = (collectionPath) => {
  const blocks = useSyncExternalStore(subscribe, () => getOwnBlocks(collectionPath));

  useEffect(() => {
    if (collectionPath && !entries.has(collectionPath)) {
      loadOwnBlocks(collectionPath);
    }
    // A git pull can bring blocks other people saved.
    if (!watchesFocus) {
      watchesFocus = true;
      window.addEventListener('focus', reloadAll);
    }
  }, [collectionPath]);

  return blocks;
};

export const saveOwnBlock = async (collectionPath, block) => {
  await flowsApi.saveBlock(collectionPath, block);
  setBlocks(collectionPath, [...getOwnBlocks(collectionPath).filter((item) => item.id !== block.id), block]);
  return block;
};

export const deleteOwnBlock = async (collectionPath, blockId) => {
  await flowsApi.deleteBlock(collectionPath, blockId);
  setBlocks(collectionPath, getOwnBlocks(collectionPath).filter((item) => item.id !== blockId));
};

// Only for tests.
export const resetOwnBlocks = () => {
  entries.clear();
  emit();
};
