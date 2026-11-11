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
  /* Nothing here ever scrolls: focusing a box near the edge must not drag the canvas along. */
  overflow: hidden;
  overflow: clip;
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
  .flow-cable-rim {
    fill: none;
    stroke: ${(props) => props.theme.background.mantle};
    stroke-width: 6;
    stroke-linecap: round;
  }
  .flow-cable.tone-good { --flow-order: ${(props) => props.theme.status.success.text}; }
  .flow-cable.tone-bad { --flow-order: ${(props) => props.theme.status.danger.text}; }
  .flow-cable { transition: opacity 0.12s ease-out; }
  .flow-cable.dim { opacity: 0.18; }
  .flow-cable.order .flow-cable-line { stroke: var(--flow-order); }
  .flow-cable.value .flow-cable-line { stroke: var(--flow-value); stroke-width: 1.5; stroke-dasharray: 5 4; }
  .flow-cable.lit .flow-cable-line,
  .flow-cable:hover .flow-cable-line { stroke-width: 3; }
  .flow-cable.selected .flow-cable-line { stroke-width: 3.5; }
  .flow-cable.draft .flow-cable-line { opacity: 0.7; }
  .flow-cable-pulse {
    fill: none;
    stroke-width: 5;
    stroke-linecap: round;
    stroke-dasharray: 10 110;
    stroke-dashoffset: 10;
    animation: flow-pulse 0.45s linear forwards;
  }
  .flow-cable.order .flow-cable-pulse { stroke: var(--flow-order); }
  .flow-cable.value .flow-cable-pulse { stroke: var(--flow-value); }
  @keyframes flow-pulse {
    to { stroke-dashoffset: -100; }
  }
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
    &.run-running {
      border-color: var(--flow-order);
      animation: flow-working 0.9s ease-in-out infinite alternate;
    }
    &.run-done { border-color: ${(props) => props.theme.status.success.border}; }
    &.run-failed {
      border-color: ${(props) => props.theme.status.danger.border};
      box-shadow: 0 0 0 2px ${(props) => props.theme.status.danger.border};
    }
    &.run-waiting {
      border-color: ${(props) => props.theme.status.warning.border};
      box-shadow: 0 0 0 2px ${(props) => props.theme.status.warning.border};
    }
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
  @keyframes flow-working {
    from { box-shadow: 0 0 0 2px var(--flow-order); }
    to { box-shadow: 0 0 0 5px var(--flow-order); }
  }
  .flow-tag {
    flex-shrink: 0;
    padding: 1px 6px;
    border-radius: 9px;
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 600;
    color: ${(props) => props.theme.colors.text.muted};
    background: ${(props) => props.theme.background.base};
    border: 1px solid ${(props) => props.theme.border.border2};

    &.tone-ok { color: ${(props) => props.theme.status.success.text}; border-color: ${(props) => props.theme.status.success.border}; }
    &.tone-bad { color: ${(props) => props.theme.status.danger.text}; border-color: ${(props) => props.theme.status.danger.border}; }
  }
  .flow-continue {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    padding: 0;
    border: none;
    border-radius: 50%;
    color: ${(props) => props.theme.background.base};
    background: var(--flow-order);
    cursor: pointer;
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

  .flow-position {
    flex-shrink: 0;
    height: 18px;
    padding: 0 6px;
    border-radius: 9px;
    font: inherit;
    font-size: ${(props) => props.theme.font.size.xs};
    line-height: 16px;
    white-space: nowrap;
    color: var(--flow-value);
    border: 1px solid var(--flow-value);
    background: ${(props) => props.theme.background.base};
    cursor: pointer;

    &:hover { background: ${(props) => props.theme.background.crust}; }
  }

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
    &.order.tone-good { color: ${(props) => props.theme.status.success.text}; }
    &.order.tone-bad { color: ${(props) => props.theme.status.danger.text}; }
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
    overflow: hidden;
  }
  .flow-tool {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    gap: 5px;
    height: 26px;
    padding: 0 8px;
    white-space: nowrap;
    border: none;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;

    &:hover:not(:disabled) { background: ${(props) => props.theme.background.crust}; }
    &:disabled { opacity: 0.4; cursor: default; }
  }
  .flow-tool.run { color: ${(props) => props.theme.background.base}; background: var(--flow-order); }
  .flow-tool.run:hover:not(:disabled) { background: ${(props) => props.theme.primary.strong}; }
  .flow-tool.stop { color: ${(props) => props.theme.status.danger.text}; }
  .flow-environment {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    max-width: 160px;
    height: 22px;
    margin: 0 4px;
    padding: 0 8px;
    overflow: hidden;
    white-space: nowrap;
    border-radius: 11px;
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 600;
    color: ${(props) => props.theme.status.success.text};
    background: ${(props) => props.theme.status.success.background};

    &.sensitive { color: ${(props) => props.theme.status.danger.text}; background: ${(props) => props.theme.status.danger.background}; }
  }
  .flow-tool-separator { flex-shrink: 0; width: 1px; height: 16px; background: ${(props) => props.theme.border.border1}; }
  .flow-tool-spacer { flex: 1; }
  .flow-tool-message,
  .flow-tool-unsaved {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .flow-tool-message { color: ${(props) => props.theme.status.warning.text}; }
  .flow-tool-unsaved { color: ${(props) => props.theme.colors.text.muted}; padding: 0 4px; }
  /* With little room the buttons keep their icon and lose their words, the least needed first. */
  &.compact .flow-toolbar .flow-tool.secondary > span { display: none; }
  &.tight .flow-toolbar .flow-tool:not(.run):not(.stop):not(.wordy) > span,
  &.tight .flow-tool-unsaved { display: none; }

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
  .flow-menu {
    position: absolute;
    z-index: 6;
    display: flex;
    flex-direction: column;
    min-width: 190px;
    padding: 4px;
    color: ${(props) => props.theme.dropdown.color};
    background: ${(props) => props.theme.dropdown.bg};
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.md};
    box-shadow: ${(props) => props.theme.shadow.md};
    cursor: default;
  }
  .flow-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border: none;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: none;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;

    &:hover { background: ${(props) => props.theme.dropdown.hoverBg}; }
    svg { flex-shrink: 0; color: ${(props) => props.theme.dropdown.mutedText}; }
  }

  .flow-picker-title { padding: 2px 4px 6px; font-weight: 600; }
  .flow-picker-tabs { display: flex; gap: 2px; margin-bottom: 6px; border-bottom: 1px solid ${(props) => props.theme.dropdown.separator}; }
  .flow-picker-tab {
    padding: 4px 10px;
    border: none;
    border-bottom: 2px solid transparent;
    background: none;
    font: inherit;
    color: ${(props) => props.theme.dropdown.mutedText};
    cursor: pointer;

    &:hover { color: ${(props) => props.theme.dropdown.color}; }
    &.active { color: ${(props) => props.theme.dropdown.color}; border-bottom-color: var(--flow-order); font-weight: 600; }
  }
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

  .flow-gallery,
  .flow-guide,
  .flow-help {
    position: absolute;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    color: ${(props) => props.theme.text};
    background: ${(props) => props.theme.background.base};
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.md};
    box-shadow: ${(props) => props.theme.shadow.md};
    cursor: default;
  }

  .flow-gallery {
    z-index: 6;
    left: 50%;
    top: 56px;
    width: min(780px, calc(100% - 32px));
    max-height: calc(100% - 72px);
    transform: translateX(-50%);
  }
  .flow-gallery-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 18px 6px;
  }
  .flow-gallery-title { font-size: ${(props) => props.theme.font.size.lg}; font-weight: 600; }
  .flow-gallery-subtitle { margin-top: 2px; color: ${(props) => props.theme.colors.text.muted}; }
  .flow-gallery-body { padding: 0 18px 14px; overflow-y: auto; }
  .flow-gallery-group {
    margin: 14px 0 6px;
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${(props) => props.theme.colors.text.muted};
  }
  .flow-gallery-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(225px, 1fr)); gap: 8px; }
  .flow-gallery-note { max-width: 520px; line-height: 1.45; color: ${(props) => props.theme.colors.text.muted}; }
  .flow-gallery-footer {
    display: flex;
    justify-content: flex-end;
    padding: 8px 14px;
    border-top: 1px solid ${(props) => props.theme.border.border1};
  }

  .flow-block-card,
  .flow-block-pick {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    min-width: 0;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .flow-block-card {
    padding: 10px 12px;
    background: ${(props) => props.theme.background.mantle};
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.md};

    &:hover { border-color: var(--flow-order); background: ${(props) => props.theme.background.crust}; }
    &.own { flex-direction: row; align-items: center; gap: 6px; cursor: default; }
  }
  .flow-block-pick { flex: 1; padding: 0; border: none; background: none; }
  .flow-block-summary { display: inline-flex; gap: 4px; color: var(--flow-order); }
  .flow-block-title { max-width: 100%; font-weight: 600; line-height: 1.3; overflow-wrap: anywhere; }
  .flow-block-description { line-height: 1.35; font-size: ${(props) => props.theme.font.size.xs}; color: ${(props) => props.theme.colors.text.muted}; }
  .flow-block-delete {
    flex-shrink: 0;
    height: 22px;
    padding: 0 8px;
    border: 1px solid ${(props) => props.theme.status.danger.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: ${(props) => props.theme.status.danger.background};
    color: ${(props) => props.theme.status.danger.text};
    font: inherit;
    cursor: pointer;
  }

  .flow-guide {
    z-index: 4;
    right: 12px;
    top: 52px;
    width: 300px;
    max-height: calc(100% - 68px);
    padding: 8px 10px 10px;
    overflow-y: auto;
  }
  .flow-guide-header,
  .flow-help-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
  }
  .flow-guide-header { margin-bottom: 4px; color: var(--flow-order); }
  .flow-guide-title,
  .flow-help-title { flex: 1; min-width: 0; color: ${(props) => props.theme.text}; }
  .flow-guide-point { display: flex; align-items: flex-start; gap: 8px; padding: 4px 0; }
  .flow-guide-tick {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    padding: 0;
    border: 1.5px solid ${(props) => props.theme.border.border3};
    border-radius: 50%;
    background: none;
    color: ${(props) => props.theme.colors.text.muted};
    font: inherit;
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 600;
    cursor: pointer;
  }
  .flow-guide-text {
    flex: 1;
    min-width: 0;
    padding: 0;
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    line-height: 1.4;
    text-align: left;
    cursor: pointer;

    &:disabled { cursor: default; }
  }
  .flow-guide-point.current .flow-guide-tick { border-color: var(--flow-order); background: var(--flow-order); color: ${(props) => props.theme.background.base}; }
  .flow-guide-point.current .flow-guide-text { font-weight: 600; }
  .flow-guide-point.done .flow-guide-tick {
    border-color: ${(props) => props.theme.status.success.border};
    background: ${(props) => props.theme.status.success.background};
    color: ${(props) => props.theme.status.success.text};
  }
  .flow-guide-point.done .flow-guide-text { color: ${(props) => props.theme.colors.text.muted}; text-decoration: line-through; }
  .flow-guide-finished { margin-top: 6px; font-weight: 600; color: ${(props) => props.theme.status.success.text}; }

  .flow-guide-mark {
    position: absolute;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid ${(props) => props.theme.background.base};
    background: ${(props) => props.theme.colors.text.muted};
    color: ${(props) => props.theme.background.base};
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 700;
    pointer-events: none;

    &.current { background: var(--flow-order); animation: flow-beckon 1s ease-in-out infinite alternate; }
  }
  @keyframes flow-beckon {
    from { transform: scale(1); }
    to { transform: scale(1.25); }
  }

  .flow-help {
    z-index: 6;
    right: 12px;
    top: 52px;
    width: 340px;
    max-height: calc(100% - 68px);
  }
  .flow-help-header { padding: 10px 12px 4px; }
  .flow-help-body { padding: 0 12px 10px; overflow-y: auto; line-height: 1.4; }
  .flow-help-section {
    margin: 10px 0 4px;
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${(props) => props.theme.colors.text.muted};
  }
  .flow-help-line { margin: 4px 0; padding-left: 8px; border-left: 2px solid ${(props) => props.theme.border.border2}; }
  .flow-help-shape {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin: 5px 0;

    svg { flex-shrink: 0; margin-top: 2px; }
    &.order svg { color: var(--flow-order); }
    &.value svg { color: var(--flow-value); }
  }
  .flow-help-key {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 3px 0;

    kbd {
      flex: 0 0 104px;
      padding: 1px 6px;
      box-sizing: border-box;
      text-align: center;
      font: inherit;
      font-size: ${(props) => props.theme.font.size.xs};
      background: ${(props) => props.theme.background.crust};
      border: 1px solid ${(props) => props.theme.border.border2};
      border-radius: ${(props) => props.theme.border.radius.sm};
    }
  }
  .flow-help-footer {
    display: flex;
    justify-content: flex-end;
    padding: 6px 10px;
    border-top: 1px solid ${(props) => props.theme.border.border1};
  }
`;

export default StyledWrapper;
