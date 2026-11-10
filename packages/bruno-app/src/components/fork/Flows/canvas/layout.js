import { findNextEdge, findStartNode } from '../engine/graph';
import { LIST_PORT, LOOPBACK_PORT, NODE_DEFINITIONS } from '../engine/nodes';
import { snap } from './editing';
import { PIECE_WIDTH } from './pieces';

export const GAP = 20;
const COLUMN_GAP = 100;
const ROW_GAP = 40;
const ORIGIN = { x: 80, y: 80 };

const overlaps = (a, b) =>
  a.x < b.x + b.width + GAP && b.x < a.x + a.width + GAP && a.y < b.y + b.height + GAP && b.y < a.y + a.height + GAP;

const nearestFreeSpot = (box, placed) => {
  let current = box;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const blockers = placed.filter((other) => overlaps(current, other));
    if (!blockers.length) {
      return current;
    }
    const candidates = blockers.flatMap((blocker) => [
      { ...current, x: blocker.x + blocker.width + GAP },
      { ...current, x: blocker.x - current.width - GAP },
      { ...current, y: blocker.y + blocker.height + GAP },
      { ...current, y: blocker.y - current.height - GAP }
    ]);
    const distance = (candidate) => Math.hypot(candidate.x - box.x, candidate.y - box.y);
    const free = candidates.filter((candidate) => !placed.some((other) => overlaps(candidate, other)));
    // With no free spot next to the blockers, move below the lowest one and look again from there.
    current = free.length
      ? free.sort((a, b) => distance(a) - distance(b))[0]
      : { ...current, y: Math.max(...blockers.map((blocker) => blocker.y + blocker.height)) + GAP };
  }
  return current;
};

// Moves the loose boxes the least they need so that no two boxes overlap; the others stay where they are.
// Returns the new position of each box that had to move.
export const settle = (boxes, looseIds) => {
  const placed = boxes.filter((box) => !looseIds.includes(box.id));
  const moved = {};
  boxes
    .filter((box) => looseIds.includes(box.id))
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .forEach((box) => {
      const spot = nearestFreeSpot(box, placed);
      placed.push(spot);
      if (spot.x !== box.x || spot.y !== box.y) {
        moved[box.id] = { x: snap(spot.x), y: snap(spot.y) };
      }
    });
  return moved;
};

const nextSteps = (flow, node) =>
  NODE_DEFINITIONS[node.type].outputs
    .map((port) => findNextEdge(flow, node, port))
    .filter((edge) => edge && edge.targetPort !== LOOPBACK_PORT)
    .map((edge) => edge.target);

// Column of each step: one more than the furthest step that leads to it.
const assignColumns = (flow) => {
  const byId = new Map(flow.nodes.map((node) => [node.id, node]));
  const columns = new Map();
  const visit = (nodeId, column, trail) => {
    if (trail.has(nodeId) || (columns.get(nodeId) ?? -1) >= column) {
      return;
    }
    columns.set(nodeId, column);
    nextSteps(flow, byId.get(nodeId)).forEach((targetId) => visit(targetId, column + 1, new Set([...trail, nodeId])));
  };
  const start = findStartNode(flow);
  if (start) {
    visit(start.id, 0, new Set());
  }
  return columns;
};

// Puts the steps in columns following the order of the flow, each list under the step that fills it and
// the steps that are not connected in a row at the bottom.
export const tidy = (flow, heightOf) => {
  const columns = assignColumns(flow);
  const known = flow.nodes.filter((node) => NODE_DEFINITIONS[node.type]);
  const positions = {};
  const bottoms = new Map();
  const place = (node, column) => {
    const y = bottoms.get(column) ?? ORIGIN.y;
    positions[node.id] = { x: ORIGIN.x + column * (PIECE_WIDTH + COLUMN_GAP), y };
    bottoms.set(column, y + heightOf(node) + ROW_GAP);
  };

  [...columns.entries()].sort((a, b) => a[1] - b[1]).forEach(([nodeId, column]) => place(known.find((node) => node.id === nodeId), column));

  known
    .filter((node) => node.type === 'list')
    .forEach((list) => {
      const filler = flow.edges.find((edge) => edge.source === list.id && edge.targetPort === LIST_PORT && columns.has(edge.target));
      if (filler) {
        place(list, columns.get(filler.target));
      }
    });

  const spareTop = Math.max(ORIGIN.y, ...bottoms.values()) + ROW_GAP;
  known
    .filter((node) => !positions[node.id])
    .forEach((node, index) => {
      positions[node.id] = { x: ORIGIN.x + index * (PIECE_WIDTH + GAP * 2), y: spareTop };
    });

  return {
    ...flow,
    nodes: flow.nodes.map((node) => (positions[node.id] ? { ...node, ...positions[node.id] } : node)),
    edges: flow.edges.map(({ bends, ...edge }) => edge)
  };
};
