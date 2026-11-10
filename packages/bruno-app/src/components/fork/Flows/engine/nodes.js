import { compareValues, getByPath, resolveValue } from './values';

export const OUT_PORT = 'out';
export const LOOPBACK_PORT = 'loopback';
export const LIST_PORT = 'list';
export const FIELD_PORT_PREFIX = 'field:';
export const VARIABLE_PORT_PREFIX = 'var:';

const MAX_REPEAT_TIMES = 10000;

export class FlowCancelled extends Error {}

const isSuccessStatus = (status) => status >= 200 && status < 300;

export const readSourcePort = (edge, state) =>
  getByPath(state.outputs[edge.source], edge.sourcePort.startsWith(FIELD_PORT_PREFIX) ? edge.sourcePort.slice(FIELD_PORT_PREFIX.length) : '');

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

const executeRequest = async (context) => {
  const { node, state, host } = context;
  const response = await host.sendRequest(node, { ...state.variables, ...collectWiredVariables(context) });
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

const executeSetValue = ({ node, state, resolve }) => {
  const { name, value: spec } = node.config;
  if (!name) {
    throw new Error('Choose a name for the value');
  }
  const value = resolve(spec);
  state.variables[name] = value;
  state.outputs[node.id] = { value };
  return { port: OUT_PORT, detail: { kind: 'value', name, value } };
};

const executeCompare = ({ node, resolve }) => {
  const { left: leftSpec, operator, right: rightSpec } = node.config;
  const left = resolve(leftSpec);
  const right = resolve(rightSpec);
  const result = compareValues(left, operator, right);
  return { port: result ? 'yes' : 'no', detail: { kind: 'comparison', left, operator, right, result } };
};

const evaluateResponseCheck = (config, requestId, state) => {
  const { status } = state.responses[requestId];
  switch (config.mode) {
    case 'status':
      return status === Number(config.status);
    case 'field':
      return compareValues(getByPath(state.outputs[requestId], config.path), config.operator, config.value);
    default:
      return isSuccessStatus(status);
  }
};

const executeCheckResponse = ({ node, state }) => {
  const requestId = node.config.sourceNodeId || state.lastRequestId;
  if (!requestId || !state.responses[requestId]) {
    throw new Error('There is no response to check yet');
  }
  const result = evaluateResponseCheck(node.config, requestId, state);
  return { port: result ? 'ok' : 'failed', detail: { kind: 'check', status: state.responses[requestId].status, result } };
};

const executeRepeat = ({ node, state, resolve }) => {
  const times = Number(resolve(node.config.times));
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

const executeWait = async ({ node, resolve, sleep, signal }) => {
  const milliseconds = Number(resolve(node.config.milliseconds));
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    throw new Error('The waiting time must be a positive number');
  }
  await sleep(milliseconds, signal);
  return { port: OUT_PORT, detail: { kind: 'wait', milliseconds } };
};

const executeExtract = ({ node, state, resolve }) => {
  const { from, path, saveAs } = node.config;
  const value = getByPath(resolve(from), path);
  state.outputs[node.id] = { value };
  if (saveAs) {
    state.variables[saveAs] = value;
  }
  return { port: OUT_PORT, detail: { kind: 'value', name: saveAs, value } };
};

const buildAppendedValue = ({ node, resolve, warn }) => {
  const resolveOrNull = (spec, label) => {
    const value = resolve(spec);
    if (value === undefined) {
      warn(`No value arrived for "${label}"`);
      return null;
    }
    return value;
  };
  if (node.config.mode === 'object') {
    return Object.fromEntries((node.config.fields || []).map(({ key, value }) => [key, resolveOrNull(value, key)]));
  }
  return resolveOrNull(node.config.value, 'value');
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

const executeStop = ({ node }) => ({ stop: true, detail: { kind: 'stop', message: node.config.message } });

// outputs: the ports that continue the flow. A data-only node never runs; other nodes read from it.
export const NODE_DEFINITIONS = {
  request: { outputs: [OUT_PORT], execute: executeRequest },
  setvalue: { outputs: [OUT_PORT], execute: executeSetValue },
  compare: { outputs: ['yes', 'no'], execute: executeCompare },
  checkresponse: { outputs: ['ok', 'failed'], execute: executeCheckResponse },
  repeat: { outputs: ['body', 'exit'], execute: executeRepeat },
  wait: { outputs: [OUT_PORT], execute: executeWait },
  extract: { outputs: [OUT_PORT], execute: executeExtract },
  list: { outputs: [], dataOnly: true },
  listappend: { outputs: [OUT_PORT], execute: executeListAppend },
  stop: { outputs: [], execute: executeStop }
};

export const buildResolver = (state, environment) => (spec) =>
  resolveValue(spec, { variables: { ...environment, ...state.variables }, outputs: state.outputs });
