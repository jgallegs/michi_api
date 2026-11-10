// Thin wrapper over the fork:flows:* IPC channels (packages/bruno-electron/src/fork/flows-file.js).
const invoke = (channel, ...args) => {
  if (!window.ipcRenderer) {
    return Promise.reject(Object.assign(new Error('Flows are only available in the desktop app'), { code: 'NO_IPC' }));
  }
  return window.ipcRenderer.invoke(channel, ...args);
};

export const flowsApi = {
  list: (collectionPath) => invoke('fork:flows:list', collectionPath),
  save: (collectionPath, flow) => invoke('fork:flows:save', collectionPath, flow),
  delete: (collectionPath, flowId) => invoke('fork:flows:delete', collectionPath, flowId)
};
