import {
  FIELD_PORT_PREFIX,
  IN_PORT,
  LIST_PORT,
  LOOPBACK_PORT,
  OUT_PORT,
  STATUS_PORT,
  VARIABLE_PORT_PREFIX,
  fieldPort,
  valuePort,
  variablePort
} from '../engine/nodes';
import { COMPARISON_OPERATORS, isSingleValueOperator } from '../engine/values';

// What travels through a port: the order of the steps, a value, or the list an "Add to list" writes to.
export const PORT_KIND = { ORDER: 'order', VALUE: 'value', LIST: 'list' };

export const PIECE_WIDTH = 240;
export const HEADER_HEIGHT = 34;
export const ROW_HEIGHT = 28;
export const PIECE_PADDING = 6;

export const OPERATOR_LABELS = {
  equals: 'is equal to',
  notEquals: 'is not equal to',
  greater: 'is greater than',
  less: 'is less than',
  greaterEqual: 'is at least',
  lessEqual: 'is at most',
  contains: 'contains',
  notContains: 'does not contain',
  startsWith: 'starts with',
  endsWith: 'ends with',
  isEmpty: 'is empty',
  isNotEmpty: 'is not empty',
  isTrue: 'is true',
  isFalse: 'is false'
};

const CHECK_OPTIONS = [
  { value: 'success', label: 'The response is OK' },
  { value: 'status', label: 'The status code is' },
  { value: 'compare', label: 'Two values compare' }
];

const APPEND_MODES = [
  { value: 'value', label: 'One value' },
  { value: 'object', label: 'Several fields' }
];

const order = (port) => ({ port, kind: PORT_KIND.ORDER });
const value = (port) => ({ port, kind: PORT_KIND.VALUE });

const typed = (key, label, placeholder) => ({
  id: `value:${key}`,
  label,
  left: value(valuePort(key)),
  control: { type: 'text', path: [key], placeholder }
});

const connectedPorts = (flow, node, side, prefix) => {
  const ends = side === 'target' ? ['target', 'targetPort'] : ['source', 'sourcePort'];
  return flow.edges
    .filter((edge) => edge[ends[0]] === node.id && String(edge[ends[1]]).startsWith(prefix))
    .map((edge) => edge[ends[1]].slice(prefix.length));
};

const unique = (items) => [...new Set(items)];

// A collapsed section keeps its cables: they all hang from the section title.
const section = (node, key, title, rows) => {
  const collapsed = Boolean(node.collapsed?.[key]);
  const header = { id: `section:${key}`, section: key, title, count: rows.length, collapsed };
  if (!collapsed) {
    return [header, ...rows];
  }
  return [{ ...header, hiddenLeft: rows.filter((row) => row.left).map((row) => row.left), hiddenRight: rows.filter((row) => row.right).map((row) => row.right) }];
};

const requestRows = (node, flow, request) => {
  const config = node.config || {};
  const variables = unique([
    ...(request?.variables || []),
    ...Object.keys(config.variables || {}),
    ...connectedPorts(flow, node, 'target', VARIABLE_PORT_PREFIX)
  ]);
  const fields = unique([...(config.fields || []), ...connectedPorts(flow, node, 'source', FIELD_PORT_PREFIX)]).filter(Boolean);
  const inputs = variables.map((name) => ({
    id: `var:${name}`,
    label: name,
    left: value(variablePort(name)),
    control: { type: 'text', path: ['variables', name], placeholder: 'Its usual value' }
  }));
  const outputs = [
    { id: 'out:status', label: 'Status code', right: value(STATUS_PORT) },
    { id: 'out:body', label: 'Whole response', right: value(fieldPort()) },
    ...fields.map((path) => ({ id: `out:${path}`, label: path, right: value(fieldPort(path)), removableField: path })),
    { id: 'out:add', action: 'add-field', label: 'Add a field' }
  ];
  return [
    { id: 'request', control: { type: 'request' } },
    ...(inputs.length ? section(node, 'inputs', 'Values it uses', inputs) : []),
    ...section(node, 'outputs', 'What it returns', outputs)
  ];
};

const ifRows = (node) => {
  const config = node.config || {};
  const check = config.check || 'success';
  const operator = config.operator || 'equals';
  const operators = COMPARISON_OPERATORS.map((name) => ({ value: name, label: OPERATOR_LABELS[name] }));
  return [
    { id: 'check', control: { type: 'select', path: ['check'], options: CHECK_OPTIONS, fallback: 'success' } },
    ...(check === 'status' ? [typed('status', 'Status', '200')] : []),
    ...(check === 'compare'
      ? [
          typed('left', 'This', 'A value'),
          { id: 'operator', control: { type: 'select', path: ['operator'], options: operators, fallback: 'equals' } },
          ...(isSingleValueOperator(operator) ? [] : [typed('right', 'That', 'Another value')])
        ]
      : []),
    { id: 'yes', label: 'Yes', right: order('yes') },
    { id: 'no', label: 'No', right: order('no') }
  ];
};

const listAppendRows = (node) => {
  const config = node.config || {};
  const fields = config.fields || [];
  const valueRows
    = config.mode === 'object'
      ? [
          ...fields.map((field, index) => ({
            id: `field:${field.id}`,
            left: value(valuePort(field.id)),
            control: { type: 'keyed', keyPath: ['fields', index, 'key'], path: ['fields', index, 'value'], placeholder: 'Value' },
            removableIndex: index
          })),
          { id: 'add', action: 'add-list-field', label: 'Add a field' }
        ]
      : [typed('value', 'Value', 'What to add')];
  return [
    { id: 'list', label: 'List', left: { port: LIST_PORT, kind: PORT_KIND.LIST } },
    { id: 'mode', control: { type: 'select', path: ['mode'], options: APPEND_MODES, fallback: 'value' } },
    ...valueRows
  ];
};

// title: what the step is called in the picker. header: whether it has an order input and a single order output.
export const PIECES = {
  start: { title: 'Start', headerOut: true, rows: () => [] },
  request: { title: 'Request', headerIn: true, headerOut: true, rows: requestRows },
  if: { title: 'If', headerIn: true, rows: ifRows },
  repeat: {
    title: 'Repeat',
    headerIn: true,
    rows: () => [
      typed('times', 'Times', '3'),
      { id: 'body', label: 'On each round', right: order('body') },
      { id: 'loopback', label: 'End of round', left: order(LOOPBACK_PORT) },
      { id: 'exit', label: 'When finished', right: order('exit') },
      { id: 'index', label: 'Round number', right: value(fieldPort('index')) }
    ]
  },
  wait: { title: 'Wait', headerIn: true, headerOut: true, rows: () => [typed('seconds', 'Seconds', '1')] },
  setvalue: {
    title: 'Set variable',
    headerIn: true,
    headerOut: true,
    rows: () => [
      { id: 'name', label: 'Name', control: { type: 'text', path: ['name'], placeholder: 'token' } },
      { ...typed('value', 'Value', 'Its value'), right: value(fieldPort('value')) }
    ]
  },
  list: {
    title: 'List',
    rows: () => [
      { id: 'name', label: 'Name', control: { type: 'text', path: ['name'], placeholder: 'Optional' } },
      { id: 'items', label: 'Items', right: { port: fieldPort('items'), kind: PORT_KIND.LIST } },
      { id: 'length', label: 'How many', right: value(fieldPort('length')) }
    ]
  },
  listappend: { title: 'Add to list', headerIn: true, headerOut: true, rows: listAppendRows },
  stop: { title: 'Stop', headerIn: true, rows: () => [typed('message', 'Message', 'Why it stops')] }
};

// The steps offered when adding one; Start is always there and never added by hand.
export const ADDABLE_PIECES = ['request', 'if', 'repeat', 'list', 'listappend', 'setvalue', 'wait', 'stop'];

// Everything the canvas needs to draw a step: its rows and where each port sits inside it.
export const describePiece = (node, flow, request) => {
  const piece = PIECES[node.type];
  if (!piece) {
    return { title: node.type, unknown: true, rows: [], ports: [], height: HEADER_HEIGHT + PIECE_PADDING };
  }
  const rows = piece.rows(node, flow, request);
  const rowY = (index) => HEADER_HEIGHT + index * ROW_HEIGHT + ROW_HEIGHT / 2;
  const ports = [
    ...(piece.headerIn ? [{ ...order(IN_PORT), side: 'left', y: HEADER_HEIGHT / 2 }] : []),
    ...(piece.headerOut ? [{ ...order(OUT_PORT), side: 'right', y: HEADER_HEIGHT / 2 }] : []),
    ...rows.flatMap((row, index) => [
      ...[row.left, ...(row.hiddenLeft || [])].filter(Boolean).map((port) => ({ ...port, side: 'left', y: rowY(index), hidden: !row.left })),
      ...[row.right, ...(row.hiddenRight || [])].filter(Boolean).map((port) => ({ ...port, side: 'right', y: rowY(index), hidden: !row.right }))
    ])
  ];
  return {
    title: piece.title,
    headerIn: Boolean(piece.headerIn),
    headerOut: Boolean(piece.headerOut),
    rows,
    ports,
    height: HEADER_HEIGHT + rows.length * ROW_HEIGHT + PIECE_PADDING
  };
};

export const findPort = (description, port, side) =>
  description.ports.find((candidate) => candidate.port === port && candidate.side === side) || null;
