import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;

  .flow-report-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .flow-report-titles { flex: 1; min-width: 0; }
  .flow-report-title { font-size: ${(props) => props.theme.font.size.md}; font-weight: 600; }
  .flow-report-subtitle { color: ${(props) => props.theme.colors.text.muted}; font-size: ${(props) => props.theme.font.size.sm}; }

  .flow-report-action {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 28px;
    padding: 0 10px;
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.md};
    background: ${(props) => props.theme.background.base};
    color: ${(props) => props.theme.text};
    font: inherit;
    font-size: ${(props) => props.theme.font.size.sm};
    white-space: nowrap;
    cursor: pointer;

    &:hover { background: ${(props) => props.theme.background.crust}; }
  }

  .flow-report-scroll {
    max-height: 62vh;
    overflow: auto;
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.md};
  }

  .flow-report-table {
    width: 100%;
    border-collapse: collapse;
    font-size: ${(props) => props.theme.font.size.sm};
    user-select: text;

    th,
    td {
      padding: 6px 10px;
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid ${(props) => props.theme.border.border0};
      border-right: 1px solid ${(props) => props.theme.border.border0};
      white-space: nowrap;
    }
    th {
      position: sticky;
      top: 0;
      z-index: 1;
      font-weight: 600;
      background: ${(props) => props.theme.background.mantle};
      border-bottom: 1px solid ${(props) => props.theme.border.border1};
    }
    td.number { color: ${(props) => props.theme.colors.text.muted}; font-variant-numeric: tabular-nums; }
    /* Each item starts with a stronger line, so its rows read as one block. */
    tr.first td { border-top: 1px solid ${(props) => props.theme.border.border2}; }
    th:last-child,
    td:last-child { border-right: none; }
  }

  .flow-report-empty {
    padding: 28px 0;
    text-align: center;
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;
