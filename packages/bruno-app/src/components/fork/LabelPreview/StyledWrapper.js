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
    margin-left: auto;
    font-weight: 600;
    text-decoration: underline;
  }

  .label + .label {
    margin-top: 1.25rem;
  }

  .label-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .kind {
    font-weight: 600;
  }

  .path {
    flex: 1;
    font-family: monospace;
    font-size: 0.75rem;
    opacity: 0.7;
    word-break: break-all;
  }

  .label-body {
    max-height: 60vh;
    overflow: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .label-body img {
    max-width: 100%;
  }

  .note {
    align-self: stretch;
    font-size: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .zpl {
    align-self: stretch;
    font-family: monospace;
    font-size: 0.75rem;
    white-space: pre-wrap;
    word-break: break-all;
  }
`;

export default StyledWrapper;
