import styled from 'styled-components';

const StyledWrapper = styled.div`
  .toolbar {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 0.4rem;
  }

  .filter {
    flex: 1;
    padding: 0.3rem 0.5rem;
    font-size: 0.8rem;
    border-radius: 0.3rem;
    border: 1px solid ${(props) => props.theme.status.info.border};
    background: transparent;
    color: inherit;
  }

  .hint {
    font-size: 0.7rem;
    margin-bottom: 0.6rem;
  }

  .entries {
    max-height: 60vh;
    overflow: auto;
  }

  .entry + .entry {
    border-top: 1px solid ${(props) => props.theme.status.info.background};
  }

  .summary {
    width: 100%;
    display: grid;
    grid-template-columns: 9.5rem 6rem 4rem 1fr 3.5rem 4.5rem;
    gap: 0.5rem;
    align-items: baseline;
    padding: 0.35rem 0.25rem;
    font-size: 0.75rem;
    text-align: left;
  }

  .summary > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .method {
    font-weight: 600;
  }

  .status.ok {
    color: ${(props) => props.theme.status.success.text};
  }

  .status.error,
  .error-text {
    color: ${(props) => props.theme.status.danger.text};
  }

  .duration {
    text-align: right;
    opacity: 0.7;
  }

  .details {
    padding: 0 0.25rem 0.6rem;
    font-size: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    align-items: flex-start;
  }

  .url,
  .excerpt {
    font-family: monospace;
    word-break: break-all;
    white-space: pre-wrap;
  }

  .excerpt {
    align-self: stretch;
    max-height: 12rem;
    overflow: auto;
    padding: 0.4rem;
    border-radius: 0.3rem;
    background: ${(props) => props.theme.status.info.background};
  }

  .empty {
    padding: 1rem 0;
    text-align: center;
  }
`;

export default StyledWrapper;
