import { getFlow, updateFlowDraft } from '../store';

// Undo and redo of the steps and cables of each flow, kept while the app is open. Name and folder are
// changed from the sidebar and are not part of it.
const MAX_STEPS = 100;
const MERGE_WINDOW_MS = 1500;

const stacks = new Map();

const stackOf = (flowId) => {
  if (!stacks.has(flowId)) {
    stacks.set(flowId, { past: [], future: [], mergeKey: null, mergedAt: 0 });
  }
  return stacks.get(flowId);
};

const graphOf = (flow) => ({ nodes: flow.nodes, edges: flow.edges });

// Applies a change to the draft of a flow. Changes with the same mergeKey made in quick succession (the
// letters typed in one box) undo as one.
export const editFlow = (collectionPath, flowId, change, { mergeKey = null, now = Date.now() } = {}) => {
  const before = getFlow(collectionPath, flowId);
  if (!before) {
    return;
  }
  const after = change(before);
  if (after === before) {
    return;
  }
  const stack = stackOf(flowId);
  const merges = mergeKey && stack.mergeKey === mergeKey && now - stack.mergedAt < MERGE_WINDOW_MS;
  if (!merges) {
    stack.past = [...stack.past, graphOf(before)].slice(-MAX_STEPS);
  }
  stack.future = [];
  stack.mergeKey = mergeKey;
  stack.mergedAt = now;
  updateFlowDraft(collectionPath, flowId, () => after);
};

const travel = (collectionPath, flowId, from, to) => {
  const stack = stackOf(flowId);
  const current = getFlow(collectionPath, flowId);
  if (!current || !stack[from].length) {
    return;
  }
  const target = stack[from][stack[from].length - 1];
  stack[from] = stack[from].slice(0, -1);
  stack[to] = [...stack[to], graphOf(current)];
  stack.mergeKey = null;
  updateFlowDraft(collectionPath, flowId, (flow) => ({ ...flow, ...target }));
};

export const undo = (collectionPath, flowId) => travel(collectionPath, flowId, 'past', 'future');

export const redo = (collectionPath, flowId) => travel(collectionPath, flowId, 'future', 'past');

export const canUndo = (flowId) => stackOf(flowId).past.length > 0;

export const canRedo = (flowId) => stackOf(flowId).future.length > 0;

// Only for tests.
export const resetHistory = () => stacks.clear();
