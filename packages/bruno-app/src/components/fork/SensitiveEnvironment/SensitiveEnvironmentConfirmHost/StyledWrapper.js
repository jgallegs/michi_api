import styled from 'styled-components';

const StyledWrapper = styled.div`
  .warning {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .warning-icon {
    flex-shrink: 0;
    color: ${(props) => props.theme.status.danger.text};
  }

  .request {
    display: flex;
    gap: 0.5rem;
    align-items: baseline;
    margin-bottom: 1rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.3rem;
    border: 1px solid ${(props) => props.theme.status.danger.border};
    background: ${(props) => props.theme.status.danger.background};
    font-family: monospace;
    font-size: 0.75rem;
    word-break: break-all;
  }

  .method {
    font-weight: 600;
  }

  .snooze {
    margin-bottom: 1.25rem;
  }

  .actions {
    gap: 0.75rem;
  }
`;

export default StyledWrapper;
