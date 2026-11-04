const fs = require('fs');
const path = require('path');
const { simpleGit } = require('simple-git');

// Git operations behind the fork's source control panel. Design rules:
// - never lose work: discarding and syncing park changes in named stashes instead of deleting them,
//   and commits left on a detached HEAD get a rescue branch before switching away;
// - always fetch before comparing with the remote;
// - stop at the first conflict and leave the repository in a state the panel can resolve or abort.
const STASH_PREFIX = 'michi:';
const TIMEOUT_MS = 120000;

class GitServiceError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

const git = (root) =>
  simpleGit({ baseDir: root, timeout: { block: TIMEOUT_MS } }).env({
    ...process.env,
    GIT_TERMINAL_PROMPT: '0',
    GIT_MERGE_AUTOEDIT: 'no'
  });

const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

const findRepoRoot = async (folder) => {
  if (typeof folder !== 'string' || !path.isAbsolute(folder) || !fs.existsSync(folder)) {
    return null;
  }
  try {
    const top = (await simpleGit({ baseDir: folder }).revparse(['--show-toplevel'])).trim();
    return top ? path.normalize(top) : null;
  } catch {
    return null;
  }
};

const gitDir = async (root) => path.resolve(root, (await git(root).revparse(['--git-dir'])).trim());

const operationInProgress = async (root) => {
  const dir = await gitDir(root);
  if (fs.existsSync(path.join(dir, 'MERGE_HEAD'))) return 'merge';
  if (fs.existsSync(path.join(dir, 'rebase-merge')) || fs.existsSync(path.join(dir, 'rebase-apply'))) return 'rebase';
  if (fs.existsSync(path.join(dir, 'CHERRY_PICK_HEAD'))) return 'cherry-pick';
  return null;
};

const assertInsideRoot = (root, files) => {
  if (!Array.isArray(files) || !files.length) {
    throw new GitServiceError('NO_FILES', 'No files selected');
  }
  for (const file of files) {
    const resolved = path.resolve(root, file);
    if (typeof file !== 'string' || !(resolved === root || resolved.startsWith(root + path.sep))) {
      throw new GitServiceError('OUTSIDE_REPO', `File outside the repository: ${file}`);
    }
  }
};

const fileState = (file) => {
  const { index, working_dir: work } = file;
  const pair = `${index}${work}`;
  if (['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU'].includes(pair)) return 'conflicted';
  if (pair === '??') return 'untracked';
  if (index === 'R' || work === 'R') return 'renamed';
  if (index === 'A') return 'added';
  if (index === 'D' || work === 'D') return 'deleted';
  return 'modified';
};

const listSavedChanges = async (root) => {
  const raw = await git(root).raw(['stash', 'list', '--format=%gd%x1f%gs%x1f%ci']);
  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [ref, subject, date] = line.split('\x1f');
      const message = subject.replace(/^(On|WIP on) [^:]+: /, '');
      return { ref, message, date };
    })
    .filter((entry) => entry.message.startsWith(STASH_PREFIX));
};

const defaultBranch = async (root) => {
  const g = git(root);
  try {
    const ref = (await g.raw(['symbolic-ref', '--quiet', 'refs/remotes/origin/HEAD'])).trim();
    if (ref) return ref.replace('refs/remotes/origin/', '');
  } catch {
    // origin/HEAD not set: fall back to common names.
  }
  const branches = await g.branchLocal();
  return ['main', 'master'].find((name) => branches.all.includes(name)) || branches.all[0] || 'main';
};

const getStatus = async (root, { fetch = false } = {}) => {
  const g = git(root);
  let fetchError = null;
  if (fetch) {
    try {
      await g.fetch(['--prune']);
    } catch (error) {
      fetchError = error.message.split('\n')[0];
    }
  }
  const status = await g.status();
  const operation = await operationInProgress(root);
  const savedChanges = await listSavedChanges(root);
  const conflicts = status.conflicted;
  return {
    root,
    branch: status.detached ? null : status.current,
    detached: status.detached,
    head: (await g.revparse(['--short', 'HEAD']).catch(() => '')).trim(),
    upstream: status.tracking || null,
    ahead: status.ahead,
    behind: status.behind,
    operation: operation || (conflicts.length ? 'stash' : null),
    conflicts,
    files: status.files.map((file) => ({ path: file.path, state: fileState(file) })),
    savedChanges,
    defaultBranch: await defaultBranch(root),
    fetchedAt: fetch && !fetchError ? Date.now() : null,
    fetchError
  };
};

const stash = async (root, label, paths = null) => {
  const args = ['stash', 'push', '--include-untracked', '-m', `${STASH_PREFIX} ${label} (${stamp()})`];
  if (paths) args.push('--', ...paths);
  await git(root).raw(args);
};

const conflictResult = async (root, operation, steps) => {
  const status = await git(root).status();
  if (status.conflicted.length) {
    return { result: 'conflicts', operation, conflicts: status.conflicted, steps };
  }
  return null;
};

const popLatestOwnStash = async (root, steps) => {
  let failure = null;
  try {
    await git(root).raw(['stash', 'pop']);
  } catch (error) {
    failure = error;
  }
  // `stash pop` can report conflicts without failing; the stash is kept by git in that case.
  const conflicts = await conflictResult(root, 'stash', steps);
  if (conflicts) return conflicts;
  if (failure) {
    // Nothing applied (e.g. an untracked file now exists upstream): the stash is kept, nothing is lost.
    return { result: 'saved-changes-kept', steps, message: failure.message.split('\n')[0] };
  }
  steps.push('restored-local-changes');
  return null;
};

const assertCleanOperation = async (root, status) => {
  const operation = await operationInProgress(root);
  if (operation || status.conflicted.length) {
    throw new GitServiceError('OPERATION_IN_PROGRESS', 'Resolve or cancel the pending conflicts first', { operation });
  }
  if (status.detached) {
    throw new GitServiceError('DETACHED_HEAD', 'Not on a branch. Return to a branch first.');
  }
};

const sync = async (root) => {
  const g = git(root);
  const steps = [];
  await assertCleanOperation(root, await g.status());

  await g.fetch(['--prune']);
  steps.push('fetched');
  let status = await g.status();

  if (!status.tracking) {
    const remoteBranches = await g.branch(['-r']);
    if (remoteBranches.all.includes(`origin/${status.current}`)) {
      await g.raw(['branch', '--set-upstream-to', `origin/${status.current}`]);
    } else {
      await g.push(['--set-upstream', 'origin', status.current]);
      steps.push('published-branch');
      return { result: 'ok', steps };
    }
    status = await g.status();
  }

  if (status.behind > 0) {
    let stashed = false;
    if (status.files.length) {
      await stash(root, 'local changes before sync');
      stashed = true;
      steps.push('saved-local-changes');
    }
    try {
      await g.merge(['--ff-only', '@{u}']);
      steps.push('fast-forwarded');
    } catch {
      try {
        await g.merge(['--no-edit', '@{u}']);
        steps.push('merged');
      } catch (error) {
        const conflicts = await conflictResult(root, 'merge', steps);
        if (conflicts) return { ...conflicts, stashed };
        throw error;
      }
    }
    if (stashed) {
      const outcome = await popLatestOwnStash(root, steps);
      if (outcome) return outcome;
    }
    status = await g.status();
  }

  if (status.ahead > 0) {
    await g.push();
    steps.push('pushed');
  }
  return { result: 'ok', steps };
};

const commit = async (root, files, message) => {
  assertInsideRoot(root, files);
  if (typeof message !== 'string' || !message.trim()) {
    throw new GitServiceError('NO_MESSAGE', 'Write a commit message');
  }
  const g = git(root);
  await g.raw(['add', '-A', '--', ...files]);
  await g.raw(['commit', '-m', message.trim(), '--', ...files]);
  return { result: 'ok' };
};

const discard = async (root, files) => {
  assertInsideRoot(root, files);
  await stash(root, `discarded ${files.length} file(s)`, files);
  return { result: 'ok' };
};

const returnToBranch = async (root, branchName) => {
  const g = git(root);
  const steps = [];
  const status = await g.status();
  if (!status.detached) return { result: 'ok', steps };
  if (await operationInProgress(root)) {
    throw new GitServiceError('OPERATION_IN_PROGRESS', 'Resolve or cancel the pending operation first');
  }

  const target = branchName || (await defaultBranch(root));
  const containing = (await g.raw(['branch', '--all', '--contains', 'HEAD']))
    .split('\n')
    .map((line) => line.replace(/^[*+]?\s+/, '').trim())
    .filter((line) => line && !line.startsWith('('));
  let rescueBranch = null;
  if (!containing.length) {
    rescueBranch = `rescued-${stamp().replace(/[: ]/g, '-')}`;
    await g.raw(['branch', rescueBranch, 'HEAD']);
    steps.push('created-rescue-branch');
  }

  let stashed = false;
  if (status.files.length) {
    await stash(root, 'changes from detached HEAD');
    stashed = true;
    steps.push('saved-local-changes');
  }
  await g.checkout(target);
  steps.push('checked-out');
  if (stashed) {
    const outcome = await popLatestOwnStash(root, steps);
    if (outcome) return { ...outcome, branch: target, rescueBranch };
  }
  return { result: 'ok', steps, branch: target, rescueBranch };
};

// "mine" is the local side: HEAD during a merge, the stashed changes when restoring them.
const resolveConflict = async (root, file, side) => {
  assertInsideRoot(root, [file]);
  const g = git(root);
  const operation = await operationInProgress(root);
  const useOurs = operation === 'merge' ? side === 'mine' : side !== 'mine';
  try {
    await g.raw(['checkout', useOurs ? '--ours' : '--theirs', '--', file]);
    await g.raw(['add', '--', file]);
  } catch {
    // The chosen side deleted the file.
    await g.raw(['rm', '--quiet', '--', file]);
  }
  return { result: 'ok' };
};

const markResolved = async (root, file) => {
  assertInsideRoot(root, [file]);
  const content = fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8') : '';
  if (/^(<{7}|>{7}) /m.test(content)) {
    throw new GitServiceError('MARKERS_LEFT', 'The file still has conflict markers (<<<<<<< / >>>>>>>)');
  }
  await git(root).raw(['add', '-A', '--', file]);
  return { result: 'ok' };
};

const abortOperation = async (root) => {
  const g = git(root);
  const operation = await operationInProgress(root);
  if (operation === 'merge') await g.raw(['merge', '--abort']);
  else if (operation === 'rebase') await g.raw(['rebase', '--abort']);
  else if (operation === 'cherry-pick') await g.raw(['cherry-pick', '--abort']);
  else await g.raw(['reset', '--merge']);
  return { result: 'ok', operation: operation || 'stash' };
};

const finishOperation = async (root) => {
  const g = git(root);
  const status = await g.status();
  if (status.conflicted.length) {
    throw new GitServiceError('CONFLICTS_LEFT', 'Some files still have conflicts', { conflicts: status.conflicted });
  }
  const operation = await operationInProgress(root);
  if (operation === 'merge') {
    await g.raw(['commit', '--no-edit']);
  } else if (operation === 'rebase') {
    await g.env({ ...process.env, GIT_EDITOR: 'true', GIT_TERMINAL_PROMPT: '0' }).raw(['rebase', '--continue']);
  } else {
    // Conflicts from restoring saved changes: keep them as plain working changes and drop the stash.
    await g.raw(['reset', '--quiet']);
    const [latest] = await listSavedChanges(root);
    if (latest && latest.ref === 'stash@{0}') await g.raw(['stash', 'drop', latest.ref]);
  }
  return { result: 'ok', operation: operation || 'stash' };
};

const restoreSavedChanges = async (root, ref) => {
  const saved = await listSavedChanges(root);
  if (!saved.some((entry) => entry.ref === ref)) {
    throw new GitServiceError('NOT_FOUND', 'Saved changes not found');
  }
  const g = git(root);
  const steps = [];
  let failure = null;
  try {
    await g.raw(['stash', 'apply', ref]);
  } catch (error) {
    failure = error;
  }
  const conflicts = await conflictResult(root, 'stash', steps);
  if (conflicts) return conflicts;
  if (failure) throw failure;
  await g.raw(['stash', 'drop', ref]);
  steps.push('restored-local-changes');
  return { result: 'ok', steps };
};

const dropSavedChanges = async (root, ref) => {
  const saved = await listSavedChanges(root);
  if (!saved.some((entry) => entry.ref === ref)) {
    throw new GitServiceError('NOT_FOUND', 'Saved changes not found');
  }
  await git(root).raw(['stash', 'drop', ref]);
  return { result: 'ok' };
};

// Unified diff of a whole new or deleted text, so every caller can parse the same format.
const wholeFileDiff = (content, sign) => {
  const lines = content.replace(/\r?\n$/, '').split(/\r?\n/);
  const range = sign === '+' ? `-0,0 +1,${lines.length}` : `-1,${lines.length} +0,0`;
  const body = lines.map((line) => `${sign}${line}`).join('\n');
  return `@@ ${range} @@\n${body}\n`;
};

const fileDiff = async (root, file) => {
  assertInsideRoot(root, [file]);
  const g = git(root);
  const tracked = (await g.raw(['ls-files', '--', file])).trim();
  if (!tracked) {
    return wholeFileDiff(fs.readFileSync(path.join(root, file), 'utf8'), '+');
  }
  return g.raw(['diff', '--no-color', 'HEAD', '--', file]);
};

// Remote version on the left, the user's version on the right, for a file in conflict.
const conflictDiff = async (root, file) => {
  assertInsideRoot(root, [file]);
  const g = git(root);
  const stages = {};
  for (const line of (await g.raw(['ls-files', '-u', '--', file])).split('\n').filter(Boolean)) {
    const [meta] = line.split('\t');
    const [, sha, stage] = meta.split(' ');
    stages[stage] = sha;
  }
  const operation = await operationInProgress(root);
  // During a merge "ours" (stage 2) is the local side; when restoring saved changes the stash is "theirs".
  const mine = operation === 'merge' ? stages['2'] : stages['3'];
  const remote = operation === 'merge' ? stages['3'] : stages['2'];
  const blob = (sha) => g.raw(['cat-file', '-p', sha]);

  let diff;
  if (mine && remote) diff = await g.raw(['diff', '--no-color', remote, mine]);
  else if (mine) diff = wholeFileDiff(await blob(mine), '+');
  else if (remote) diff = wholeFileDiff(await blob(remote), '-');
  else diff = '';
  return { diff, mineDeleted: !mine, remoteDeleted: !remote };
};

module.exports = {
  STASH_PREFIX,
  GitServiceError,
  findRepoRoot,
  getStatus,
  sync,
  commit,
  discard,
  returnToBranch,
  resolveConflict,
  markResolved,
  abortOperation,
  finishOperation,
  restoreSavedChanges,
  dropSavedChanges,
  fileDiff,
  conflictDiff
};
