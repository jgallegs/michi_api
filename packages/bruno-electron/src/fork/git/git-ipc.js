const { ipcMain, shell } = require('electron');
const path = require('path');
const service = require('./git-service');

// Every handler takes a folder opened in the app (a collection), resolves its repository root and
// returns { ok, data } or { ok: false, code, message } so the renderer gets readable errors.
const handle = (channel, fn) => {
  ipcMain.handle(channel, async (_event, folder, ...args) => {
    try {
      const root = await service.findRepoRoot(folder);
      if (!root) {
        return { ok: false, code: 'NOT_A_REPO', message: 'This collection is not inside a git repository' };
      }
      return { ok: true, data: await fn(root, ...args) };
    } catch (error) {
      return { ok: false, code: error.code || 'GIT_ERROR', message: error.message, details: error.details };
    }
  });
};

const register = () => {
  handle('fork:git:status', (root, options) => service.getStatus(root, options));
  handle('fork:git:sync', (root) => service.sync(root));
  handle('fork:git:commit', (root, files, message) => service.commit(root, files, message));
  handle('fork:git:discard', (root, files) => service.discard(root, files));
  handle('fork:git:return-to-branch', (root, branch) => service.returnToBranch(root, branch));
  handle('fork:git:resolve', (root, file, side) => service.resolveConflict(root, file, side));
  handle('fork:git:mark-resolved', (root, file) => service.markResolved(root, file));
  handle('fork:git:abort', (root) => service.abortOperation(root));
  handle('fork:git:finish', (root) => service.finishOperation(root));
  handle('fork:git:restore-saved', (root, ref) => service.restoreSavedChanges(root, ref));
  handle('fork:git:drop-saved', (root, ref) => service.dropSavedChanges(root, ref));
  handle('fork:git:diff', (root, file) => service.fileDiff(root, file));
  handle('fork:git:conflict-diff', (root, file) => service.conflictDiff(root, file));
  handle('fork:git:open-file', async (root, file) => {
    const target = path.resolve(root, file);
    if (!target.startsWith(root + path.sep)) {
      throw new service.GitServiceError('OUTSIDE_REPO', 'File outside the repository');
    }
    const error = await shell.openPath(target);
    if (error) throw new Error(error);
    return true;
  });
};

module.exports = { register };
