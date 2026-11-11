import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  .flow-table-help { margin: 0; color: ${(props) => props.theme.colors.text.muted}; }
  .flow-table-count { margin: 0; font-weight: 600; }

  .flow-table-text {
    width: 100%;
    height: 180px;
    padding: 8px;
    box-sizing: border-box;
    resize: vertical;
    font-family: ${(props) => props.theme.font?.mono || 'monospace'};
    font-size: ${(props) => props.theme.font.size.sm};
    white-space: pre;
    tab-size: 16;
    color: ${(props) => props.theme.text};
    background: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.md};
    outline: none;

    &:focus { border-color: ${(props) => props.theme.input.focusBorder}; }
  }

  .flow-table-preview {
    max-height: 190px;
    overflow: auto;
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.md};

    table { width: 100%; border-collapse: collapse; font-size: ${(props) => props.theme.font.size.sm}; }
    th,
    td { padding: 4px 8px; text-align: left; white-space: nowrap; border-bottom: 1px solid ${(props) => props.theme.border.border0}; }
    th { font-weight: 600; background: ${(props) => props.theme.background.mantle}; }
  }
`;

export default StyledWrapper;
