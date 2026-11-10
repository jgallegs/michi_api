import styled from 'styled-components';
import { HEADER_HEIGHT, ROW_HEIGHT } from '../canvas/pieces';

const StyledWrapper = styled.div`
  --flow-order: ${(props) => props.theme.primary.solid};
  --flow-value: ${(props) => props.theme.request.methods.options};
  --flow-port-empty: ${(props) => props.theme.background.base};

  position: relative;
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  outline: none;
  user-select: none;
  font-size: ${(props) => props.theme.font.size.sm};
  background-color: ${(props) => props.theme.background.mantle};
  background-image: radial-gradient(${(props) => props.theme.border.border2} 1px, transparent 1px);

  .flow-world {
    position: absolute;
    left: 0;
    top: 0;
    transform-origin: 0 0;
  }

  .flow-cables {
    position: absolute;
    left: 0;
    top: 0;
    overflow: visible;
    pointer-events: none;
  }

  .flow-cable-line {
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
  }
  .flow-cable.order .flow-cable-line { stroke: var(--flow-order); }
  .flow-cable.value .flow-cable-line { stroke: var(--flow-value); stroke-width: 1.5; stroke-dasharray: 5 4; }
  .flow-cable.selected .flow-cable-line { stroke-width: 3.5; }
  .flow-cable.draft .flow-cable-line { opacity: 0.7; }
  .flow-cable-grab {
    fill: none;
    stroke: transparent;
    stroke-width: 14;
    pointer-events: stroke;
    cursor: pointer;
  }

  .flow-zone {
    position: absolute;
    border: 1.5px dashed ${(props) => props.theme.border.border3};
    border-radius: ${(props) => props.theme.border.radius.lg};
    background: ${(props) => props.theme.background.crust};
    opacity: 0.85;
    pointer-events: none;
  }
  .flow-zone-label {
    position: absolute;
    left: 12px;
    top: 5px;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: ${(props) => props.theme.font.size.xs};
  }

  .flow-piece {
    position: absolute;
    box-sizing: border-box;
    color: ${(props) => props.theme.text};
    background: ${(props) => props.theme.background.base};
    border: 1px solid ${(props) => props.theme.border.border2};
    border-radius: ${(props) => props.theme.border.radius.md};
    box-shadow: ${(props) => props.theme.shadow.sm};
    cursor: grab;

    &.selected {
      border-color: var(--flow-order);
      box-shadow: 0 0 0 2px var(--flow-order);
    }
    &.dimmed { opacity: 0.55; }
    &.has-issue { border-color: ${(props) => props.theme.status.warning.border}; }
  }

  .flow-piece-header {
    display: flex;
    align-items: center;
    gap: 6px;
    height: ${HEADER_HEIGHT}px;
    padding: 0 14px;
    font-weight: 600;
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.md} ${(props) => props.theme.border.radius.md} 0 0;
    background: ${(props) => props.theme.background.crust};
  }
  .flow-piece.type-start .flow-piece-header,
  .flow-piece.type-stop .flow-piece-header { border-bottom: none; }
  .flow-piece.type-start .flow-piece-header { border-radius: ${(props) => props.theme.border.radius.md}; }
  .flow-piece-icon { flex-shrink: 0; color: var(--flow-order); }
  .flow-piece-title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .flow-issue { display: inline-flex; color: ${(props) => props.theme.status.warning.text}; }
  .flow-issue-text {
    position: absolute;
    left: 0;
    right: 0;
    top: calc(100% + 3px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.status.warning.text};
    pointer-events: none;
  }

  .flow-row {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    height: ${ROW_HEIGHT}px;
    padding: 0 14px;
    box-sizing: border-box;
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
  }
  .flow-row-out { justify-content: flex-end; }
  .flow-section,
  .flow-row-action { cursor: pointer; color: ${(props) => props.theme.colors.text.muted}; }
  .flow-section:hover,
  .flow-row-action:hover { color: ${(props) => props.theme.text}; }
  .flow-count { margin-left: auto; font-size: ${(props) => props.theme.font.size.xs}; }
  .flow-label {
    flex-shrink: 0;
    max-width: 55%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: ${(props) => props.theme.colors.text.muted};
  }
  .flow-row-out .flow-label { max-width: 100%; }

  .flow-input,
  .flow-select,
  .flow-request-choice {
    flex: 1;
    min-width: 0;
    height: 22px;
    padding: 0 6px;
    box-sizing: border-box;
    font: inherit;
    color: inherit;
    background: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    outline: none;
  }
  .flow-input { user-select: text; }
  .flow-input:focus,
  .flow-select:focus { border-color: ${(props) => props.theme.input.focusBorder}; }
  .flow-input.flow-key { flex: 0 0 38%; }
  .flow-request-choice {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    text-align: left;

    &.unset { border-style: dashed; color: ${(props) => props.theme.colors.text.muted}; }
  }
  .flow-request-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .flow-method,
  .flow-picker-badge {
    flex-shrink: 0;
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 600;
    color: ${(props) => props.theme.colors.text.muted};

    &.method-get { color: ${(props) => props.theme.request.methods.get}; }
    &.method-post { color: ${(props) => props.theme.request.methods.post}; }
    &.method-put { color: ${(props) => props.theme.request.methods.put}; }
    &.method-patch { color: ${(props) => props.theme.request.methods.patch}; }
    &.method-delete { color: ${(props) => props.theme.request.methods.delete}; }
    &.method-gql { color: ${(props) => props.theme.request.gql}; }
  }

  .flow-chip {
    display: inline-flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    height: 22px;
    padding: 0 2px 0 8px;
    box-sizing: border-box;
    border-radius: 11px;
    color: var(--flow-value);
    border: 1px solid var(--flow-value);
    background: ${(props) => props.theme.background.base};
  }
  .flow-chip-text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .flow-icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    padding: 0;
    border: none;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: none;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;

    &:hover { color: ${(props) => props.theme.text}; background: ${(props) => props.theme.background.crust}; }
  }

  .flow-port {
    position: absolute;
    display: inline-flex;
    width: 14px;
    height: 14px;
    cursor: crosshair;
    transition: transform 0.08s ease-out;

    &.left { left: -7px; }
    &.right { right: -7px; }
    &.order { color: var(--flow-order); }
    &.value,
    &.list { color: var(--flow-value); }
    &:hover,
    &.snap { transform: scale(1.5); }
    &.valid { transform: scale(1.25); }
    &.faded { opacity: 0.25; }
  }
  &.connecting .flow-piece { cursor: crosshair; }

  .flow-hint {
    position: absolute;
    width: 260px;
    color: ${(props) => props.theme.colors.text.muted};
    line-height: 1.4;
    pointer-events: none;
  }

  .flow-selection-box {
    position: absolute;
    border: 1px solid var(--flow-order);
    background: ${(props) => props.theme.status.info.background};
    pointer-events: none;
  }

  .flow-toolbar {
    position: absolute;
    left: 12px;
    right: 12px;
    top: 10px;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px;
    color: ${(props) => props.theme.text};
    background: ${(props) => props.theme.background.base};
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.md};
    box-shadow: ${(props) => props.theme.shadow.sm};
  }
  .flow-tool {
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
  .flow-tool-separator { width: 1px; height: 16px; background: ${(props) => props.theme.border.border1}; }
  .flow-tool-spacer { flex: 1; }
  .flow-tool-message { color: ${(props) => props.theme.status.warning.text}; }
  .flow-tool-unsaved { color: ${(props) => props.theme.colors.text.muted}; padding: 0 4px; }

  .flow-picker {
    position: absolute;
    z-index: 5;
    display: flex;
    flex-direction: column;
    width: 260px;
    max-height: 320px;
    padding: 6px;
    color: ${(props) => props.theme.dropdown.color};
    background: ${(props) => props.theme.dropdown.bg};
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.md};
    box-shadow: ${(props) => props.theme.shadow.md};
    cursor: default;
  }
  .flow-picker-title { padding: 2px 4px 6px; font-weight: 600; }
  .flow-picker-search {
    height: 26px;
    padding: 0 8px;
    font: inherit;
    color: inherit;
    background: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    outline: none;
    user-select: text;
  }
  .flow-picker-list { margin-top: 6px; overflow-y: auto; }
  .flow-picker-group,
  .flow-picker-empty {
    padding: 6px 6px 2px;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.dropdown.mutedText};
  }
  .flow-picker-option {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    height: 26px;
    padding: 0 6px;
    border: none;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;

    &.active { background: ${(props) => props.theme.dropdown.hoverBg}; }
  }
  .flow-picker-label { flex-shrink: 0; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .flow-picker-hint {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: right;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.dropdown.mutedText};
  }
`;

export default StyledWrapper;
