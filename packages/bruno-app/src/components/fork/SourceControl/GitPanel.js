import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { IconAlertTriangle, IconArrowDown, IconArrowUp, IconGitBranch, IconGitMerge, IconRefresh } from '@tabler/icons';
import Button from 'ui/Button';
import ActionIcon from 'ui/ActionIcon';
import Checkbox from 'ui/Checkbox';
import Modal from 'components/Modal';
import { gitApi } from './api';
import DiffModal from './DiffModal';
import StyledWrapper from './StyledWrapper';

const STATE_LETTER = { modified: 'M', added: 'A', deleted: 'D', untracked: 'U', renamed: 'R', conflicted: '!' };

const OPERATION_TEXT = {
  'merge': 'Incoming changes clash with your commits.',
  'stash': 'What arrived clashes with your uncommitted changes.',
  'rebase': 'A rebase is in progress.',
  'cherry-pick': 'A cherry-pick is in progress.'
};

const describeSync = (outcome) => {
  const { steps = [] } = outcome;
  if (steps.includes('published-branch')) return 'Branch published to the remote';
  const parts = [];
  if (steps.includes('fast-forwarded') || steps.includes('merged')) parts.push('pulled changes');
  if (steps.includes('pushed')) parts.push('pushed your commits');
  return parts.length ? `Synced: ${parts.join(' and ')}` : 'Already up to date';
};

const ConfirmModal = ({ title, children, confirmText, onConfirm, onCancel }) => (
  <Modal size="sm" title={title} confirmText={confirmText} handleConfirm={onConfirm} handleCancel={onCancel} confirmButtonColor="danger">
    {children}
  </Modal>
);

const GitPanel = ({ folder, status, error, loading, refresh }) => {
  const [busy, setBusy] = useState(null);
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState('');
  const [diff, setDiff] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const changes = useMemo(() => (status?.files || []).filter((file) => file.state !== 'conflicted'), [status]);
  const selectedChanges = selected.filter((file) => changes.some((change) => change.path === file));

  const run = async (label, action, { onDone, quiet } = {}) => {
    setBusy(label);
    try {
      const result = await action();
      if (onDone) onDone(result);
      else if (!quiet) toast.success('Done');
      return result;
    } catch (err) {
      toast.error(err.message);
      return null;
    } finally {
      setBusy(null);
      refresh();
    }
  };

  const handleSync = () =>
    run('sync', () => gitApi.sync(folder), {
      onDone: (outcome) => {
        if (outcome.result === 'conflicts') toast.error('Conflicts to resolve: see the Git panel');
        else if (outcome.result === 'saved-changes-kept') toast('Your uncommitted changes were kept in "Saved changes"', { icon: '!' });
        else toast.success(describeSync(outcome));
      }
    });

  const handleCommit = () =>
    run('commit', () => gitApi.commit(folder, selectedChanges, message), {
      onDone: () => {
        toast.success('Committed. Press Sync to share it.');
        setMessage('');
        setSelected([]);
      }
    });

  const toggle = (file) => setSelected((list) => (list.includes(file) ? list.filter((item) => item !== file) : [...list, file]));
  const allSelected = changes.length > 0 && selectedChanges.length === changes.length;

  const openDiff = async (file) => {
    try {
      setDiff({ file, text: await gitApi.diff(folder, file) });
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (error?.code === 'NOT_A_REPO') {
    return <StyledWrapper><p className="muted">This collection is not inside a git repository.</p></StyledWrapper>;
  }
  if (error) {
    return <StyledWrapper><p className="note danger">{error.message}</p></StyledWrapper>;
  }
  if (!status) {
    return <StyledWrapper><p className="muted">{loading ? 'Reading git status...' : 'No status yet.'}</p></StyledWrapper>;
  }

  const inOperation = Boolean(status.operation);
  const remainingConflicts = status.conflicts.length;

  return (
    <StyledWrapper data-testid="git-panel">
      <div className="branch-row">
        <span className={`branch ${status.detached ? 'detached' : ''}`} title={status.upstream || 'No upstream'}>
          <IconGitBranch size={14} strokeWidth={1.75} />
          {status.detached ? `detached at ${status.head}` : status.branch}
        </span>
        <span className="counts" title="Commits to push / to pull">
          <IconArrowUp size={12} />{status.ahead}
          <IconArrowDown size={12} />{status.behind}
        </span>
        <ActionIcon label="Fetch from the remote" aria-label="Fetch from the remote" onClick={() => refresh({ fetch: true })} disabled={loading}>
          <IconRefresh size={14} strokeWidth={1.5} />
        </ActionIcon>
        <Button size="xs" onClick={handleSync} disabled={Boolean(busy) || inOperation || status.detached} data-testid="git-sync">
          {busy === 'sync' ? 'Syncing...' : 'Sync'}
        </Button>
      </div>

      {status.fetchError && <p className="note warning">Could not reach the remote: {status.fetchError}</p>}

      {status.detached && (
        <div className="banner danger" data-testid="git-detached">
          <IconAlertTriangle size={16} />
          <div>
            <strong>You are not on a branch (detached HEAD).</strong>
            <p>Changes made here cannot be pushed. Your uncommitted changes are kept, and commits made here are saved in a rescue branch.</p>
            <Button
              size="xs"
              color="danger"
              disabled={Boolean(busy)}
              onClick={() =>
                run('return', () => gitApi.returnToBranch(folder), {
                  onDone: (outcome) => toast.success(outcome.rescueBranch
                    ? `Back on ${outcome.branch}. Commits made while detached are in branch ${outcome.rescueBranch}`
                    : `Back on ${outcome.branch}`)
                })}
            >
              Return to {status.defaultBranch}
            </Button>
          </div>
        </div>
      )}

      {inOperation && (
        <div className="banner warning" data-testid="git-conflicts">
          <IconGitMerge size={16} />
          <div className="grow">
            <strong>{remainingConflicts ? `${remainingConflicts} file(s) in conflict` : 'All conflicts resolved'}</strong>
            <p>{OPERATION_TEXT[status.operation]}</p>
            {status.conflicts.map((file) => (
              <div key={file} className="conflict">
                <span className="path" title={file}>{file}</span>
                <div className="conflict-actions">
                  <Button size="xs" variant="ghost" onClick={() => run('resolve', () => gitApi.resolve(folder, file, 'mine'), { quiet: true })}>Keep mine</Button>
                  <Button size="xs" variant="ghost" onClick={() => run('resolve', () => gitApi.resolve(folder, file, 'theirs'), { quiet: true })}>Take remote</Button>
                  <Button size="xs" variant="ghost" onClick={() => gitApi.openFile(folder, file).catch((err) => toast.error(err.message))}>Edit</Button>
                  <Button size="xs" variant="ghost" onClick={() => run('resolve', () => gitApi.markResolved(folder, file), { quiet: true })}>Mark resolved</Button>
                </div>
              </div>
            ))}
            <div className="row">
              <Button
                size="xs"
                disabled={Boolean(busy) || remainingConflicts > 0}
                onClick={() =>
                  run('finish', () => gitApi.finish(folder), { onDone: () => toast.success('Finished. Press Sync to share it.') })}
              >
                Finish
              </Button>
              <Button size="xs" variant="ghost" color="danger" disabled={Boolean(busy)} onClick={() => setConfirm('abort')}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="section-title">
        <Checkbox
          checked={allSelected}
          indeterminate={selectedChanges.length > 0 && !allSelected}
          onChange={() => setSelected(allSelected ? [] : changes.map((file) => file.path))}
          ariaLabel="Select all changes"
        />
        <span>Changes ({changes.length})</span>
      </div>
      {changes.length === 0 && <p className="muted">No local changes.</p>}
      <ul className="files">
        {changes.map((file) => (
          <li key={file.path}>
            <Checkbox checked={selected.includes(file.path)} onChange={() => toggle(file.path)} ariaLabel={`Select ${file.path}`} />
            <button type="button" className="path link" title={`${file.path} (view changes)`} onClick={() => openDiff(file.path)}>
              {file.path}
            </button>
            <span className={`state state-${file.state}`}>{STATE_LETTER[file.state]}</span>
          </li>
        ))}
      </ul>

      {changes.length > 0 && (
        <div className="commit-box">
          <input
            className="textbox"
            placeholder="Commit message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={inOperation}
            data-testid="git-commit-message"
          />
          <div className="row">
            <Button size="xs" disabled={Boolean(busy) || inOperation || !selectedChanges.length || !message.trim()} onClick={handleCommit} data-testid="git-commit">
              Commit {selectedChanges.length || ''}
            </Button>
            <Button size="xs" variant="ghost" color="danger" disabled={Boolean(busy) || inOperation || !selectedChanges.length} onClick={() => setConfirm('discard')}>
              Discard
            </Button>
          </div>
        </div>
      )}

      {status.savedChanges.length > 0 && (
        <>
          <div className="section-title"><span>Saved changes ({status.savedChanges.length})</span></div>
          <ul className="files saved">
            {status.savedChanges.map((entry) => (
              <li key={entry.ref}>
                <span className="path" title={`${entry.message} - ${entry.date}`}>{entry.message.replace(/^michi:\s*/, '')}</span>
                <Button
                  size="xs"
                  variant="ghost"
                  disabled={Boolean(busy) || inOperation}
                  onClick={() =>
                    run('restore', () => gitApi.restoreSaved(folder, entry.ref), {
                      onDone: (outcome) => (outcome.result === 'conflicts' ? toast.error('Conflicts to resolve') : toast.success('Changes restored'))
                    })}
                >
                  Restore
                </Button>
                <Button size="xs" variant="ghost" color="danger" disabled={Boolean(busy)} onClick={() => setConfirm({ drop: entry })}>
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}

      {diff && <DiffModal file={diff.file} text={diff.text} onClose={() => setDiff(null)} />}

      {confirm === 'discard' && (
        <ConfirmModal
          title="Discard changes"
          confirmText="Discard"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null);
            run('discard', () => gitApi.discard(folder, selectedChanges), {
              onDone: () => {
                toast.success('Discarded. You can bring them back from "Saved changes".');
                setSelected([]);
              }
            });
          }}
        >
          <p>{selectedChanges.length} file(s) go back to their last committed version. Your changes are kept in “Saved changes”, so you can restore them.</p>
        </ConfirmModal>
      )}
      {confirm === 'abort' && (
        <ConfirmModal
          title="Cancel conflict resolution"
          confirmText="Cancel resolution"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null);
            run('abort', () => gitApi.abort(folder), { onDone: () => toast.success('Back to the state before the conflict') });
          }}
        >
          <p>Goes back to how things were before the conflict. Your uncommitted changes stay in “Saved changes”.</p>
        </ConfirmModal>
      )}
      {confirm?.drop && (
        <ConfirmModal
          title="Delete saved changes"
          confirmText="Delete"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const { ref } = confirm.drop;
            setConfirm(null);
            run('drop', () => gitApi.dropSaved(folder, ref), { quiet: true });
          }}
        >
          <p>“{confirm.drop.message.replace(/^michi:\s*/, '')}” will be deleted for good.</p>
        </ConfirmModal>
      )}
    </StyledWrapper>
  );
};

export default GitPanel;
