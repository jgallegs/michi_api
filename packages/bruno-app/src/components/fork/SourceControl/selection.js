import { useSyncExternalStore } from 'react';
import { addTab } from 'providers/ReduxStore/slices/tabs';

// File shown in the Git tab for each repository folder, shared by the sidebar panel and the tab.
const selected = new Map();
const listeners = new Set();

export const GIT_TAB_TYPE = 'fork-git';

export const selectGitFile = (folder, selection) => {
  selected.set(folder, selection);
  listeners.forEach((listener) => listener());
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useSelectedGitFile = (folder) => useSyncExternalStore(subscribe, () => selected.get(folder) || null);

export const openGitView = (dispatch, collection, selection) => {
  if (selection) {
    selectGitFile(collection.pathname, selection);
  }
  dispatch(addTab({ uid: `${collection.uid}-${GIT_TAB_TYPE}`, collectionUid: collection.uid, type: GIT_TAB_TYPE }));
};
