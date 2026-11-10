import styled from 'styled-components';

const StyledWrapper = styled.div`
  padding: 0.25rem 0.375rem 0.75rem;
  font-size: 0.75rem;

  .muted { color: ${(props) => props.theme.colors.text.muted}; margin: 0.25rem; }
  .error { color: ${(props) => props.theme.status.danger.text}; margin: 0.25rem; }

  .flow-folder {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    width: 100%;
    padding: 0.25rem;
    font-weight: 600;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
  }

  .flow-row {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem;
    border-radius: 0.25rem;
    cursor: pointer;

    &.nested { padding-left: 1.25rem; }

    &:hover { background: ${(props) => props.theme.sidebar.collection.item.hoverBg}; }

    .flow-name {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .flow-actions { display: none; gap: 0.125rem; }
    &:hover .flow-actions { display: inline-flex; }
  }
`;

export default StyledWrapper;
