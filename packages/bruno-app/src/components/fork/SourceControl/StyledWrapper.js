import styled from 'styled-components';

const StyledWrapper = styled.div`
  padding: 0.25rem 0.625rem 0.75rem;
  font-size: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  .muted { color: ${(props) => props.theme.colors.text.muted}; margin: 0.25rem 0; }

  .collection-select { width: 100%; }

  .branch-row {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .branch {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-weight: 600;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .branch.detached { color: ${(props) => props.theme.status.danger.text}; }

  .counts {
    display: inline-flex;
    align-items: center;
    gap: 0.125rem;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .note { margin: 0; padding: 0.375rem 0.5rem; border-radius: 0.3rem; }
  .note.warning { background: ${(props) => props.theme.status.warning.background}; color: ${(props) => props.theme.status.warning.text}; }
  .note.danger { background: ${(props) => props.theme.status.danger.background}; color: ${(props) => props.theme.status.danger.text}; }

  .banner {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem;
    border-radius: 0.4rem;
    border: 1px solid;
    p { margin: 0.25rem 0 0.5rem; }
  }
  .banner.danger {
    background: ${(props) => props.theme.status.danger.background};
    border-color: ${(props) => props.theme.status.danger.border};
    color: ${(props) => props.theme.status.danger.text};
  }
  .banner.warning {
    background: ${(props) => props.theme.status.warning.background};
    border-color: ${(props) => props.theme.status.warning.border};
  }
  .banner svg { flex-shrink: 0; margin-top: 1px; }
  .grow { flex: 1; min-width: 0; }

  .conflict {
    padding: 0.25rem 0;
    border-top: 1px dashed ${(props) => props.theme.status.warning.border};
    .path { display: block; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  }
  .conflict-actions { display: flex; flex-wrap: wrap; gap: 0.125rem; }

  .row { display: flex; gap: 0.375rem; flex-wrap: wrap; }

  .section-title {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-weight: 600;
    margin-top: 0.25rem;
  }

  .files {
    list-style: none;
    margin: 0;
    padding: 0;
    li {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.125rem 0;
    }
    .path {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: monospace;
      text-align: left;
    }
    .link { background: none; border: none; padding: 0; cursor: pointer; color: inherit; }
    .link:hover { text-decoration: underline; }
    li.selected { background: ${(props) => props.theme.background.surface1}; border-radius: 0.25rem; }
  }

  .conflict .link { background: none; border: none; padding: 0; cursor: pointer; color: inherit; font-family: monospace; text-align: left; max-width: 100%; }
  .conflict .link:hover { text-decoration: underline; }
  .conflict.selected .link { font-weight: 700; }

  .state { font-family: monospace; font-weight: 700; width: 1rem; text-align: center; }
  .state-modified, .state-renamed { color: ${(props) => props.theme.status.warning.text}; }
  .state-added, .state-untracked { color: ${(props) => props.theme.status.success.text}; }
  .state-deleted { color: ${(props) => props.theme.status.danger.text}; }

  .commit-box {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    .textbox { width: 100%; padding: 0.25rem 0.5rem; }
  }
`;

export default StyledWrapper;
