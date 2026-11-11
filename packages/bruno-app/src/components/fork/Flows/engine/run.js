import { findNextEdge, findStartNode, validateFlow } from './graph';
import { FlowCancelled, LOOPBACK_PORT, NODE_DEFINITIONS, RUN_STATUS, createInputReaders, tableRows } from './nodes';

export { RUN_STATUS };

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
  flow.nodes
    .filter((node) => node.type === 'table')
    .forEach((node) => {
      const items = tableRows(node);
      state.outputs[node.id] = { items, length: items.length };
    });
  return state;
};

// What a loop hands out on the round it is on: its number and, when it goes through a list, the item.
const roundOutput = (frame) => (frame.items ? { index: frame.index, item: frame.items[frame.index - 1] } : { index: frame.index });

// Finds the step after a node's port. Reaching the end of a branch inside a loop, or its end of
// iteration input, starts the next iteration; when the iterations run out the flow leaves through "exit".
// "lenient" is for a run started from a step in the middle: a round that ends with no loop running is
// simply where that run ends.
const createStepResolver = (flow, state, onEvent, lenient) => {
  const follow = (first) => {
    let edge = first;
    for (;;) {
      if (edge && edge.targetPort !== LOOPBACK_PORT) {
        return edge.target;
      }
      const frameIndex = edge ? state.loops.map((loop) => loop.nodeId).lastIndexOf(edge.target) : state.loops.length - 1;
      if (frameIndex < 0) {
        if (edge && !lenient) {
          throw new Error('This end of round belongs to a loop that is not running');
        }
        return null;
      }
      state.loops.length = frameIndex + 1;
      const frame = state.loops[frameIndex];
      const loopNode = flow.nodes.find((candidate) => candidate.id === frame.nodeId);
      if (frame.index < frame.times) {
        frame.index += 1;
        state.outputs[frame.nodeId] = roundOutput(frame);
        onEvent({ type: 'iteration', nodeId: frame.nodeId, index: frame.index, times: frame.times });
        edge = findNextEdge(flow, loopNode, 'body');
      } else {
        state.loops.pop();
        edge = findNextEdge(flow, loopNode, 'exit');
      }
    }
  };
  return {
    after: (node, port) => follow(findNextEdge(flow, node, port)),
    // The innermost loop ends here, whatever rounds it had left.
    afterLeaving: () => {
      const frame = state.loops.pop();
      return follow(findNextEdge(flow, flow.nodes.find((candidate) => candidate.id === frame.nodeId), 'exit'));
    }
  };
};

// Runs a flow step by step. It knows nothing about the app: requests go through host.sendRequest. Runs
// that fail, are cancelled or pause return a snapshot that can be passed back as options.resume to go on
// from that step. With options.step the run pauses after each step, and options.stepDelay waits those
// milliseconds before each step so a run can be followed on screen. options.inputs are the answers to
// the questions of Start. options.from starts at a step in the middle with the state another run left
// (or none), which is how one step is tried without running everything before it. A run that ends
// returns the state it left.
export const runFlow = async (flow, host, { onEvent = () => {}, signal, environment = {}, startNodeId, resume, from, inputs, depth = 0, step = false, stepDelay = 0 } = {}) => {
  if (from) {
    const state = from.state ? { ...clone(from.state), loops: [] } : createState(flow);
    return runFlow(flow, host, { onEvent, signal, environment, inputs, depth, step, stepDelay, resume: { nodeId: from.nodeId, state, lenient: true } });
  }
  const issues = validateFlow(flow, { startNodeId: resume?.nodeId || startNodeId });
  if (issues.length) {
    return { status: RUN_STATUS.INVALID, issues };
  }

  const state = resume ? clone(resume.state) : createState(flow);
  const lenient = Boolean(resume?.lenient);
  const next = createStepResolver(flow, state, onEvent, lenient);
  // A flow run by a step of this one: same host and environment, its own state, and what happens in it
  // told as events of that step.
  const runInside = (inner, innerInputs, parentId) =>
    runFlow(inner, host, { signal, environment, inputs: innerInputs, depth: depth + 1, stepDelay, onEvent: (event) => onEvent({ type: 'inside', nodeId: parentId, flow: inner, event }) });
  const sleep = host.sleep || sleepUntilDone;
  let nodeId = resume?.nodeId || startNodeId || findStartNode(flow).id;

  const interrupted = (status, error) => ({ status, nodeId, ...(error ? { error } : {}), resume: { nodeId, state: clone(state), ...(lenient ? { lenient } : {}) } });

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
      if (stepDelay && node.type !== 'start') {
        await sleep(stepDelay, signal);
      }
      const outcome = await NODE_DEFINITIONS[node.type].execute({ node: runnable, flow, state, host, signal, sleep, warn, inputs, depth, runInside, ...createInputReaders({ node: runnable, flow, state, environment }) });
      onEvent({ type: 'node-finished', nodeId, port: outcome.port, detail: outcome.detail });
      if (outcome.stop) {
        return { status: RUN_STATUS.STOPPED, nodeId, state: clone(state) };
      }
      nodeId = outcome.leaveLoop ? next.afterLeaving() : next.after(node, outcome.port);
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

  return { status: RUN_STATUS.COMPLETED, state: clone(state) };
};
