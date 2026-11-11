import styled from 'styled-components';

const StyledWrapper = styled.div`
  .bar {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.75rem;
    font-size: 0.75rem;
    color: ${(props) => props.theme.status.info.text};
    background: ${(props) => props.theme.status.info.background};
    border-bottom: 1px solid ${(props) => props.theme.status.info.border};
  }

  .link {
    font-weight: 600;
    text-decoration: underline;
  }

  .bar-session {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    margin-left: auto;
  }

  .barcode-columns {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.75rem;
    font-size: 0.8125rem;
  }

  .barcode-columns button {
    padding: 0.1rem 0.55rem;
    border: 1px solid ${(props) => props.theme.status.info.border};
    border-radius: 999px;
    font-family: monospace;
    font-size: 0.75rem;
    opacity: 0.75;
  }

  .barcode-columns button[aria-pressed='true'] {
    opacity: 1;
    font-weight: 600;
    color: ${(props) => props.theme.status.info.text};
    background: ${(props) => props.theme.status.info.background};
  }

  .barcode-actions {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin-left: auto;
  }

  .barcode-caption {
    margin: 1.75rem 0 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid ${(props) => props.theme.status.info.border};
    font-size: 0.8125rem;
    font-weight: 600;
  }

  .barcode-caption:first-child {
    margin-top: 0;
    padding-top: 0;
    border-top: 0;
  }

  .barcode-caption + .barcode {
    margin-top: 0;
  }

  .barcode-empty {
    padding: 2rem 0;
    text-align: center;
    font-size: 0.8125rem;
    opacity: 0.7;
  }

  .barcode-tools {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    font-size: 0.8125rem;
  }

  .barcode-views {
    display: inline-flex;
    border: 1px solid ${(props) => props.theme.status.info.border};
    border-radius: 4px;
    overflow: hidden;
  }

  .barcode-views button {
    padding: 0.2rem 0.6rem;
  }

  .barcode-views button[aria-pressed='true'] {
    font-weight: 600;
    color: ${(props) => props.theme.status.info.text};
    background: ${(props) => props.theme.status.info.background};
  }

  .barcode-step {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }

  .barcode-step button {
    display: inline-flex;
    padding: 0.15rem;
    border-radius: 4px;
  }

  .barcode-step button:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .barcode-count {
    min-width: 3.5rem;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .barcode-list {
    max-height: 62vh;
    overflow: auto;
  }

  .barcode + .barcode {
    margin-top: 2.25rem;
  }

  .barcode-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .field {
    font-weight: 600;
  }

  .position {
    font-size: 0.75rem;
    opacity: 0.8;
  }

  .path {
    flex: 1;
    font-family: monospace;
    font-size: 0.75rem;
    opacity: 0.7;
    word-break: break-all;
  }

  /* White whatever the theme, with room around the bars: a reader pointed at the screen needs both. */
  .barcode-body {
    display: flex;
    justify-content: center;
    padding: 1rem;
    background: #fff;
    border-radius: 4px;
    overflow-x: auto;
  }

  .barcode-image {
    max-width: 100%;
    height: auto;
    flex-shrink: 0;
  }

  .barcode-undrawable {
    font-size: 0.75rem;
    color: #333;
  }
`;

export default StyledWrapper;
