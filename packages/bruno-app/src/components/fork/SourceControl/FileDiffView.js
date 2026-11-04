import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Button from 'ui/Button';
import { gitApi } from './api';
import SideBySideDiff from './SideBySideDiff';

// Right side of the Git tab: the selected change, or both versions of a file in conflict.
const FileDiffView = ({ folder, selection, status, refresh }) => {
  const [content, setContent] = useState({ loading: true });
  const file = selection?.file;
  const isConflict = Boolean(file && status?.conflicts.includes(file));
  const fileState = status?.files.find((entry) => entry.path === file)?.state;
  const statusKey = JSON.stringify(status?.files || []);

  useEffect(() => {
    let cancelled = false;
    if (!file) {
      setContent({ loading: false });
      return undefined;
    }
    setContent({ loading: true });
    const load = isConflict ? gitApi.conflictDiff(folder, file) : gitApi.diff(folder, file).then((diff) => ({ diff }));
    load
      .then((result) => !cancelled && setContent({ loading: false, ...result }))
      .catch((err) => !cancelled && setContent({ loading: false, error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [folder, file, isConflict, statusKey]);

  if (!file) {
    return <p className="placeholder">Select a file on the left to see its changes.</p>;
  }

  const act = (action) =>
    action()
      .catch((err) => toast.error(err.message))
      .finally(() => refresh());

  return (
    <div className="file-view" data-testid="git-file-view">
      <div className="file-header">
        <div>
          <div className="file-name">{file.split('/').pop()}</div>
          <div className="file-path">{file}</div>
        </div>
        {isConflict && (
          <div className="file-actions" data-testid="git-file-conflict-actions">
            <Button size="sm" variant="ghost" onClick={() => act(() => gitApi.resolve(folder, file, 'theirs'))}>Take remote (left)</Button>
            <Button size="sm" onClick={() => act(() => gitApi.resolve(folder, file, 'mine'))}>Keep mine (right)</Button>
            <Button size="sm" variant="ghost" onClick={() => act(() => gitApi.openFile(folder, file))}>Edit</Button>
            <Button size="sm" variant="ghost" onClick={() => act(() => gitApi.markResolved(folder, file))}>Mark resolved</Button>
          </div>
        )}
      </div>

      {isConflict && <p className="hint">Left: what arrived from the remote. Right: your version. Pick one, or edit the file and mark it resolved.</p>}
      {content.mineDeleted && <p className="hint">Your side deleted this file.</p>}
      {content.remoteDeleted && <p className="hint">The remote side deleted this file.</p>}

      {content.loading && <p className="placeholder">Loading...</p>}
      {content.error && <p className="placeholder">{content.error}</p>}
      {!content.loading && !content.error && (
        <SideBySideDiff
          diff={content.diff}
          leftLabel={isConflict ? 'Remote' : fileState === 'untracked' ? 'New file' : 'Last commit'}
          rightLabel={isConflict ? 'Yours' : 'Your version'}
        />
      )}
    </div>
  );
};

export default FileDiffView;
