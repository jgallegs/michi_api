import React, { useEffect, useRef, useState } from 'react';
import { IconChevronDown, IconChevronRight, IconLayoutSidebarRightCollapse, IconListDetails, IconTrash } from '@tabler/icons';
import { clearRunLog, useRunLog } from '../session';
import StyledWrapper from './StyledWrapper';

// Whether the panel is open is remembered while the app is open, across flows.
let rememberedOpen = true;

const timeOf = (timestamp) => new Date(timestamp).toLocaleTimeString([], { hour12: false });

const Part = ({ part }) => {
  const item = typeof part === 'string' ? { text: part } : part;
  return <span className={item.translate ? '' : 'fork-no-translate'}>{item.text}</span>;
};

const Entry = ({ entry }) => {
  const [unfolded, setUnfolded] = useState(false);
  const Caret = unfolded ? IconChevronDown : IconChevronRight;

  if (entry.kind === 'header') {
    return (
      <div className="output-run" data-testid="flow-output-run">
        <span className="output-run-name fork-no-translate">{entry.label.text}</span>
        {entry.parts.map((part, index) => <Part key={index} part={part} />)}
        <span className="output-time fork-no-translate">{timeOf(entry.time)}</span>
      </div>
    );
  }

  return (
    <div className={`output-entry tone-${entry.tone || 'plain'} kind-${entry.kind}`} data-testid="flow-output-entry">
      <div className="output-line">
        {entry.detail ? (
          <button type="button" className="output-unfold" aria-label="Show the details" title="Show the details" onClick={() => setUnfolded(!unfolded)}>
            <Caret size={12} strokeWidth={2} />
          </button>
        ) : (
          <span className="output-unfold" />
        )}
        {entry.label ? <span className={`output-label ${entry.label.translate ? '' : 'fork-no-translate'}`}>{entry.label.text}</span> : null}
        <span className="output-parts">
          {entry.parts.map((part, index) => <Part key={index} part={part} />)}
        </span>
      </div>
      {unfolded ? <pre className="output-detail fork-no-translate">{entry.detail}</pre> : null}
    </div>
  );
};

// Everything the flows have done since the app was opened, until it is cleared.
const OutputPanel = () => {
  const log = useRunLog();
  const listRef = useRef(null);
  const [open, setOpen] = useState(rememberedOpen);

  const toggle = (next) => {
    rememberedOpen = next;
    setOpen(next);
  };

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [log.length, open]);

  if (!open) {
    return (
      <StyledWrapper className="closed">
        <button type="button" className="output-open" onClick={() => toggle(true)} title="Show the output" aria-label="Show the output" data-testid="flow-output-open">
          <IconListDetails size={16} strokeWidth={1.75} />
          <span>Output</span>
        </button>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper data-testid="flow-output">
      <div className="output-header">
        <span className="output-title">Output</span>
        <button type="button" className="output-action" onClick={clearRunLog} disabled={!log.length} data-testid="flow-output-clear">
          <IconTrash size={14} strokeWidth={1.75} />
          <span>Clear</span>
        </button>
        <button type="button" className="output-action" onClick={() => toggle(false)} title="Hide the output" aria-label="Hide the output">
          <IconLayoutSidebarRightCollapse size={15} strokeWidth={1.75} />
        </button>
      </div>
      <div className="output-list" ref={listRef}>
        {log.length ? log.map((entry) => <Entry key={entry.id} entry={entry} />) : <p className="output-empty">What the flows do when they run shows up here.</p>}
      </div>
    </StyledWrapper>
  );
};

export default OutputPanel;
