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

// How a run ends. It lives here so that a step that runs another flow can tell how that one went.
export const RUN_STATUS = {
  COMPLETED: 'completed',
  STOPPED: 'stopped',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  PAUSED: 'paused',
  INVALID: 'invalid'
};

// The questions a flow asks before it runs. Start hands out the answers; one nobody answered keeps the
// value written next to the question. Each answer is also a variable with the name of its question.
export const questionsOf = (flow) => (flow?.nodes || []).find((node) => node.type === 'start')?.config?.questions || [];

const executeStart = ({ node, state, inputs, text }) => {
  const answers = {};
  (node.config.questions || []).forEach((question) => {
    const value = inputs && inputs[question.id] !== undefined && inputs[question.id] !== '' ? inputs[question.id] : text(question.value ?? '');
    answers[question.id] = value;
    if (question.name) {
      state.variables[question.name] = value;
    }
  });
  state.outputs[node.id] = answers;
  return { port: OUT_PORT, detail: { kind: 'start', answers: (node.config.questions || []).map((question) => ({ name: question.name, value: answers[question.id] })) } };
};

// A table of data written in the flow: each row is an item with the columns as its fields.
export const tableRows = (node) => {
  const columns = node.config?.columns || [];
  return (node.config?.rows || []).map((row) => Object.fromEntries(columns.map((column, index) => [column, row[index] ?? ''])));
};

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
  state.responses[node.id] = { status: response.status, tests: response.tests };
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
  const { status, tests } = state.responses[state.lastRequestId];
  if (node.config.check === 'tests') {
    // The tests the request itself carries; one without tests has none that fail.
    const failed = tests?.failed || 0;
    return { result: failed === 0, detail: { kind: 'tests', passed: tests?.passed || 0, failed, result: failed === 0 } };
  }
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

// Tells apart an answer that came back fine but carries an error inside: when the value is the one
// that means so, the flow goes on through "Not valid" and what hangs from "Valid" never sees it.
const executeValidate = (context) => {
  const { result, detail } = compareInputs(context);
  return { port: result ? 'invalid' : 'valid', detail: { ...detail, kind: 'validation', valid: !result } };
};

// Runs another flow of the collection as one step. Its questions are the inputs of the step, and what it
// leaves with a name (variables, lists, the answers themselves) is what the step hands out.
const MAX_FLOW_DEPTH = 5;

const executeFlow = async ({ node, state, host, input, runInside, depth }) => {
  const inner = node.config.flowId && host.getFlow ? host.getFlow(node.config.flowId) : null;
  if (!inner) {
    throw new Error('The flow of this step is no longer in the collection');
  }
  if (depth >= MAX_FLOW_DEPTH) {
    throw new Error('Flows inside flows go too deep');
  }
  const inputs = Object.fromEntries(questionsOf(inner).map((question) => [question.id, input(`q:${question.id}`, node.config.inputs?.[question.id] || question.value || '')]));
  const result = await runInside(inner, inputs, node.id);
  if (result.status === RUN_STATUS.CANCELLED) {
    throw new FlowCancelled('The run was stopped');
  }
  if (result.status !== RUN_STATUS.COMPLETED && result.status !== RUN_STATUS.STOPPED) {
    throw new Error(result.error || result.issues?.[0]?.message || 'The flow inside could not run');
  }
  state.outputs[node.id] = { ...(result.state?.variables || {}) };
  return { port: OUT_PORT, detail: { kind: 'flow', name: inner.name } };
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

// The list an "Add to list" writes to: the one joined to it by a cable, which is how flows were first
// built; the one chosen inside the step; or the only one the flow has.
export const findListOf = (flow, node) => {
  const lists = flow.nodes.filter((candidate) => candidate.type === 'list');
  const cable = flow.edges.find((edge) => edge.target === node.id && edge.targetPort === LIST_PORT);
  if (cable) {
    return lists.find((list) => list.id === cable.source) || null;
  }
  if (node.config?.list) {
    return lists.find((list) => list.id === node.config.list) || null;
  }
  return lists.length === 1 ? lists[0] : null;
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
  const listNode = findListOf(flow, node);
  if (!listNode) {
    throw new Error('Choose the list this step adds to');
  }
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
  validate: { outputs: ['valid', 'invalid'], execute: executeValidate },
  repeat: { outputs: ['body', 'exit'], loop: true, execute: executeRepeat },
  foreach: { outputs: ['body', 'exit'], loop: true, execute: executeForEach },
  leave: { outputs: [], execute: executeLeave },
  note: { outputs: [OUT_PORT], execute: executeNote },
  wait: { outputs: [OUT_PORT], execute: executeWait },
  list: { outputs: [], dataOnly: true },
  table: { outputs: [], dataOnly: true },
  flow: { outputs: [OUT_PORT], execute: executeFlow },
  listappend: { outputs: [OUT_PORT], execute: executeListAppend },
  stop: { outputs: [], execute: executeStop }
};

export const isLoopNode = (node) => Boolean(NODE_DEFINITIONS[node?.type]?.loop);
