import { uuid } from 'utils/common';
import { IN_PORT } from '../engine/nodes';
import { FLOW_VERSION } from '../model';
import { connect, copyNodes, createNode, pasteNodes, snap, sourceKind } from '../canvas/editing';
import { PIECES, PIECE_WIDTH, PORT_KIND } from '../canvas/pieces';

// Room between the steps of a ready-made block: a step and the cable that leaves it, and the tallest step.
export const COLUMN = PIECE_WIDTH + 100;
export const ROW = 200;

// A ready-made block as the steps and cables to add, with their ids already given. "say" puts the
// messages that end up inside the steps in the language of the interface.
export const buildReadyBlock = (block, say = (text) => text) => {
  const nodes = block.steps.map(({ type, column, row, config }) =>
    createNode(type, { x: column * COLUMN, y: row * ROW }, config?.message ? { ...config, message: say(config.message) } : config)
  );
  const idOf = Object.fromEntries(block.steps.map((item, index) => [item.key, nodes[index].id]));
  const joined = block.cables.reduce(
    (graph, [from, fromPort, to, toPort]) => connect(graph, { nodeId: idOf[from], port: fromPort }, { nodeId: idOf[to], port: toPort }),
    { nodes, edges: [] }
  );
  return {
    title: block.title,
    translate: true,
    nodes,
    edges: joined.edges,
    entryId: nodes[0].id,
    guide: block.guide.map((point, index) => ({ id: `${block.id}:${index}`, nodeId: point.step ? idOf[point.step] : null, text: point.text, check: point.check }))
  };
};

// The step a cable arrives at: the leftmost one that can take it and that no step of the block leads to.
const findEntry = (nodes, edges) => {
  const entered = new Set(edges.filter((edge) => edge.targetPort === IN_PORT).map((edge) => edge.target));
  const [entry] = nodes.filter((node) => PIECES[node.type]?.headerIn && !entered.has(node.id)).sort((a, b) => a.x - b.x || a.y - b.y);
  return entry?.id || null;
};

// A block someone saved, as fresh copies of its steps and cables.
export const buildOwnBlock = (block) => {
  const { flow } = pasteNodes({ nodes: [], edges: [] }, block, { x: 0, y: 0 });
  return { title: block.name, translate: false, nodes: flow.nodes, edges: flow.edges, entryId: findEntry(flow.nodes, flow.edges), guide: [] };
};

// Whether a block can hang from the loose end of a cable: only from an output that says what runs next.
export const canFollow = (flow, loose) => {
  const node = flow.nodes.find((candidate) => candidate.id === loose.nodeId);
  return Boolean(node) && loose.side === 'right' && sourceKind(node, loose.port) === PORT_KIND.ORDER;
};

// Adds a built block with its first step at "origin" and, when "from" is given, joined to that output.
export const insertBlock = (flow, built, origin, from) => {
  const anchor = built.nodes.find((node) => node.id === built.entryId) || { x: Math.min(...built.nodes.map((node) => node.x)), y: Math.min(...built.nodes.map((node) => node.y)) };
  const nodes = built.nodes.map((node) => ({ ...node, x: snap(node.x - anchor.x + origin.x), y: snap(node.y - anchor.y + origin.y) }));
  const added = { ...flow, nodes: [...flow.nodes, ...nodes], edges: [...flow.edges, ...built.edges] };
  return from && built.entryId ? connect(added, from, { nodeId: built.entryId, port: IN_PORT }) : added;
};

// The selected steps as a block to keep: the cables between them come along, Start never does.
export const makeOwnBlock = (flow, nodeIds, name) => {
  const copied = copyNodes(flow, nodeIds);
  if (!copied.nodes.length) {
    return null;
  }
  const left = Math.min(...copied.nodes.map((node) => node.x));
  const top = Math.min(...copied.nodes.map((node) => node.y));
  return {
    id: uuid(),
    version: FLOW_VERSION,
    name: name.trim(),
    nodes: copied.nodes.map((node) => ({ ...node, x: node.x - left, y: node.y - top })),
    edges: copied.edges.map(({ bends, ...edge }) => edge)
  };
};

// The kinds of step of a block, in order, to draw it small on its card.
export const stepTypesOf = (block) => (block.steps || block.nodes || []).map((item) => item.type);
