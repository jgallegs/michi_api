import { compareValues, getByPath, interpolate } from './values';

export const IN_PORT = 'in';
export const OUT_PORT = 'out';
export const LOOPBACK_PORT = 'loopback';
export const LIST_PORT = 'list';
export const STATUS_PORT = 'status';
export const FIELD_PORT_PREFIX = 'field:';
export const VARIABLE_PORT_PREFIX = 'var:';
export const VALUE_PORT_PREFIX = 'value:';

export const fieldPort = (path = '') => `${FIELD_PORT_PREFIX}${path}`;
export const variablePort = (name) => `${VARIABLE_PORT_PREFIX}${name}`;
export const valuePort = (key) => `${VALUE_PORT_PREFIX}${key}`;
// A field of the item a "For each item" step is on.
export const itemFieldPort = (path) => fieldPort(`item.${path}`);

// The inputs a value arrives through: a variable of a request or a setting of any other step.
export const isValueTargetPort = (port) =>
  String(port).startsWith(VARIABLE_PORT_PREFIX) || String(port).startsWith(VALUE_PORT_PREFIX);

const MAX_REPEAT_TIMES = 10000;

export class FlowCancelled extends Error {}

const isSuccessStatus = (status) => status >= 200 && status < 300;

export const readSourcePort = (edge, state) => {
  if (edge.sourcePort === STATUS_PORT) {
    return state.responses[edge.source]?.status;
  }
  const path = String(edge.sourcePort).startsWith(FIELD_PORT_PREFIX) ? edge.sourcePort.slice(FIELD_PORT_PREFIX.length) : '';
  return getByPath(state.outputs[edge.source], path);
};

// A setting takes its value from the cable connected to it; without a cable, from the text typed in the step.
export const createInputReaders = ({ node, flow, state, environment }) => {
  const text = (typed) => interpolate(typed, { ...environment, ...state.variables });
  const input = (key, typed) => {
    const edge = flow.edges.find((candidate) => candidate.target === node.id && candidate.targetPort === valuePort(key));
    return edge ? readSourcePort(edge, state) : text(typed);
  };
  return { input, text };
};

const collectWiredVariables = ({ node, flow, state, warn }) => {
  const wired = {};
  flow.edges
    .filter((edge) => edge.target === node.id && String(edge.targetPort).startsWith(VARIABLE_PORT_PREFIX))
    .forEach((edge) => {
      const name = edge.targetPort.slice(VARIABLE_PORT_PREFIX.length);
      const value = readSourcePort(edge, state);
      if (value === undefined) {
        warn(`No value arrived for "${name}"`);
        return;
      }
      wired[name] = value;
    });
  return wired;
};

const executeStart = () => ({ port: OUT_PORT, detail: { kind: 'start' } });

// Values typed in the step for the variables of its request; an empty box leaves the usual value.
const collectTypedVariables = ({ node, text }) =>
  Object.fromEntries(
    Object.entries(node.config.variables || {})
      .filter(([, typed]) => typed !== '' && typed !== undefined && typed !== null)
      .map(([name, typed]) => [name, text(typed)])
  );

const executeRequest = async (context) => {
  const { node, state, host } = context;
  const variables = { ...state.variables, ...collectTypedVariables(context), ...collectWiredVariables(context) };
  const response = await host.sendRequest(node, variables);
  if (response.cancelled) {
    throw new FlowCancelled('The request was not sent');
  }
  if (response.error) {
    throw new Error(response.error);
  }
  state.outputs[node.id] = response.data;
  state.responses[node.id] = { status: response.status };
  state.lastRequestId = node.id;
  return { port: OUT_PORT, detail: { kind: 'response', response } };
};

const executeSetValue = ({ node, state, input }) => {
  const { name } = node.config;
  if (!name) {
    throw new Error('Choose a name for the value');
  }
  const value = input('value', node.config.value);
  state.variables[name] = value;
  state.outputs[node.id] = { value };
  return { port: OUT_PORT, detail: { kind: 'value', name, value } };
};

const checkLastResponse = ({ node, state, input }) => {
  if (!state.lastRequestId) {
    throw new Error('There is no response to check yet');
  }
  const { status } = state.responses[state.lastRequestId];
  const result = node.config.check === 'status' ? status === Number(input('status', node.config.status)) : isSuccessStatus(status);
  return { result, detail: { kind: 'check', status, result } };
};

const compareInputs = ({ node, input }) => {
  const operator = node.config.operator || 'equals';
  const left = input('left', node.config.left);
  const right = input('right', node.config.right);
  const result = compareValues(left, operator, right);
  return { result, detail: { kind: 'comparison', left, operator, right, result } };
};

const executeIf = (context) => {
  const { result, detail } = context.node.config.check === 'compare' ? compareInputs(context) : checkLastResponse(context);
  return { port: result ? 'yes' : 'no', detail };
};

const executeRepeat = ({ node, state, input }) => {
  const times = Number(input('times', node.config.times));
  if (!Number.isInteger(times) || times < 0 || times > MAX_REPEAT_TIMES) {
    throw new Error(`The number of repetitions must be a whole number from 0 to ${MAX_REPEAT_TIMES}`);
  }
  if (times === 0) {
    return { port: 'exit', detail: { kind: 'repeat', times } };
  }
  state.loops.push({ nodeId: node.id, index: 1, times });
  state.outputs[node.id] = { index: 1 };
  return { port: 'body', detail: { kind: 'repeat', times } };
};

// Goes once through every item of a list; each round hands out the item it is on.
const executeForEach = ({ node, state, input }) => {
  const items = input('list');
  if (!Array.isArray(items)) {
    throw new Error('This step needs a list, and what arrived is not one');
  }
  if (items.length > MAX_REPEAT_TIMES) {
    throw new Error(`A list to go through can have ${MAX_REPEAT_TIMES} items at most`);
  }
  if (items.length === 0) {
    return { port: 'exit', detail: { kind: 'repeat', times: 0 } };
  }
  state.loops.push({ nodeId: node.id, index: 1, times: items.length, items });
  state.outputs[node.id] = { index: 1, item: items[0] };
  return { port: 'body', detail: { kind: 'repeat', times: items.length } };
};

// Ends the innermost loop that is running: the flow goes on from its "When finished" output.
const executeLeave = ({ state }) => {
  const loop = state.loops[state.loops.length - 1];
  if (!loop) {
    throw new Error('Leave loop only works inside a loop');
  }
  return { leaveLoop: true, detail: { kind: 'leave', index: loop.index, times: loop.times } };
};

const executeNote = ({ node, input }) => ({ port: OUT_PORT, detail: { kind: 'note', message: input('message', node.config.message) } });

const executeWait = async ({ node, input, sleep, signal }) => {
  const seconds = Number(input('seconds', node.config.seconds));
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new Error('The waiting time must be a positive number of seconds');
  }
  await sleep(seconds * 1000, signal);
  return { port: OUT_PORT, detail: { kind: 'wait', seconds } };
};

const buildAppendedValue = ({ node, input, warn }) => {
  const readOrNull = (key, typed, label) => {
    const value = input(key, typed);
    if (value === undefined) {
      warn(`No value arrived for "${label}"`);
      return null;
    }
    return value;
  };
  if (node.config.mode === 'object') {
    return Object.fromEntries((node.config.fields || []).map((field) => [field.key, readOrNull(field.id, field.value, field.key)]));
  }
  return readOrNull('value', node.config.value, 'value');
};

const executeListAppend = (context) => {
  const { node, flow, state } = context;
  const listEdge = flow.edges.find((edge) => edge.target === node.id && edge.targetPort === LIST_PORT);
  const listNode = flow.nodes.find((candidate) => candidate.id === listEdge.source);
  const items = [...state.outputs[listNode.id].items, buildAppendedValue(context)];
  state.outputs[listNode.id] = { items, length: items.length };
  if (listNode.config?.name) {
    state.variables[listNode.config.name] = items;
  }
  return { port: OUT_PORT, detail: { kind: 'list', listNodeId: listNode.id, items } };
};

const executeStop = ({ node, input }) => ({ stop: true, detail: { kind: 'stop', message: input('message', node.config.message) } });

// outputs: the ports that continue the flow. A data-only node never runs; other nodes read from it.
// loop: the step repeats what hangs from "body" and has an end of round input.
export const NODE_DEFINITIONS = {
  start: { outputs: [OUT_PORT], execute: executeStart },
  request: { outputs: [OUT_PORT], execute: executeRequest },
  setvalue: { outputs: [OUT_PORT], execute: executeSetValue },
  if: { outputs: ['yes', 'no'], execute: executeIf },
  repeat: { outputs: ['body', 'exit'], loop: true, execute: executeRepeat },
  foreach: { outputs: ['body', 'exit'], loop: true, execute: executeForEach },
  leave: { outputs: [], execute: executeLeave },
  note: { outputs: [OUT_PORT], execute: executeNote },
  wait: { outputs: [OUT_PORT], execute: executeWait },
  list: { outputs: [], dataOnly: true },
  listappend: { outputs: [OUT_PORT], execute: executeListAppend },
  stop: { outputs: [], execute: executeStop }
};

export const isLoopNode = (node) => Boolean(NODE_DEFINITIONS[node?.type]?.loop);
