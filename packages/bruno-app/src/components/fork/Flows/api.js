// Thin wrapper over the fork:flows:* IPC channels (packages/bruno-electron/src/fork/flows-file.js).
const invoke = async (channel, ...args) => {
  if (!window.ipcRenderer) {
    throw Object.assign(new Error('Flows are only available in the desktop app'), { code: 'NO_IPC' });
  }
  try {
    return await window.ipcRenderer.invoke(channel, ...args);
  } catch (err) {
    // Electron prefixes errors from the main process; only the original text is useful on screen.
    throw new Error(err.message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, ''));
  }
};

export const flowsApi = {
  list: (collectionPath) => invoke('fork:flows:list', collectionPath),
  save: (collectionPath, flow) => invoke('fork:flows:save', collectionPath, flow),
  delete: (collectionPath, flowId) => invoke('fork:flows:delete', collectionPath, flowId),
  listBlocks: (collectionPath) => invoke('fork:flows:blocks:list', collectionPath),
  saveBlock: (collectionPath, block) => invoke('fork:flows:blocks:save', collectionPath, block),
  deleteBlock: (collectionPath, blockId) => invoke('fork:flows:blocks:delete', collectionPath, blockId)
};
