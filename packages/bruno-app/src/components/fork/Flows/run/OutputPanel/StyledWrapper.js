import styled from 'styled-components';

const StyledWrapper = styled.aside`
  display: flex;
  flex-direction: column;
  flex: 0 0 340px;
  min-height: 0;
  font-size: ${(props) => props.theme.font.size.sm};
  color: ${(props) => props.theme.text};
  background: ${(props) => props.theme.background.base};
  border-left: 1px solid ${(props) => props.theme.border.border1};

  &.closed { flex-basis: auto; }

  .output-header {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 36px;
    padding: 0 6px 0 12px;
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
  }
  .output-title { flex: 1; font-weight: 600; }

  .output-action,
  .output-open {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 26px;
    padding: 0 8px;
    border: none;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;

    &:hover:not(:disabled) { background: ${(props) => props.theme.background.crust}; }
    &:disabled { opacity: 0.4; cursor: default; }
  }
  .output-open {
    flex-direction: column;
    height: auto;
    padding: 10px 6px;
    writing-mode: vertical-rl;
  }

  .output-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 6px 0 12px;
    user-select: text;
  }
  .output-empty { padding: 8px 12px; color: ${(props) => props.theme.colors.text.muted}; }

  .output-run {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-top: 8px;
    padding: 6px 12px 4px;
    border-top: 1px solid ${(props) => props.theme.border.border1};
    color: ${(props) => props.theme.colors.text.muted};
  }
  .output-run:first-child { margin-top: 0; border-top: none; }
  .output-run-name { font-weight: 600; color: ${(props) => props.theme.text}; }
  .output-time { margin-left: auto; font-size: ${(props) => props.theme.font.size.xs}; }
  .output-report {
    display: inline-flex;
    align-self: center;
    padding: 2px;
    border: none;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: none;
    color: inherit;
    cursor: pointer;

    &:hover { color: ${(props) => props.theme.text}; background: ${(props) => props.theme.background.crust}; }
  }

  .output-line {
    display: flex;
    align-items: baseline;
    gap: 6px;
    padding: 2px 12px 2px 4px;
  }
  .output-unfold {
    flex: 0 0 16px;
    display: inline-flex;
    justify-content: center;
    align-self: center;
    padding: 0;
    border: none;
    background: none;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
  }
  .output-label {
    flex-shrink: 0;
    max-width: 45%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
  }
  .output-parts {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .tone-ok .output-parts { color: ${(props) => props.theme.status.success.text}; }
  .tone-bad .output-parts { color: ${(props) => props.theme.status.danger.text}; }
  .tone-warning .output-parts { color: ${(props) => props.theme.status.warning.text}; }
  .kind-end .output-parts { font-weight: 600; }

  .output-detail {
    margin: 2px 12px 6px 26px;
    padding: 6px 8px;
    max-height: 260px;
    overflow: auto;
    font-family: ${(props) => props.theme.font?.codeFont || 'monospace'};
    font-size: ${(props) => props.theme.font.size.xs};
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    background: ${(props) => props.theme.background.mantle};
    border-radius: ${(props) => props.theme.border.radius.sm};
  }
`;

export default StyledWrapper;
