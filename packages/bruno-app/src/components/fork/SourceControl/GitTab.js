import React, { useEffect } from 'react';
import styled from 'styled-components';
import { IconGitBranch } from '@tabler/icons';
import GitPanel from './GitPanel';
import FileDiffView from './FileDiffView';
import useGitStatus from './useGitStatus';
import { selectGitFile, useSelectedGitFile } from './selection';

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 340px) 1fr;
  height: 100%;
  min-height: 0;

  aside {
    border-right: 1px solid ${(props) => props.theme.border.border1};
    overflow: auto;
    padding-top: 0.5rem;
  }

  aside .title {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0 0.625rem 0.25rem;
    font-weight: 600;
  }

  main {
    overflow: auto;
    padding: 1rem 1.25rem;
    min-width: 0;
  }

  .placeholder, .hint { color: ${(props) => props.theme.colors.text.muted}; font-size: 0.8125rem; }
  .hint { margin: 0 0 0.75rem; }
  .file-header { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; margin-bottom: 0.75rem; flex-wrap: wrap; }
  .file-name { font-weight: 600; font-size: 0.875rem; }
  .file-path { color: ${(props) => props.theme.colors.text.muted}; font-size: 0.75rem; font-family: monospace; }
  .file-actions { display: flex; gap: 0.375rem; flex-wrap: wrap; }
`;

// Full-size Git view opened as a tab: the panel on the left, the selected file side by side on the right.
const GitTab = ({ collection }) => {
  const folder = collection?.pathname;
  const { status, error, loading, refresh } = useGitStatus(folder);
  const selection = useSelectedGitFile(folder);

  // Show something useful by default: the first conflict, otherwise the first change.
  useEffect(() => {
    if (!status || !folder) return;
    const paths = status.files.map((file) => file.path);
    if (selection && paths.includes(selection.file)) return;
    const next = status.conflicts[0] || paths[0];
    if (next) selectGitFile(folder, { file: next });
  }, [status, folder, selection]);

  if (!collection) {
    return <p style={{ padding: '1rem' }}>Collection not found.</p>;
  }

  return (
    <Layout data-testid="git-tab">
      <aside>
        <div className="title">
          <IconGitBranch size={16} strokeWidth={1.5} />
          <span>{collection.name}</span>
        </div>
        <GitPanel
          folder={folder}
          status={status}
          error={error}
          loading={loading}
          refresh={refresh}
          selectedFile={selection?.file}
          onOpenFile={(file) => selectGitFile(folder, { file })}
        />
      </aside>
      <main>
        <FileDiffView folder={folder} selection={selection} status={status} refresh={refresh} />
      </main>
    </Layout>
  );
};

export default GitTab;
