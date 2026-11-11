import React from 'react';
import { IconCheck, IconChecklist, IconX } from '@tabler/icons';

const stop = (event) => event.stopPropagation();

// The points left to finish a block, like the tasks of a game: the next one stands out, each ticks itself
// off when it is done, and clicking one shows the step it is about.
const GuidePanel = ({ guide, onTick, onFocus, onClose }) => (
  <div className="flow-guide flow-overlay" onMouseDown={stop} onDoubleClick={stop} data-testid="flow-guide">
    <div className="flow-guide-header">
      <IconChecklist size={14} strokeWidth={1.75} />
      <span className={`flow-guide-title ${guide.translate ? '' : 'fork-no-translate'}`}>{guide.title}</span>
      <button type="button" className="flow-icon-button" aria-label="Close the guide" title="Close the guide" onClick={onClose} data-testid="flow-guide-close">
        <IconX size={13} strokeWidth={2} />
      </button>
    </div>
    {guide.points.map((point) => (
      <div
        key={point.id}
        className={`flow-guide-point ${point.done ? 'done' : ''} ${point.current ? 'current' : ''}`}
        data-testid={`flow-guide-point-${point.number}`}
      >
        <button
          type="button"
          className="flow-guide-tick"
          aria-label={point.done ? 'Done' : 'Mark as done'}
          title={point.done ? 'Done' : 'Mark as done'}
          onClick={() => onTick(point.id)}
        >
          {point.done ? <IconCheck size={11} strokeWidth={3} /> : <span className="fork-no-translate">{point.number}</span>}
        </button>
        <button type="button" className="flow-guide-text" disabled={!point.nodeId} onClick={() => onFocus(point)}>
          {point.text}
        </button>
      </div>
    ))}
    {guide.finished ? <div className="flow-guide-finished">All done. This block is ready.</div> : null}
  </div>
);

export default GuidePanel;
