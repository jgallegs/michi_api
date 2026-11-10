import { IN_PORT, LIST_PORT, LOOPBACK_PORT, NODE_DEFINITIONS, OUT_PORT, isValueTargetPort } from './nodes';

const definitionOf = (node) => NODE_DEFINITIONS[node.type];

const isDataOnly = (node) => Boolean(definitionOf(node)?.dataOnly);

const isOrderTarget = (port) => port === IN_PORT || port === LOOPBACK_PORT;

const indexFlow = (flow) => {
  const byId = new Map(flow.nodes.map((node) => [node.id, node]));
  const placed = new Set(flow.edges.filter((edge) => edge.targetPort === IN_PORT).map((edge) => edge.target));
  return { byId, placed };
};

// A cable that carries a value also says the target runs afterwards, unless the target already has its
// place in the order through its own input, or the source only holds data.
const isValueCableThatOrders = (edge, { byId, placed }) =>
  isValueTargetPort(edge.targetPort) && !placed.has(edge.target) && !isDataOnly(byId.get(edge.source));

const ordersTarget = (edge, index) => isOrderTarget(edge.targetPort) || isValueCableThatOrders(edge, index);

const reachableFrom = (flow, index, startIds, { throughLoopback = false } = {}) => {
  const seen = new Set();
  const pending = [...startIds];
  while (pending.length) {
    const current = pending.pop();
    flow.edges
      .filter((edge) => edge.source === current && ordersTarget(edge, index) && !seen.has(edge.target))
      .filter((edge) => throughLoopback || edge.targetPort !== LOOPBACK_PORT)
      .forEach((edge) => {
        seen.add(edge.target);
        pending.push(edge.target);
      });
  }
  return seen;
};

// A value often feeds several later steps (a token, for instance). The one that runs next is the one
// the others come after, so cables to steps that are reached anyway do not count as a way forward.
const withoutLaterSteps = (flow, index, edges) => {
  const targets = [...new Set(edges.map((edge) => edge.target))];
  const later = new Set(targets.flatMap((target) => [...reachableFrom(flow, index, [target])].filter((id) => id !== target)));
  return edges.filter((edge) => !later.has(edge.target));
};

const edgesLeaving = (flow, node, port, index = indexFlow(flow)) => {
  const leaving = flow.edges.filter((edge) => edge.source === node.id);
  const exact = leaving.filter((edge) => edge.sourcePort === port && isOrderTarget(edge.targetPort));
  // Only a step with a single way out can continue through its value cables; a branch must not take them.
  const continuesThroughValues = port === OUT_PORT && definitionOf(node).outputs.length === 1;
  if (exact.length || !continuesThroughValues) {
    return exact;
  }
  return withoutLaterSteps(flow, index, leaving.filter((edge) => isValueCableThatOrders(edge, index)));
};

export const findNextEdge = (flow, node, port) => edgesLeaving(flow, node, port)[0] || null;

export const findStartNode = (flow) => flow.nodes.find((node) => node.type === 'start') || null;

// The steps a run can get to. The rest stay on the canvas without taking part.
export const findReachedNodeIds = (flow, originId = findStartNode(flow)?.id) => {
  if (!originId) {
    return new Set();
  }
  return new Set([originId, ...reachableFrom(flow, indexFlow(flow), [originId], { throughLoopback: true })]);
};

// The steps a Repeat runs on every iteration: what hangs from "body" and is not what comes after "exit".
export const findLoopBody = (flow, repeatNode) => {
  const index = indexFlow(flow);
  const targetsOf = (port) => edgesLeaving(flow, repeatNode, port, index).filter((edge) => edge.targetPort !== LOOPBACK_PORT).map((edge) => edge.target);
  const reach = (startIds) => new Set([...startIds, ...reachableFrom(flow, index, startIds)]);
  const after = reach(targetsOf('exit'));
  return new Set([...reach(targetsOf('body'))].filter((id) => id !== repeatNode.id && !after.has(id)));
};

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
  if (target.type === 'start') {
    return [issue('invalid-start-cable', 'Nothing can go before Start', target.id)];
  }
  if (edge.targetPort === LOOPBACK_PORT && target.type !== 'repeat') {
    return [issue('invalid-loopback', 'Only a Repeat step has an end of iteration input', target.id)];
  }
  if (edge.targetPort === LIST_PORT && (target.type !== 'listappend' || source.type !== 'list')) {
    return [issue('invalid-list-cable', 'Only a List can be connected to the list input', target.id)];
  }
  return [];
};

const validateNextSteps = (flow, node, index) =>
  definitionOf(node).outputs
    .filter((port) => new Set(edgesLeaving(flow, node, port, index).map((edge) => edge.target)).size > 1)
    .map(() => issue('several-next-steps', 'This step continues to several steps; connect one output to say which goes next', node.id));

const findCycleNode = (flow, index, originId) => {
  const VISITING = 1;
  const DONE = 2;
  const marks = new Map();
  const visit = (node) => {
    marks.set(node.id, VISITING);
    const targets = definitionOf(node).outputs.flatMap((port) =>
      edgesLeaving(flow, node, port, index).filter((edge) => edge.targetPort !== LOOPBACK_PORT).map((edge) => edge.target)
    );
    for (const targetId of targets) {
      if (marks.get(targetId) === VISITING) {
        return targetId;
      }
      if (!marks.has(targetId)) {
        const found = visit(index.byId.get(targetId));
        if (found) {
          return found;
        }
      }
    }
    marks.set(node.id, DONE);
    return null;
  };
  return visit(index.byId.get(originId));
};

const validateOrigin = (flow, startNodeId, byId) => {
  if (startNodeId) {
    return byId.has(startNodeId) ? [] : [issue('unknown-start', 'The step to continue from no longer exists')];
  }
  const starts = flow.nodes.filter((node) => node.type === 'start');
  if (starts.length === 0) {
    return [issue('no-start', 'This flow has no Start')];
  }
  return starts.slice(1).map((node) => issue('several-starts', 'A flow has only one Start; remove this one', node.id));
};

// Only the steps a run can get to are checked, so spare steps left on the canvas never block a run.
export const validateFlow = (flow, { startNodeId } = {}) => {
  const unknown = flow.nodes.filter((node) => !definitionOf(node)).map((node) => issue('unknown-step', `Unknown kind of step: ${node.type}`, node.id));
  if (unknown.length) {
    return unknown;
  }
  const index = indexFlow(flow);
  const structureIssues = [...flow.edges.flatMap((edge) => validateEdge(edge, index.byId)), ...validateOrigin(flow, startNodeId, index.byId)];
  if (structureIssues.length) {
    return structureIssues;
  }
  const originId = startNodeId || findStartNode(flow).id;
  const reachedIds = findReachedNodeIds(flow, originId);
  const reached = flow.nodes.filter((node) => reachedIds.has(node.id));
  if (!startNodeId && reached.length === 1) {
    return [issue('start-not-connected', 'Connect Start to the first step', originId)];
  }
  const nodeIssues = reached.flatMap((node) => [...validateNode(flow, node), ...validateNextSteps(flow, node, index)]);
  const cycleNodeId = findCycleNode(flow, index, originId);
  return cycleNodeId
    ? [...nodeIssues, issue('cycle', 'These steps form a loop; use a Repeat step and its end of iteration input', cycleNodeId)]
    : nodeIssues;
};
