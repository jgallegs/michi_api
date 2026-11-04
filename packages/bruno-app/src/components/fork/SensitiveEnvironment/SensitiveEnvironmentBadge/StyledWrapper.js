import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-right: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.3rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  white-space: nowrap;
  cursor: default;
  color: #fff;
  background: ${(props) => props.theme.status.danger.text};
`;

export default StyledWrapper;
