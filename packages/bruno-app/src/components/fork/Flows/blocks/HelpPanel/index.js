import React from 'react';
import { IconX } from '@tabler/icons';
import { PortShape } from '../../canvas/Piece';
import { PORT_KIND } from '../../canvas/pieces';

const stop = (event) => event.stopPropagation();

const SHAPES = [
  { kind: PORT_KIND.ORDER, side: 'right', text: 'A triangle is the order: what runs after what. Pull a cable from it to the next step.' },
  { kind: PORT_KIND.VALUE, side: 'right', text: 'A circle is a value that comes out of a step, like a field of a response.' },
  { kind: PORT_KIND.VALUE, side: 'left', text: 'A square is a value a step needs. Click it to choose where it comes from.' }
];

const BUILDING = [
  'Pull a cable and drop it on empty space to choose what comes next.',
  'Drag a request from the sidebar onto the canvas.',
  'Right click on empty space to add a step, a request or a block right there.',
  'Faded steps are not connected to Start and do not run.',
  'Drag any stretch of a cable to shape it. Double click puts it back.',
  'A value wears the colour of the step it comes from, on its cable and where it arrives.',
  'The cables of the values show when you rest the pointer on a step or select it. The eye in the bar shows them all.'
];

const RUNNING = [
  'Run goes through the whole flow. Step runs one step and waits.',
  'The environment it runs against is always next to Run. A red one asks first.',
  'If a request cannot be sent, the flow waits there: fix it and press Continue.'
];

const KEYS = [
  ['Ctrl + Z', 'Undo'],
  ['Ctrl + Y', 'Redo'],
  ['Ctrl + C, V, D', 'Copy, paste and duplicate'],
  ['Del', 'Delete what is selected'],
  ['Ctrl + A', 'Select everything'],
  ['Ctrl + S', 'Save'],
  ['Ctrl + Enter', 'Run'],
  ['Right button', 'Drag to move the canvas'],
  ['Wheel', 'Zoom in and out']
];

// Everything needed to read a flow, on one screen and always one click away.
const HelpPanel = ({ onShowBlocks, onCourse, onClose }) => (
  <div className="flow-help flow-overlay" onMouseDown={stop} onDoubleClick={stop} data-testid="flow-help">
    <div className="flow-help-header">
      <span className="flow-help-title">How flows work</span>
      <button type="button" className="flow-icon-button" aria-label="Close" title="Close" onClick={onClose}>
        <IconX size={13} strokeWidth={2} />
      </button>
    </div>
    <div className="flow-help-body">
      <div className="flow-help-section">The shapes</div>
      {SHAPES.map((shape) => (
        <div key={shape.text} className={`flow-help-shape ${shape.kind}`}>
          <PortShape kind={shape.kind} side={shape.side} filled />
          <span>{shape.text}</span>
        </div>
      ))}
      <div className="flow-help-line">A shape is filled only while it has a cable.</div>

      <div className="flow-help-section">Building a flow</div>
      {BUILDING.map((text) => <div key={text} className="flow-help-line">{text}</div>)}

      <div className="flow-help-section">Running it</div>
      {RUNNING.map((text) => <div key={text} className="flow-help-line">{text}</div>)}

      <div className="flow-help-section">Keys</div>
      {KEYS.map(([keys, text]) => (
        <div key={keys} className="flow-help-key">
          <kbd>{keys}</kbd>
          <span>{text}</span>
        </div>
      ))}
    </div>
    <div className="flow-help-footer">
      <button type="button" className="flow-tool" onClick={onCourse} data-testid="flow-help-course">
        <span>Guided course</span>
      </button>
      <button type="button" className="flow-tool" onClick={onShowBlocks} data-testid="flow-help-blocks">
        <span>Show the blocks</span>
      </button>
    </div>
  </div>
);

export default HelpPanel;
