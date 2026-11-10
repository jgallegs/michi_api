import React from 'react';
import { useDispatch } from 'react-redux';
import { IconGitBranch } from '@tabler/icons';
import SidebarSection from 'components/Sidebar/SidebarSection';
import CollectionPicker, { useChosenCollection } from 'components/fork/CollectionPicker';
import GitPanel from './GitPanel';
import useGitStatus from './useGitStatus';
import { openGitView } from './selection';

export { default as GitTab } from './GitTab';
export { default as GitTabTitle } from './GitTabTitle';
export { GIT_TAB_TYPE } from './selection';

// Sidebar section with a git panel for the collection of the active tab (selectable when several are open).
const GitSection = () => {
  const dispatch = useDispatch();
  const { openCollections, collection, setChosenUid } = useChosenCollection();
  const { status, error, loading, refresh } = useGitStatus(collection?.pathname);

  const pending = status ? status.files.length : 0;

  return (
    <SidebarSection
      id="git"
      title={pending ? `Git (${pending})` : 'Git'}
      icon={IconGitBranch}
      className="git-section"
    >
      <CollectionPicker openCollections={openCollections} collection={collection} onChange={setChosenUid} />
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
