import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IconGitBranch } from '@tabler/icons';
import SidebarSection from 'components/Sidebar/SidebarSection';
import GitPanel from './GitPanel';
import useGitStatus from './useGitStatus';
import { openGitView } from './selection';

export { default as GitTab } from './GitTab';
export { default as GitTabTitle } from './GitTabTitle';
export { GIT_TAB_TYPE } from './selection';

// Sidebar section with a git panel for the collection of the active tab (selectable when several are open).
const GitSection = () => {
  const dispatch = useDispatch();
  const collections = useSelector((state) => state.collections.collections);
  const activeCollectionUid = useSelector((state) => state.tabs.tabs.find((tab) => tab.uid === state.tabs.activeTabUid)?.collectionUid);
  const workspaces = useSelector((state) => state.workspaces.workspaces);
  // Each workspace has an internal scratch collection for unsaved requests; it is not a real collection.
  const openCollections = useMemo(() => {
    const scratchUids = new Set(workspaces.map((workspace) => workspace.scratchCollectionUid).filter(Boolean));
    return collections.filter((collection) => collection.pathname && !scratchUids.has(collection.uid));
  }, [collections, workspaces]);
  const [chosenUid, setChosenUid] = useState(null);

  useEffect(() => {
    if (activeCollectionUid) setChosenUid(activeCollectionUid);
  }, [activeCollectionUid]);

  const collection = openCollections.find((item) => item.uid === chosenUid) || openCollections[0];
  const { status, error, loading, refresh } = useGitStatus(collection?.pathname);

  const pending = status ? status.files.length : 0;

  return (
    <SidebarSection
      id="git"
      title={pending ? `Git (${pending})` : 'Git'}
      icon={IconGitBranch}
      className="git-section"
    >
      {openCollections.length > 1 && (
        <div style={{ padding: '0.25rem 0.625rem 0' }}>
          <select
            className="textbox collection-select"
            style={{ width: '100%' }}
            value={collection?.uid}
            onChange={(e) => setChosenUid(e.target.value)}
            aria-label="Collection"
          >
            {openCollections.map((item) => (
              <option key={item.uid} value={item.uid}>{item.name}</option>
            ))}
          </select>
        </div>
      )}
      {collection ? (
        <GitPanel
          folder={collection.pathname}
          status={status}
          error={error}
          loading={loading}
          refresh={refresh}
          onOpenFile={(file) => openGitView(dispatch, collection, { file })}
          onOpenView={() => openGitView(dispatch, collection)}
        />
      ) : (
        <p style={{ padding: '0.5rem 0.625rem' }}>Open a collection to see its git status.</p>
      )}
    </SidebarSection>
  );
};

export default GitSection;
