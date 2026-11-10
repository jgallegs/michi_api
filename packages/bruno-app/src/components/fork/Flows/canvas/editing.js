import { uuid } from 'utils/common';
import { FIELD_PORT_PREFIX, LIST_PORT, LOOPBACK_PORT, STATUS_PORT, fieldPort, isValueTargetPort, valuePort } from '../engine/nodes';
import { PORT_KIND } from './pieces';

export const GRID = 10;

export const snap = (value) => Math.round(value / GRID) * GRID;

const DEFAULT_CONFIG = {
  if: { check: 'success' },
  repeat: { times: '3' },
  wait: { seconds: '1' },
  listappend: { mode: 'value' }
};

export const createNode = (type, { x, y }, config) => ({
  id: uuid(),
  type,
  x: snap(x),
  y: snap(y),
  config: { ...DEFAULT_CONFIG[type], ...config }
});

const findNode = (flow, nodeId) => flow.nodes.find((node) => node.id === nodeId);

const mapNode = (flow, nodeId, change) => ({ ...flow, nodes: flow.nodes.map((node) => (node.id === nodeId ? change(node) : node)) });

export const addNode = (flow, node) => ({ ...flow, nodes: [...flow.nodes, node] });

// Start stays: a flow always has one.
export const removeNodes = (flow, nodeIds) => {
  const removed = new Set(flow.nodes.filter((node) => nodeIds.includes(node.id) && node.type !== 'start').map((node) => node.id));
  return {
    ...flow,
    nodes: flow.nodes.filter((node) => !removed.has(node.id)),
    edges: flow.edges.filter((edge) => !removed.has(edge.source) && !removed.has(edge.target))
  };
};

// Cables between two steps that move together keep their shape.
export const moveNodes = (flow, nodeIds, dx, dy) => ({
  ...flow,
  nodes: flow.nodes.map((node) => (nodeIds.includes(node.id) ? { ...node, x: snap(node.x + dx), y: snap(node.y + dy) } : node)),
  edges: flow.edges.map((edge) =>
    edge.bends && nodeIds.includes(edge.source) && nodeIds.includes(edge.target)
      ? { ...edge, bends: edge.bends.map((coordinate, index) => coordinate + (index % 2 === 0 ? dx : dy)) }
      : edge
  )
});

export const setNodePositions = (flow, positions) => ({
  ...flow,
  nodes: flow.nodes.map((node) => (positions[node.id] ? { ...node, x: snap(positions[node.id].x), y: snap(positions[node.id].y) } : node))
});

const setIn = (container, [key, ...rest], value) => {
  if (rest.length) {
    const child = container?.[key] ?? (typeof rest[0] === 'number' ? [] : {});
    const next = setIn(child, rest, value);
    return Array.isArray(container) ? container.map((item, index) => (index === key ? next : item)) : { ...container, [key]: next };
  }
  if (Array.isArray(container)) {
    return container.map((item, index) => (index === key ? value : item));
  }
  return { ...container, [key]: value };
};

export const updateNodeConfig = (flow, nodeId, path, value) =>
  mapNode(flow, nodeId, (node) => ({ ...node, config: setIn(node.config || {}, path, value) }));

export const toggleSection = (flow, nodeId, key) =>
  mapNode(flow, nodeId, (node) => ({ ...node, collapsed: { ...node.collapsed, [key]: !node.collapsed?.[key] } }));

export const sourceKind = (node, port) => {
  if (port === STATUS_PORT || String(port).startsWith(FIELD_PORT_PREFIX)) {
    return node.type === 'list' && port === fieldPort('items') ? PORT_KIND.LIST : PORT_KIND.VALUE;
  }
  return PORT_KIND.ORDER;
};

export const targetKind = (port) => {
  if (port === LIST_PORT) {
    return PORT_KIND.LIST;
  }
  return isValueTargetPort(port) ? PORT_KIND.VALUE : PORT_KIND.ORDER;
};

// A list can be read like any other value; only a list fits the list input of "Add to list".
const kindsFit = (from, to) => from === to || (from === PORT_KIND.LIST && to === PORT_KIND.VALUE);

export const canConnect = (flow, source, target) => {
  const sourceNode = findNode(flow, source.nodeId);
  const targetNode = findNode(flow, target.nodeId);
  if (!sourceNode || !targetNode || sourceNode.id === targetNode.id || targetNode.type === 'start') {
    return false;
  }
  if (target.port === LOOPBACK_PORT && targetNode.type !== 'repeat') {
    return false;
  }
  return kindsFit(sourceKind(sourceNode, source.port), targetKind(target.port));
};

// An input that takes a value holds one cable, and an order output leads to one step, so a new cable
// replaces the one that was there.
export const connect = (flow, source, target) => {
  if (!canConnect(flow, source, target)) {
    return flow;
  }
  const leadsToOneStep = sourceKind(findNode(flow, source.nodeId), source.port) === PORT_KIND.ORDER;
  const holdsOneCable = targetKind(target.port) !== PORT_KIND.ORDER;
  const kept = flow.edges.filter((edge) => {
    const sameOutput = edge.source === source.nodeId && edge.sourcePort === source.port;
    const sameInput = edge.target === target.nodeId && edge.targetPort === target.port;
    return !((sameOutput && sameInput) || (leadsToOneStep && sameOutput) || (holdsOneCable && sameInput));
  });
  return {
    ...flow,
    edges: [...kept, { id: uuid(), source: source.nodeId, sourcePort: source.port, target: target.nodeId, targetPort: target.port }]
  };
};

export const removeEdges = (flow, edgeIds) => ({ ...flow, edges: flow.edges.filter((edge) => !edgeIds.includes(edge.id)) });

export const setEdgeBends = (flow, edgeId, bends) => ({
  ...flow,
  edges: flow.edges.map((edge) => {
    if (edge.id !== edgeId) {
      return edge;
    }
    const rest = { ...edge };
    delete rest.bends;
    return bends && bends.length ? { ...rest, bends } : rest;
  })
});

const removePortCables = (flow, nodeId, side, port) => ({
  ...flow,
  edges: flow.edges.filter((edge) => !(edge[side] === nodeId && edge[`${side}Port`] === port))
});

export const addRequestField = (flow, nodeId, path) =>
  mapNode(flow, nodeId, (node) => {
    const fields = node.config?.fields || [];
    return fields.includes(path) ? node : { ...node, config: { ...node.config, fields: [...fields, path] } };
  });

export const removeRequestField = (flow, nodeId, path) =>
  mapNode(removePortCables(flow, nodeId, 'source', fieldPort(path)), nodeId, (node) => ({
    ...node,
    config: { ...node.config, fields: (node.config?.fields || []).filter((field) => field !== path) }
  }));

export const addListField = (flow, nodeId) =>
  mapNode(flow, nodeId, (node) => ({
    ...node,
    config: { ...node.config, fields: [...(node.config?.fields || []), { id: uuid(), key: '', value: '' }] }
  }));

export const removeListField = (flow, nodeId, index) => {
  const field = findNode(flow, nodeId)?.config?.fields?.[index];
  if (!field) {
    return flow;
  }
  return mapNode(removePortCables(flow, nodeId, 'target', valuePort(field.id)), nodeId, (node) => ({
    ...node,
    config: { ...node.config, fields: node.config.fields.filter((item) => item.id !== field.id) }
  }));
};

// The steps to copy with the cables that join them to each other. Start is never copied.
export const copyNodes = (flow, nodeIds) => {
  const nodes = flow.nodes.filter((node) => nodeIds.includes(node.id) && node.type !== 'start');
  const ids = new Set(nodes.map((node) => node.id));
  return JSON.parse(JSON.stringify({ nodes, edges: flow.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)) }));
};

export const pasteNodes = (flow, copied, offset = { x: 40, y: 40 }) => {
  const newIds = new Map(copied.nodes.map((node) => [node.id, uuid()]));
  const nodes = copied.nodes.map((node) => ({ ...node, id: newIds.get(node.id), x: node.x + offset.x, y: node.y + offset.y }));
  const edges = copied.edges.map(({ bends, ...edge }) => ({ ...edge, id: uuid(), source: newIds.get(edge.source), target: newIds.get(edge.target) }));
  return { flow: { ...flow, nodes: [...flow.nodes, ...nodes], edges: [...flow.edges, ...edges] }, newIds: nodes.map((node) => node.id) };
};

// The first port of a new step that fits the loose end of a cable, so dropping a cable on empty space
// and picking a step leaves both joined.
export const findFittingPort = (flow, description, node, loose) => {
  const candidates = description.ports.filter((port) => !port.hidden && port.side === (loose.side === 'right' ? 'left' : 'right'));
  const withNode = addNode(flow, node);
  return (
    candidates.find((port) =>
      loose.side === 'right'
        ? canConnect(withNode, { nodeId: loose.nodeId, port: loose.port }, { nodeId: node.id, port: port.port })
        : canConnect(withNode, { nodeId: node.id, port: port.port }, { nodeId: loose.nodeId, port: loose.port })
    ) || null
  );
};
