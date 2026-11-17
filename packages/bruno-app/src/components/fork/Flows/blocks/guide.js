import { useSyncExternalStore } from 'react';
import { isValueTargetPort, valuePort } from '../engine/nodes';

// The short guide a ready-made block opens: what is left to fill in, in order. It lives while the app is
// open, one per flow, and each point ticks itself off when the canvas shows it is done.
const guides = new Map();
const listeners = new Set();

const emit = () => listeners.forEach((listener) => listener());

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const patch = (flowId, change) => {
  const guide = guides.get(flowId);
  if (guide) {
    guides.set(flowId, { ...guide, ...change(guide) });
    emit();
  }
};

export const startGuide = (flowId, { title, translate, points }) => {
  guides.set(flowId, { title, translate, points, ticked: [], ran: false });
  emit();
};

// A point can also be ticked, and unticked, by hand.
export const tickGuidePoint = (flowId, pointId) =>
  patch(flowId, ({ ticked }) => ({ ticked: ticked.includes(pointId) ? ticked.filter((id) => id !== pointId) : [...ticked, pointId] }));

export const noteGuideRun = (flowId) => {
  if (guides.get(flowId) && !guides.get(flowId).ran) {
    patch(flowId, () => ({ ran: true }));
  }
};

export const closeGuide = (flowId) => {
  if (guides.delete(flowId)) {
    emit();
  }
};

export const useGuide = (flowId) => useSyncExternalStore(subscribe, () => guides.get(flowId) || null);

const hasCable = (flow, node, port) => flow.edges.some((edge) => edge.target === node.id && edge.targetPort === port);

const isFilled = (value) => value !== undefined && value !== null && String(value).trim() !== '';

// How the canvas tells that a point is done. "input:left" and "output:yes" carry the name of the port.
const CHECKS = {
  request: (flow, node) => Boolean(node.config?.pathname),
  value: (flow, node) =>
    flow.edges.some((edge) => edge.target === node.id && isValueTargetPort(edge.targetPort)) || Object.values(node.config?.variables || {}).some(isFilled),
  list: (flow, node) => hasCable(flow, node, valuePort('list')),
  input: (flow, node, key) => hasCable(flow, node, valuePort(key)) || isFilled(node.config?.[key]),
  output: (flow, node, port) => flow.edges.some((edge) => edge.source === node.id && edge.sourcePort === port)
};

const isDone = (point, node, flow, guide) => {
  if (guide.ticked.includes(point.id)) {
    return true;
  }
  if (point.check === 'run') {
    return guide.ran;
  }
  const [kind, argument] = String(point.check).split(':');
  return Boolean(node && CHECKS[kind]?.(flow, node, argument));
};

// The guide as it stands on a flow: each point with its number, whether it is done, and which one comes
// next. Points about a step that is no longer on the canvas are left out.
export const readGuide = (guide, flow) => {
  if (!guide) {
    return null;
  }
  const byId = new Map(flow.nodes.map((node) => [node.id, node]));
  const points = guide.points
    .filter((point) => !point.nodeId || byId.has(point.nodeId))
    .map((point, index) => ({ ...point, number: index + 1, done: isDone(point, byId.get(point.nodeId), flow, guide) }));
  const next = points.find((point) => !point.done) || null;
  return { title: guide.title, translate: guide.translate, finished: !next, points: points.map((point) => ({ ...point, current: point === next })) };
};

// Only for tests.
export const resetGuides = () => {
  guides.clear();
  emit();
};
