import { findNextEdge, findStartNode, validateFlow } from './graph';
import { FlowCancelled, LOOPBACK_PORT, NODE_DEFINITIONS, createInputReaders } from './nodes';

export const RUN_STATUS = {
  COMPLETED: 'completed',
  STOPPED: 'stopped',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  PAUSED: 'paused',
  INVALID: 'invalid'
};

const MAX_STEPS = 100000;

const clone = (value) => JSON.parse(JSON.stringify(value));

const sleepUntilDone = (milliseconds, signal) =>
  new Promise((resolve, reject) => {
    let timer = null;
    const onAbort = () => {
      clearTimeout(timer);
      reject(new FlowCancelled('The run was stopped'));
    };
    timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, milliseconds);
    signal?.addEventListener('abort', onAbort, { once: true });
  });

const createState = (flow) => {
  const state = { variables: {}, outputs: {}, responses: {}, loops: [], lastRequestId: null };
  flow.nodes
    .filter((node) => node.type === 'list')
    .forEach((node) => {
      state.outputs[node.id] = { items: [], length: 0 };
      if (node.config?.name) {
        state.variables[node.config.name] = [];
      }
    });
  return state;
};

// Finds the step after a node's port. Reaching the end of a branch inside a Repeat, or its end of
// iteration input, starts the next iteration; when the iterations run out the flow leaves through "exit".
const createStepResolver = (flow, state, onEvent) => (node, port) => {
  let edge = findNextEdge(flow, node, port);
  for (;;) {
    if (edge && edge.targetPort !== LOOPBACK_PORT) {
      return edge.target;
    }
    const frameIndex = edge ? state.loops.map((loop) => loop.nodeId).lastIndexOf(edge.target) : state.loops.length - 1;
    if (frameIndex < 0) {
      if (edge) {
        throw new Error('This end of iteration belongs to a Repeat that is not running');
      }
      return null;
    }
    state.loops.length = frameIndex + 1;
    const frame = state.loops[frameIndex];
    const repeatNode = flow.nodes.find((candidate) => candidate.id === frame.nodeId);
    if (frame.index < frame.times) {
      frame.index += 1;
      state.outputs[frame.nodeId] = { index: frame.index };
      onEvent({ type: 'iteration', nodeId: frame.nodeId, index: frame.index, times: frame.times });
      edge = findNextEdge(flow, repeatNode, 'body');
    } else {
      state.loops.pop();
      edge = findNextEdge(flow, repeatNode, 'exit');
    }
  }
};

// Runs a flow step by step. It knows nothing about the app: requests go through host.sendRequest. Runs
// that fail, are cancelled or pause return a snapshot that can be passed back as options.resume to go on
// from that step. With options.step the run pauses after each step.
export const runFlow = async (flow, host, { onEvent = () => {}, signal, environment = {}, startNodeId, resume, step = false } = {}) => {
  const issues = validateFlow(flow, { startNodeId: resume?.nodeId || startNodeId });
  if (issues.length) {
    return { status: RUN_STATUS.INVALID, issues };
  }

  const state = resume ? clone(resume.state) : createState(flow);
  const nextStep = createStepResolver(flow, state, onEvent);
  const sleep = host.sleep || sleepUntilDone;
  let nodeId = resume?.nodeId || startNodeId || findStartNode(flow).id;

  const interrupted = (status, error) => ({ status, nodeId, ...(error ? { error } : {}), resume: { nodeId, state: clone(state) } });

  for (let steps = 0; nodeId; steps += 1) {
    if (signal?.aborted) {
      return interrupted(RUN_STATUS.CANCELLED);
    }
    if (steps >= MAX_STEPS) {
      return interrupted(RUN_STATUS.FAILED, 'The run took too many steps');
    }

    const currentId = nodeId;
    const node = flow.nodes.find((candidate) => candidate.id === currentId);
    onEvent({ type: 'node-started', nodeId, nodeType: node.type, name: node.name });

    const runnable = { ...node, config: node.config || {} };
    const warn = (message) => onEvent({ type: 'warning', nodeId: currentId, message });
    try {
      const outcome = await NODE_DEFINITIONS[node.type].execute({ node: runnable, flow, state, host, signal, sleep, warn, ...createInputReaders({ node: runnable, flow, state, environment }) });
      onEvent({ type: 'node-finished', nodeId, port: outcome.port, detail: outcome.detail });
      if (outcome.stop) {
        return { status: RUN_STATUS.STOPPED, nodeId };
      }
      nodeId = nextStep(node, outcome.port);
      if (step && nodeId && node.type !== 'start') {
        return interrupted(RUN_STATUS.PAUSED);
      }
    } catch (err) {
      if (err instanceof FlowCancelled) {
        return interrupted(RUN_STATUS.CANCELLED);
      }
      onEvent({ type: 'node-failed', nodeId, error: err.message });
      return interrupted(RUN_STATUS.FAILED, err.message);
    }
  }

  return { status: RUN_STATUS.COMPLETED };
};
