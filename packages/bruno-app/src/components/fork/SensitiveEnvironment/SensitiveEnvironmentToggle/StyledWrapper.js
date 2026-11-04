import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.125rem 0.5rem;
  border-radius: 0.3rem;
  border: 1px solid transparent;
  user-select: none;

  .label {
    font-size: 0.75rem;
    color: ${(props) => props.theme.colors.text.muted};
  }

  &.is-sensitive {
    background: ${(props) => props.theme.status.danger.background};
    border-color: ${(props) => props.theme.status.danger.border};

    .label {
      color: ${(props) => props.theme.status.danger.text};
      font-weight: 600;
    }
  }
`;

export default StyledWrapper;
