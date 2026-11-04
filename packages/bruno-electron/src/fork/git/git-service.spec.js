const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const service = require('./git-service');

jest.setTimeout(60000);

const run = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const write = (dir, file, content) => fs.writeFileSync(path.join(dir, file), content);
const read = (dir, file) => fs.readFileSync(path.join(dir, file), 'utf8');

// A shared remote and two teammates' clones, like a collections repository used by a team.
const setupTeam = () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'git-service-'));
  const remote = path.join(base, 'remote.git');
  run(base, 'init', '--bare', '--initial-branch=main', remote);
  const clone = (name) => {
    const dir = path.join(base, name);
    run(base, 'clone', '--quiet', '--config', 'core.autocrlf=false', remote, dir);
    run(dir, 'config', 'user.name', name);
    run(dir, 'config', 'user.email', `${name}@example.test`);
    return dir;
  };
  const alice = clone('alice');
  write(alice, 'orders.bru', 'url: one\n');
  write(alice, 'users.bru', 'url: users\n');
  run(alice, 'add', '.');
  run(alice, 'commit', '--quiet', '-m', 'init');
  run(alice, 'push', '--quiet', '-u', 'origin', 'main');
  const bob = clone('bob');
  return { alice: fs.realpathSync(alice), bob: fs.realpathSync(bob) };
};

const commitAndPush = (dir, file, content, message) => {
  write(dir, file, content);
  run(dir, 'commit', '--quiet', '-am', message);
  run(dir, 'push', '--quiet');
};

describe('fork git service', () => {
  it('finds the repository root from a collection folder inside it', async () => {
    const { alice } = setupTeam();
    fs.mkdirSync(path.join(alice, 'collection'));
    expect(path.normalize(await service.findRepoRoot(path.join(alice, 'collection')))).toBe(path.normalize(alice));
    expect(await service.findRepoRoot(os.tmpdir())).toBeNull();
  });

  it('reports branch, upstream and changed files, fetching first', async () => {
    const { alice, bob } = setupTeam();
    commitAndPush(bob, 'orders.bru', 'url: bob\n', 'bob change');
    write(alice, 'users.bru', 'url: users2\n');
    write(alice, 'new.bru', 'url: new\n');

    const status = await service.getStatus(alice, { fetch: true });
    expect(status).toMatchObject({ branch: 'main', detached: false, upstream: 'origin/main', behind: 1, ahead: 0, operation: null });
    expect(status.files).toEqual(expect.arrayContaining([
      { path: 'users.bru', state: 'modified' },
      { path: 'new.bru', state: 'untracked' }
    ]));
  });

  it('syncs incoming commits without losing uncommitted local work', async () => {
    const { alice, bob } = setupTeam();
    commitAndPush(bob, 'orders.bru', 'url: bob\n', 'bob change');
    write(alice, 'users.bru', 'url: alice local\n');
    write(alice, 'scratch.bru', 'url: scratch\n');

    const outcome = await service.sync(alice);

    expect(outcome.result).toBe('ok');
    expect(read(alice, 'orders.bru')).toBe('url: bob\n');
    expect(read(alice, 'users.bru')).toBe('url: alice local\n');
    expect(read(alice, 'scratch.bru')).toBe('url: scratch\n');
    expect((await service.getStatus(alice)).savedChanges).toEqual([]);
  });

  it('pushes local commits and merges when both sides have new commits on different files', async () => {
    const { alice, bob } = setupTeam();
    commitAndPush(bob, 'orders.bru', 'url: bob\n', 'bob change');
    write(alice, 'users.bru', 'url: alice\n');
    await service.commit(alice, ['users.bru'], 'alice change');

    expect((await service.sync(alice)).result).toBe('ok');
    run(bob, 'pull', '--quiet');
    expect(read(bob, 'users.bru')).toBe('url: alice\n');
    expect((await service.getStatus(alice, { fetch: true })).ahead).toBe(0);
  });

  it('commits only the selected files', async () => {
    const { alice } = setupTeam();
    write(alice, 'orders.bru', 'url: picked\n');
    write(alice, 'users.bru', 'url: not picked\n');
    await service.commit(alice, ['orders.bru'], 'only orders');
    expect(run(alice, 'show', '--name-only', '--format=', 'HEAD')).toBe('orders.bru');
    expect((await service.getStatus(alice)).files).toEqual([{ path: 'users.bru', state: 'modified' }]);
  });

  it('stops on a merge conflict and lets the user keep their version, then pushes it', async () => {
    const { alice, bob } = setupTeam();
    commitAndPush(bob, 'orders.bru', 'url: bob\n', 'bob change');
    write(alice, 'orders.bru', 'url: alice\n');
    await service.commit(alice, ['orders.bru'], 'alice change');

    const outcome = await service.sync(alice);
    expect(outcome).toMatchObject({ result: 'conflicts', operation: 'merge', conflicts: ['orders.bru'] });
    expect((await service.getStatus(alice)).operation).toBe('merge');

    await service.resolveConflict(alice, 'orders.bru', 'mine');
    await service.finishOperation(alice);
    expect(read(alice, 'orders.bru')).toBe('url: alice\n');
    expect((await service.sync(alice)).result).toBe('ok');
    run(bob, 'pull', '--quiet');
    expect(read(bob, 'orders.bru')).toBe('url: alice\n');
  });

  it('can take the remote version in a merge conflict', async () => {
    const { alice, bob } = setupTeam();
    commitAndPush(bob, 'orders.bru', 'url: bob\n', 'bob change');
    write(alice, 'orders.bru', 'url: alice\n');
    await service.commit(alice, ['orders.bru'], 'alice change');
    await service.sync(alice);

    await service.resolveConflict(alice, 'orders.bru', 'theirs');
    await service.finishOperation(alice);
    expect(read(alice, 'orders.bru')).toBe('url: bob\n');
  });

  it('can cancel a merge and go back to the previous state', async () => {
    const { alice, bob } = setupTeam();
    commitAndPush(bob, 'orders.bru', 'url: bob\n', 'bob change');
    write(alice, 'orders.bru', 'url: alice\n');
    await service.commit(alice, ['orders.bru'], 'alice change');
    await service.sync(alice);

    await service.abortOperation(alice);
    const status = await service.getStatus(alice);
    expect(status.operation).toBeNull();
    expect(read(alice, 'orders.bru')).toBe('url: alice\n');
  });

  it('handles a clash between incoming commits and uncommitted changes, keeping the local version on request', async () => {
    const { alice, bob } = setupTeam();
    commitAndPush(bob, 'orders.bru', 'url: bob\n', 'bob change');
    write(alice, 'orders.bru', 'url: alice local\n');

    const outcome = await service.sync(alice);
    expect(outcome).toMatchObject({ result: 'conflicts', operation: 'stash', conflicts: ['orders.bru'] });

    await service.resolveConflict(alice, 'orders.bru', 'mine');
    await service.finishOperation(alice);
    const status = await service.getStatus(alice);
    expect(read(alice, 'orders.bru')).toBe('url: alice local\n');
    expect(status.operation).toBeNull();
    expect(status.files).toEqual([{ path: 'orders.bru', state: 'modified' }]);
    expect(status.savedChanges).toEqual([]);
    expect(run(alice, 'log', '-1', '--format=%s')).toBe('bob change');
  });

  it('refuses to finish while conflict markers remain', async () => {
    const { alice, bob } = setupTeam();
    commitAndPush(bob, 'orders.bru', 'url: bob\n', 'bob change');
    write(alice, 'orders.bru', 'url: alice\n');
    await service.commit(alice, ['orders.bru'], 'alice change');
    await service.sync(alice);

    await expect(service.markResolved(alice, 'orders.bru')).rejects.toMatchObject({ code: 'MARKERS_LEFT' });
    await expect(service.finishOperation(alice)).rejects.toMatchObject({ code: 'CONFLICTS_LEFT' });
    await expect(service.sync(alice)).rejects.toMatchObject({ code: 'OPERATION_IN_PROGRESS' });
  });

  it('returns from a detached HEAD, rescuing commits made there and keeping local changes', async () => {
    const { alice } = setupTeam();
    run(alice, 'checkout', '--quiet', '--detach');
    write(alice, 'orders.bru', 'url: detached commit\n');
    run(alice, 'commit', '--quiet', '-am', 'made while detached');
    write(alice, 'users.bru', 'url: uncommitted\n');

    await expect(service.sync(alice)).rejects.toMatchObject({ code: 'DETACHED_HEAD' });
    const outcome = await service.returnToBranch(alice);

    expect(outcome).toMatchObject({ result: 'ok', branch: 'main' });
    expect(outcome.rescueBranch).toMatch(/^rescued-/);
    expect(run(alice, 'log', '-1', '--format=%s', outcome.rescueBranch)).toBe('made while detached');
    const status = await service.getStatus(alice);
    expect(status).toMatchObject({ branch: 'main', detached: false });
    expect(read(alice, 'users.bru')).toBe('url: uncommitted\n');
  });

  it('discards into recoverable saved changes instead of deleting', async () => {
    const { alice } = setupTeam();
    write(alice, 'orders.bru', 'url: oops\n');
    write(alice, 'scratch.bru', 'url: scratch\n');

    await service.discard(alice, ['orders.bru', 'scratch.bru']);
    expect(read(alice, 'orders.bru')).toBe('url: one\n');
    expect(fs.existsSync(path.join(alice, 'scratch.bru'))).toBe(false);

    const [saved] = (await service.getStatus(alice)).savedChanges;
    expect(saved.message).toMatch(/^michi: discarded 2 file\(s\)/);
    await service.restoreSavedChanges(alice, saved.ref);
    expect(read(alice, 'orders.bru')).toBe('url: oops\n');
    expect(read(alice, 'scratch.bru')).toBe('url: scratch\n');
  });

  it('rejects paths outside the repository', async () => {
    const { alice } = setupTeam();
    await expect(service.discard(alice, ['../outside.bru'])).rejects.toMatchObject({ code: 'OUTSIDE_REPO' });
    await expect(service.commit(alice, [], 'x')).rejects.toMatchObject({ code: 'NO_FILES' });
  });

  it('shows the remote version against mine for a file in conflict', async () => {
    const { alice, bob } = setupTeam();
    commitAndPush(bob, 'orders.bru', 'url: bob\n', 'bob change');
    write(alice, 'orders.bru', 'url: alice\n');
    await service.commit(alice, ['orders.bru'], 'alice change');
    await service.sync(alice);

    const { diff, mineDeleted, remoteDeleted } = await service.conflictDiff(alice, 'orders.bru');
    expect(diff).toContain('-url: bob');
    expect(diff).toContain('+url: alice');
    expect(mineDeleted || remoteDeleted).toBe(false);
  });

  it('keeps the same orientation when restoring saved changes clashes', async () => {
    const { alice, bob } = setupTeam();
    commitAndPush(bob, 'orders.bru', 'url: bob\n', 'bob change');
    write(alice, 'orders.bru', 'url: alice local\n');
    await service.sync(alice);

    const { diff } = await service.conflictDiff(alice, 'orders.bru');
    expect(diff).toContain('-url: bob');
    expect(diff).toContain('+url: alice local');
  });

  it('returns a diff for tracked and untracked files', async () => {
    const { alice } = setupTeam();
    write(alice, 'orders.bru', 'url: two\n');
    write(alice, 'scratch.bru', 'url: scratch\n');
    expect(await service.fileDiff(alice, 'orders.bru')).toContain('+url: two');
    expect(await service.fileDiff(alice, 'scratch.bru')).toBe('@@ -0,0 +1,1 @@\n+url: scratch\n');
  });
});
