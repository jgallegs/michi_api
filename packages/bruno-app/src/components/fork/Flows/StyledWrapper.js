import styled from 'styled-components';

const StyledWrapper = styled.div`
  padding: 0.25rem 0.375rem 0.75rem;
  font-size: 0.75rem;

  .muted { color: ${(props) => props.theme.colors.text.muted}; margin: 0.25rem; }
  .error { color: ${(props) => props.theme.status.danger.text}; margin: 0.25rem; }

  .flow-search {
    width: 100%;
    height: 1.5rem;
    margin: 0 0 0.25rem;
    padding: 0 0.375rem;
    box-sizing: border-box;
    font: inherit;
    color: inherit;
    background: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: 0.25rem;
    outline: none;

    &:focus { border-color: ${(props) => props.theme.input.focusBorder}; }
  }

  .flow-run-mark {
    flex-shrink: 0;
    width: 0.4375rem;
    height: 0.4375rem;
    border-radius: 50%;

    &.ok { background: ${(props) => props.theme.status.success.text}; }
    &.bad { background: ${(props) => props.theme.status.danger.text}; }
    &.warning { background: ${(props) => props.theme.status.warning.text}; }
    &.running { background: ${(props) => props.theme.primary.solid}; animation: flow-run-mark 0.9s ease-in-out infinite alternate; }
  }
  @keyframes flow-run-mark {
    from { opacity: 1; }
    to { opacity: 0.3; }
  }

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
