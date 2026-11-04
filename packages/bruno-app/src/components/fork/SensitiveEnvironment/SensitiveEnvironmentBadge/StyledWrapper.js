import styled, { keyframes } from 'styled-components';
import { transparentize } from 'polished';

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 var(--sensitive-glow); }
  50% { box-shadow: 0 0 0 3px transparent; }
`;

const danger = (props) => props.theme.status.danger.text;
const isDark = (props) => props.theme.mode === 'dark';

const StyledWrapper = styled.div`
  --sensitive-glow: ${(props) => transparentize(0.6, danger(props))};

  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  height: 24px;
  margin-right: 0.5rem;
  padding: 0 0.625rem 0 0.1875rem;
  border-radius: 999px;
  border: 1px solid ${(props) => transparentize(isDark(props) ? 0.55 : 0.7, danger(props))};
  background: linear-gradient(
    100deg,
    ${(props) => transparentize(isDark(props) ? 0.72 : 0.84, danger(props))} 0%,
    ${(props) => transparentize(isDark(props) ? 0.9 : 0.97, danger(props))} 100%
  );
  box-shadow: 0 2px 8px ${(props) => transparentize(0.82, danger(props))};
  white-space: nowrap;
  cursor: default;
  user-select: none;

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    color: #fff;
    background: ${danger};
    box-shadow: 0 1px 3px ${(props) => transparentize(0.5, danger(props))}, 0 0 0 2px ${(props) => (isDark(props) ? 'rgba(255, 255, 255, 0.12)' : '#fff')};
    animation: ${glow} 2.4s ease-in-out infinite;
  }

  .text {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: ${(props) => (isDark(props) ? transparentize(0.05, '#ffb4ab') : danger(props))};
  }

  @media (prefers-reduced-motion: reduce) {
    .icon {
      animation: none;
    }
  }
`;

export default StyledWrapper;
