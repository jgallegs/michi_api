// The main process tells when the .michi.json of a collection changed on disk, whoever wrote it
// (packages/bruno-electron/src/fork/flows-watch.js). Outside the desktop app nothing is ever told.
const CHANGED_CHANNEL = 'main:fork-flows-changed';

export const onCollectionFileChange = (listener) => {
  if (typeof window.ipcRenderer?.on !== 'function') {
    return () => {};
  }
  return window.ipcRenderer.on(CHANGED_CHANNEL, (change) => {
    if (typeof change?.collectionPath === 'string') {
      listener(change.collectionPath);
    }
  });
};
