import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-right: 8px;

  button {
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid transparent;
    color: inherit;
    opacity: 0.75;
  }

  button:hover {
    opacity: 1;
  }

  button.active {
    opacity: 1;
    font-weight: 600;
    border-color: ${(props) => props.theme.status.info.border};
    background: ${(props) => props.theme.status.info.background};
  }
`;

export default StyledWrapper;
