import React, { useMemo, useState, useSyncExternalStore } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { IconHistory } from '@tabler/icons';
import Modal from 'components/Modal';
import Button from 'ui/Button';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { findCollectionByPathname, findItemInCollectionByPathname, getDefaultRequestPaneTab } from 'utils/collections';
import { FORK_SETTINGS, useForkSetting } from 'components/fork/settings/store';
import { clearHistory, getHistory, subscribeToHistory } from './store';
import StyledWrapper from './StyledWrapper';

const formatTime = (at) => new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(at);

const formatSize = (size) => {
  if (typeof size !== 'number') {
    return '';
  }
  return size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`;
};

const statusClass = (entry) => {
  if (entry.isError || typeof entry.status !== 'number') {
    return 'status error';
  }
  return entry.status >= 400 ? 'status error' : 'status ok';
};

export const matchesFilter = (entry, filter) => {
  const words = filter.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return true;
  }
  const haystack = [entry.method, entry.url, entry.environment, entry.status, entry.request?.name, entry.collection?.name]
    .filter((value) => value !== null && value !== undefined)
    .join(' ')
    .toLowerCase();
  return words.every((word) => haystack.includes(word));
};

const HistoryEntry = ({ entry, onOpen }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <li className="entry">
      <button type="button" className="summary" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
        <span className="time">{formatTime(entry.at)}</span>
        <span className={entry.environment ? 'env fork-no-translate' : 'env'}>{entry.environment || 'No environment'}</span>
        <span className="method">{entry.method}</span>
        <span className="name fork-no-translate">{entry.request?.name || entry.url}</span>
        <span className={statusClass(entry)}>{entry.isError ? 'Error' : entry.status}</span>
        <span className="duration">{typeof entry.duration === 'number' ? `${entry.duration} ms` : ''}</span>
      </button>
      {expanded ? (
        <div className="details">
          <div className="url">{`${entry.method} ${entry.url}`}</div>
          <div className="muted">
            {[entry.collection?.name, entry.statusText, formatSize(entry.size)].filter(Boolean).join(' · ')}
          </div>
          {entry.error ? <div className="error-text">{entry.error}</div> : null}
          {entry.excerpt ? <pre className="excerpt">{entry.excerpt}</pre> : null}
          {entry.request?.pathname ? (
            <Button size="sm" variant="ghost" onClick={() => onOpen(entry)}>
              Open request
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
};

const RequestHistoryModal = ({ onClose }) => {
  const dispatch = useDispatch();
  const collections = useSelector((state) => state.collections.collections);
  const entries = useSyncExternalStore(subscribeToHistory, getHistory);
  const [filter, setFilter] = useState('');
  const visible = useMemo(() => entries.filter((entry) => matchesFilter(entry, filter)), [entries, filter]);

  const openRequest = (entry) => {
    const collection = findCollectionByPathname(collections, entry.collection?.pathname);
    const item = collection && findItemInCollectionByPathname(collection, entry.request.pathname);
    if (!item) {
      toast.error('That request is no longer open in a collection');
      return;
    }
    dispatch(addTab({ uid: item.uid, collectionUid: collection.uid, requestPaneTab: getDefaultRequestPaneTab(item) }));
    onClose();
  };

  return (
    <Modal size="xl" title="Request history" hideFooter={true} handleCancel={onClose} closeModalFadeTimeout={0}>
      <StyledWrapper>
        <div className="toolbar">
          <input
            className="filter"
            placeholder="Filter by request, URL, environment or status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            autoFocus
            data-testid="request-history-filter"
          />
          <Button size="sm" variant="ghost" onClick={clearHistory} disabled={!entries.length}>
            Clear history
          </Button>
        </div>
        <div className="muted hint">
          Stored on this machine only. Request headers are not kept; credentials in URLs and bodies are masked.
        </div>
        {visible.length ? (
          <ul className="entries" data-testid="request-history-list">
            {visible.map((entry) => (
              <HistoryEntry key={entry.id} entry={entry} onOpen={openRequest} />
            ))}
          </ul>
        ) : (
          <div className="muted empty">{entries.length ? 'Nothing matches the filter.' : 'No requests sent yet.'}</div>
        )}
      </StyledWrapper>
    </Modal>
  );
};

// Status bar button. Hidden when the history is turned off.
const RequestHistoryButton = () => {
  const enabled = useForkSetting(FORK_SETTINGS.REQUEST_HISTORY);
  const [open, setOpen] = useState(false);
  if (!enabled) {
    return null;
  }
  return (
    <>
      <button
        className="status-bar-button"
        data-trigger="request-history"
        onClick={() => setOpen(true)}
        tabIndex={0}
        aria-label="Open request history"
      >
        <div className="console-button-content">
          <IconHistory size={16} strokeWidth={1.5} aria-hidden="true" />
          <span className="console-label">History</span>
        </div>
      </button>
      {open ? <RequestHistoryModal onClose={() => setOpen(false)} /> : null}
    </>
  );
};

export default RequestHistoryButton;
