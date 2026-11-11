import React from 'react';
import {
  IconAlertCircle,
  IconArrowsSplit2,
  IconShieldCheck,
  IconChevronDown,
  IconChevronRight,
  IconClock,
  IconList,
  IconListDetails,
  IconLogout,
  IconNote,
  IconPlayerPlay,
  IconPlayerStop,
  IconPlayerTrackNext,
  IconPlaylistAdd,
  IconPlug,
  IconPlus,
  IconRepeat,
  IconSend,
  IconVariable,
  IconX
} from '@tabler/icons';
import { LOOPBACK_PORT } from '../../engine/nodes';
import { say } from '../../language';
import { BRANCH_TONES } from '../colors';
import { PIECE_WIDTH, PORT_KIND } from '../pieces';

export const STEP_ICONS = {
  start: IconPlayerPlay,
  request: IconSend,
  if: IconArrowsSplit2,
  validate: IconShieldCheck,
  repeat: IconRepeat,
  foreach: IconListDetails,
  leave: IconLogout,
  note: IconNote,
  wait: IconClock,
  setvalue: IconVariable,
  list: IconList,
  listappend: IconPlaylistAdd,
  stop: IconPlayerStop
};

const PORT_SIZE = 14;

const getIn = (container, path) => path.reduce((current, key) => current?.[key], container);

// Order ports are triangles, values leave through circles and arrive at squares. A port is filled only
// while a cable is connected to it.
export const PortShape = ({ kind, side, filled }) => {
  const fill = filled ? 'currentColor' : 'var(--flow-port-empty)';
  const common = { fill, stroke: 'currentColor', strokeWidth: 1.5, strokeLinejoin: 'round' };
  return (
    <svg width={PORT_SIZE} height={PORT_SIZE} viewBox="0 0 14 14" aria-hidden="true">
      {kind === PORT_KIND.ORDER ? <path d="M7 2 L12.5 11.5 L1.5 11.5 Z" {...common} /> : null}
      {kind !== PORT_KIND.ORDER && side === 'right' ? <circle cx="7" cy="7" r="5" {...common} /> : null}
      {kind !== PORT_KIND.ORDER && side === 'left' ? <rect x="2" y="2" width="10" height="10" rx="1.5" {...common} /> : null}
    </svg>
  );
};

// What each port is for, told when the pointer rests on it.
const PORT_TITLES = {
  'order:right': 'What runs next: pull a cable from here',
  'order:left': 'The step before arrives here',
  'value:right': 'A value that comes out: pull a cable to use it in another step',
  'value:left': 'A value it needs: click to choose where it comes from',
  'list:right': 'The list: join it to an Add to list step, or use it as a value',
  'list:left': 'The list it adds to: join a List here'
};
const LOOPBACK_TITLE = 'End of round: the last step of the round arrives here';

const Port = ({ node, port, state, onMouseDown }) => (
  <span
    className={`flow-port ${port.side} ${port.kind} ${state.filled ? 'filled' : ''} ${state.highlight || ''} ${BRANCH_TONES[port.port] ? `tone-${BRANCH_TONES[port.port]}` : ''}`}
    style={{ top: port.y - PORT_SIZE / 2, ...(state.color ? { '--flow-value': state.color } : {}) }}
    title={port.port === LOOPBACK_PORT ? LOOPBACK_TITLE : PORT_TITLES[`${port.kind}:${port.side}`]}
    data-testid={`flow-port-${node.id}-${port.side}-${port.port}`}
    onMouseDown={port.hidden ? undefined : (event) => onMouseDown(event, node, port)}
  >
    <PortShape kind={port.kind} side={port.side} filled={state.filled} />
  </span>
);

const Chip = ({ source, onRemove }) => (
  <span className="flow-chip" title={`${source.title} · ${source.label}`} style={source.color ? { '--flow-value': source.color } : undefined}>
    <span className="flow-chip-text">
      <span className={source.ownTitle ? 'fork-no-translate' : ''}>{source.title}</span>
      <span className="fork-no-translate"> · </span>
      <span className={source.ownLabel ? 'fork-no-translate' : ''}>{source.label}</span>
    </span>
    <button type="button" className="flow-icon-button" aria-label="Disconnect" title="Disconnect" onClick={onRemove}>
      <IconX size={12} strokeWidth={2} />
    </button>
  </span>
);

const TypedValue = ({ node, row, source, onConfig, onAction }) => {
  if (source) {
    return <Chip source={source} onRemove={() => onAction('disconnect', row.left.port)} />;
  }
  return (
    <>
      <input
        className="flow-input"
        value={getIn(node.config, row.control.path) ?? ''}
        placeholder={row.control.placeholder}
        onChange={(event) => onConfig(row.control.path, event.target.value)}
      />
      {row.left ? (
        <button type="button" className="flow-icon-button" aria-label="Use a value from another step" title="Use a value from another step" onClick={(event) => onAction('pick-value', row.left.port, event)}>
          <IconPlug size={13} strokeWidth={1.75} />
        </button>
      ) : null}
    </>
  );
};

const RequestChoice = ({ request, onAction }) => {
  const label = request.item ? request.name : request.missing ? 'Request not found' : 'Choose a request';
  return (
    <button type="button" className={`flow-request-choice ${request.item ? '' : 'unset'}`} onClick={(event) => onAction('pick-request', null, event)}>
      {request.item ? <span className={`flow-method method-${request.method.toLowerCase()} fork-no-translate`}>{request.method}</span> : null}
      <span className={`flow-request-name ${request.item ? 'fork-no-translate' : ''}`}>{label}</span>
    </button>
  );
};

const Row = ({ node, row, request, sources, onConfig, onAction }) => {
  if (row.section) {
    const Caret = row.collapsed ? IconChevronRight : IconChevronDown;
    return (
      <button type="button" className="flow-row flow-section" onClick={() => onAction('toggle-section', row.section)}>
        <Caret size={12} strokeWidth={2} />
        <span>{row.title}</span>
        <span className="flow-count">{row.count}</span>
      </button>
    );
  }
  if (row.action) {
    return (
      <button type="button" className="flow-row flow-row-action" onClick={(event) => onAction(row.action, null, event)}>
        <IconPlus size={12} strokeWidth={2} />
        <span>{row.label}</span>
      </button>
    );
  }
  const { control } = row;
  const source = row.left ? sources.get(row.left.port) : null;
  if (control?.type === 'request') {
    return (
      <div className="flow-row">
        <RequestChoice request={request} onAction={onAction} />
      </div>
    );
  }
  if (control?.type === 'wired') {
    return (
      <div className="flow-row">
        <span className="flow-label" title={row.label}>{row.label}</span>
        {source ? (
          <Chip source={source} onRemove={() => onAction('disconnect', row.left.port)} />
        ) : (
          <button type="button" className="flow-request-choice unset" onClick={(event) => onAction('pick-value', row.left.port, event)}>
            <span className="flow-request-name">{control.placeholder}</span>
          </button>
        )}
      </div>
    );
  }
  if (control?.type === 'select') {
    return (
      <div className="flow-row">
        <select className="flow-select" value={getIn(node.config, control.path) ?? control.fallback} onChange={(event) => onConfig(control.path, event.target.value)}>
          {control.options.map((option) => (
            <option key={option.value} value={option.value}>{say(option.label)}</option>
          ))}
        </select>
      </div>
    );
  }
  if (control?.type === 'keyed') {
    return (
      <div className="flow-row">
        <input className="flow-input flow-key" value={getIn(node.config, control.keyPath) ?? ''} placeholder="Name" onChange={(event) => onConfig(control.keyPath, event.target.value)} />
        <TypedValue node={node} row={row} source={source} onConfig={onConfig} onAction={onAction} />
        <button type="button" className="flow-icon-button" aria-label="Remove field" title="Remove field" onClick={() => onAction('remove-list-field', row.removableIndex)}>
          <IconX size={12} strokeWidth={2} />
        </button>
      </div>
    );
  }
  if (control?.type === 'text') {
    return (
      <div className="flow-row">
        <span className={`flow-label ${row.left?.port.startsWith('var:') ? 'fork-no-translate' : ''}`} title={row.label}>{row.label}</span>
        <TypedValue node={node} row={row} source={source} onConfig={onConfig} onAction={onAction} />
      </div>
    );
  }
  return (
    <div className={`flow-row ${row.right ? 'flow-row-out' : ''}`}>
      {row.removableField ? (
        <button type="button" className="flow-icon-button" aria-label="Remove field" title="Remove field" onClick={() => onAction('remove-field', row.removableField)}>
          <IconX size={12} strokeWidth={2} />
        </button>
      ) : null}
      <span className={`flow-label ${row.removableField ? 'fork-no-translate' : ''}`} title={row.label}>{row.shownLabel || row.label}</span>
      {row.positions ? (
        <button
          type="button"
          className="flow-position"
          title="Which item of the list is read: click to change it"
          data-testid={`flow-position-${node.id}-${row.removableField}`}
          onClick={(event) => onAction('pick-position', row.removableField, event)}
        >
          {row.positions.map((position, index) => (
            <React.Fragment key={position.list}>
              {index ? <span className="fork-no-translate">, </span> : null}
              <span className={position.translate ? '' : 'fork-no-translate'}>{position.text}</span>
            </React.Fragment>
          ))}
        </button>
      ) : null}
    </div>
  );
};

// What the last run left on a step: how it went and, where it stopped, a button to go on from there.
const RunMark = ({ run }) => (
  <>
    {run.tag ? <span className={`flow-tag tone-${run.tag.tone || 'plain'} ${run.tag.translate ? '' : 'fork-no-translate'}`}>{run.tag.text}</span> : null}
    {run.onContinue ? (
      <button type="button" className="flow-continue" aria-label="Continue from this step" title="Continue from this step" onClick={run.onContinue}>
        <IconPlayerTrackNext size={13} strokeWidth={2} />
      </button>
    ) : null}
  </>
);

const Piece = ({ node, description, request, title, position, selected, dimmed, issues, run, portState, sources, onMouseDown, onPortMouseDown, onConfig, onAction, onHover }) => {
  const Icon = STEP_ICONS[node.type] || IconAlertCircle;
  // Only a request step is titled with a name someone chose; "List · orders" is still an interface text.
  const hasOwnTitle = node.type === 'request' && title !== description.title;
  return (
    <div
      className={`flow-piece type-${node.type} ${selected ? 'selected' : ''} ${dimmed ? 'dimmed' : ''} ${issues.length ? 'has-issue' : ''} ${run.state ? `run-${run.state}` : ''}`}
      style={{ left: position.x, top: position.y, width: PIECE_WIDTH, height: description.height }}
      title={dimmed ? 'This step is not connected to Start, so it does not run' : undefined}
      data-testid={`flow-piece-${node.id}`}
      data-piece-type={node.type}
      onMouseDown={(event) => onMouseDown(event, node)}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="flow-piece-header">
        <Icon size={15} strokeWidth={1.75} className="flow-piece-icon" />
        <span className={`flow-piece-title ${hasOwnTitle ? 'fork-no-translate' : ''}`}>{title}</span>
        <RunMark run={run} />
        {issues.length ? (
          <span className="flow-issue" title={issues.map((item) => item.message).join('\n')} data-testid={`flow-issue-${node.id}`}>
            <IconAlertCircle size={15} strokeWidth={1.75} />
          </span>
        ) : null}
      </div>
      {issues.length ? <div className="flow-issue-text">{issues[0].message}</div> : null}
      {description.rows.map((row) => (
        <Row key={row.id} node={node} row={row} request={request} sources={sources} onConfig={onConfig} onAction={onAction} />
      ))}
      {description.ports.map((port) => (
        <Port key={`${port.side}:${port.port}`} node={node} port={port} state={portState(port)} onMouseDown={onPortMouseDown} />
      ))}
    </div>
  );
};

export default Piece;
