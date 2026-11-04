// Thin wrapper over the fork:git:* IPC channels (packages/bruno-electron/src/fork/git/git-ipc.js).
const call = async (channel, folder, ...args) => {
  if (!window.ipcRenderer) {
    throw Object.assign(new Error('Git is only available in the desktop app'), { code: 'NO_IPC' });
  }
  const response = await window.ipcRenderer.invoke(channel, folder, ...args);
  if (!response?.ok) {
    throw Object.assign(new Error(response?.message || 'Git operation failed'), { code: response?.code, details: response?.details });
  }
  return response.data;
};

export const gitApi = {
  status: (folder, options) => call('fork:git:status', folder, options),
  sync: (folder) => call('fork:git:sync', folder),
  commit: (folder, files, message) => call('fork:git:commit', folder, files, message),
  discard: (folder, files) => call('fork:git:discard', folder, files),
  returnToBranch: (folder, branch) => call('fork:git:return-to-branch', folder, branch),
  resolve: (folder, file, side) => call('fork:git:resolve', folder, file, side),
  markResolved: (folder, file) => call('fork:git:mark-resolved', folder, file),
  abort: (folder) => call('fork:git:abort', folder),
  finish: (folder) => call('fork:git:finish', folder),
  restoreSaved: (folder, ref) => call('fork:git:restore-saved', folder, ref),
  dropSaved: (folder, ref) => call('fork:git:drop-saved', folder, ref),
  diff: (folder, file) => call('fork:git:diff', folder, file),
  conflictDiff: (folder, file) => call('fork:git:conflict-diff', folder, file),
  openFile: (folder, file) => call('fork:git:open-file', folder, file)
};
