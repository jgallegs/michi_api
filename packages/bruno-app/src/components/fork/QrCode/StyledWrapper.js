import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  .source,
  .text {
    width: 100%;
    padding: 0.35rem 0.5rem;
    font-size: 0.8rem;
    border-radius: 0.3rem;
    border: 1px solid ${(props) => props.theme.status.info.border};
    background: transparent;
    color: inherit;
  }

  .text {
    font-family: monospace;
    resize: vertical;
  }

  .hint {
    font-size: 0.7rem;
  }

  .result {
    display: flex;
    justify-content: center;
    min-height: 2rem;
  }

  .result img {
    width: 280px;
    max-width: 100%;
    image-rendering: pixelated;
    background: #fff;
  }

  .error-text {
    color: ${(props) => props.theme.status.danger.text};
    font-size: 0.75rem;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
  }
`;

export default StyledWrapper;
