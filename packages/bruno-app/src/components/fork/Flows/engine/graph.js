import { LIST_PORT, LOOPBACK_PORT, NODE_DEFINITIONS, OUT_PORT } from './nodes';

const nodesById = (flow) => new Map(flow.nodes.map((node) => [node.id, node]));

const isDataOnly = (node) => Boolean(NODE_DEFINITIONS[node.type]?.dataOnly);

const definitionOf = (node) => NODE_DEFINITIONS[node.type];

// Any cable into a node makes it run after its source, unless the source only holds data or the cable
// only says which list to write to.
const isDrivingEdge = (edge, byId) => edge.targetPort !== LIST_PORT && !isDataOnly(byId.get(edge.source));

const reachableFrom = (flow, byId, startId) => {
  const seen = new Set();
  const pending = [startId];
  while (pending.length) {
    const current = pending.pop();
    flow.edges
      .filter((edge) => edge.source === current && edge.targetPort !== LOOPBACK_PORT && isDrivingEdge(edge, byId) && !seen.has(edge.target))
      .forEach((edge) => {
        seen.add(edge.target);
        pending.push(edge.target);
      });
  }
  return seen;
};

// A value often feeds several later steps (a token, for instance). The one that runs next is the one
// the others come after, so cables to steps that are reached anyway do not count as a way forward.
const withoutLaterSteps = (flow, byId, edges) => {
  const targets = [...new Set(edges.map((edge) => edge.target))];
  const later = new Set(targets.flatMap((target) => [...reachableFrom(flow, byId, target)].filter((id) => id !== target)));
  return edges.filter((edge) => !later.has(edge.target));
};

const edgesLeaving = (flow, node, port) => {
  const byId = nodesById(flow);
  const driving = flow.edges.filter((edge) => edge.source === node.id && isDrivingEdge(edge, byId));
  const exact = driving.filter((edge) => edge.sourcePort === port);
  // Only a node with a single way out can continue through its value cables; a branch must not take them.
  const continuesThroughValues = port === OUT_PORT && definitionOf(node).outputs.length === 1;
  return exact.length || !continuesThroughValues ? exact : withoutLaterSteps(flow, byId, driving);
};

export const findNextEdge = (flow, node, port) => edgesLeaving(flow, node, port)[0] || null;

const findStartNodes = (flow) => {
  const byId = nodesById(flow);
  const driven = new Set(
    flow.edges.filter((edge) => isDrivingEdge(edge, byId) && edge.targetPort !== LOOPBACK_PORT).map((edge) => edge.target)
  );
  return flow.nodes.filter((node) => !isDataOnly(node) && !driven.has(node.id));
};

export const findStartNode = (flow) => findStartNodes(flow)[0] || null;

const issue = (code, message, nodeId) => ({ code, message, ...(nodeId ? { nodeId } : {}) });

const validateNode = (flow, node) => {
  if (node.type === 'request' && !node.config?.pathname) {
    return [issue('request-not-set', 'Choose the request this step sends', node.id)];
  }
  if (node.type === 'listappend' && !flow.edges.some((edge) => edge.target === node.id && edge.targetPort === LIST_PORT)) {
    return [issue('list-not-connected', 'Connect this step to the list it adds to', node.id)];
  }
  return [];
};

const validateEdge = (edge, byId) => {
  const source = byId.get(edge.source);
  const target = byId.get(edge.target);
  if (!source || !target) {
    return [issue('broken-cable', 'A cable points to a step that no longer exists')];
  }
  if (edge.targetPort === LOOPBACK_PORT && target.type !== 'repeat') {
    return [issue('invalid-loopback', 'Only a Repeat step has an end of iteration input', target.id)];
  }
  if (edge.targetPort === LIST_PORT && (target.type !== 'listappend' || source.type !== 'list')) {
    return [issue('invalid-list-cable', 'Only a List can be connected to the list input', target.id)];
  }
  return [];
};

const validateNextSteps = (flow, node) =>
  definitionOf(node).outputs
    .filter((port) => new Set(edgesLeaving(flow, node, port).map((edge) => edge.target)).size > 1)
    .map(() => issue('several-next-steps', 'This step continues to several steps; connect one output to say which goes next', node.id));

const findCycleNode = (flow) => {
  const DONE = 2;
  const VISITING = 1;
  const marks = new Map();
  const visit = (node) => {
    marks.set(node.id, VISITING);
    const targets = definitionOf(node).outputs.flatMap((port) =>
      edgesLeaving(flow, node, port).filter((edge) => edge.targetPort !== LOOPBACK_PORT).map((edge) => edge.target)
    );
    for (const targetId of targets) {
      if (marks.get(targetId) === VISITING) {
        return targetId;
      }
      if (!marks.has(targetId)) {
        const found = visit(flow.nodes.find((candidate) => candidate.id === targetId));
        if (found) {
          return found;
        }
      }
    }
    marks.set(node.id, DONE);
    return null;
  };
  for (const node of flow.nodes) {
    if (!marks.has(node.id) && !isDataOnly(node)) {
      const found = visit(node);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

const validateStart = (flow, startNodeId, byId) => {
  if (startNodeId) {
    return byId.has(startNodeId) ? [] : [issue('unknown-start', 'The step to start from no longer exists')];
  }
  const starts = findStartNodes(flow);
  if (starts.length === 0) {
    return [issue('no-start', 'No step can go first: every step has a cable coming in')];
  }
  return starts.length > 1 ? starts.map((node) => issue('several-starts', 'Several steps could go first; connect them or remove the extra ones', node.id)) : [];
};

export const validateFlow = (flow, { startNodeId } = {}) => {
  if (!flow.nodes.length) {
    return [issue('empty', 'This flow has no steps')];
  }
  const unknown = flow.nodes.filter((node) => !definitionOf(node)).map((node) => issue('unknown-step', `Unknown kind of step: ${node.type}`, node.id));
  if (unknown.length) {
    return unknown;
  }
  const byId = nodesById(flow);
  const edgeIssues = flow.edges.flatMap((edge) => validateEdge(edge, byId));
  if (edgeIssues.length) {
    return edgeIssues;
  }
  const nodeIssues = flow.nodes.flatMap((node) => [...validateNode(flow, node), ...validateNextSteps(flow, node)]);
  const cycleNodeId = findCycleNode(flow);
  const cycleIssues = cycleNodeId
    ? [issue('cycle', 'These steps form a loop; use a Repeat step and its end of iteration input', cycleNodeId)]
    : [];
  return [...nodeIssues, ...cycleIssues, ...validateStart(flow, startNodeId, byId)];
};
