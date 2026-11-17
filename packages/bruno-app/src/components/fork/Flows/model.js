import { uuid } from 'utils/common';

// A flow is a graph of nodes joined by edges, stored as plain JSON in the collection's .michi.json.
// The version lets a later editor migrate flows saved by an older one.
export const FLOW_VERSION = 1;
// Same limit as validateFlow in packages/bruno-electron/src/fork/flows-file.js: both must stay in sync.
export const MAX_FLOW_NAME_LENGTH = 120;

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

// Folders are a path-like label ("Shipments/Warehouse"); separators and blank segments are normalised
// so the same folder is never listed twice because of a trailing slash or a stray space.
export const normalizeFolder = (folder) =>
  String(folder || '')
    .split(/[\\/]/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('/');

export const isValidFlowName = (name) =>
  typeof name === 'string' && name.trim().length > 0 && name.trim().length <= MAX_FLOW_NAME_LENGTH;

// Ids only have to be unique inside a flow, and a fixed one keeps a flow read twice identical.
const createStartNode = () => ({ id: 'start', type: 'start', x: 80, y: 120, config: {} });

// Every flow has the step it starts from; flows saved before it existed get one when they are read.
const withStartNode = (nodes) => (nodes.some((node) => node?.type === 'start') ? nodes : [createStartNode(), ...nodes]);

export const createFlow = ({ name, folder }) => ({
  id: uuid(),
  version: FLOW_VERSION,
  name: name.trim(),
  folder: normalizeFolder(folder),
  nodes: withStartNode([]),
  edges: []
});

// Returns a flow with every expected field in place, or null when the stored value is unusable.
export const normalizeFlow = (raw) => {
  if (!isPlainObject(raw) || typeof raw.id !== 'string' || !isValidFlowName(raw.name)) {
    return null;
  }
  if (raw.version !== FLOW_VERSION) {
    return null;
  }
  return {
    ...raw,
    name: raw.name.trim(),
    folder: normalizeFolder(raw.folder),
    nodes: withStartNode(Array.isArray(raw.nodes) ? raw.nodes : []),
    edges: Array.isArray(raw.edges) ? raw.edges : []
  };
};

const compareText = (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' });

export const sortFlows = (flows) =>
  [...flows].sort((a, b) => compareText(a.folder, b.folder) || compareText(a.name, b.name));

// Groups flows by folder, root flows first, folders in alphabetical order.
export const groupFlowsByFolder = (flows) => {
  const groups = new Map();
  sortFlows(flows).forEach((flow) => {
    if (!groups.has(flow.folder)) {
      groups.set(flow.folder, []);
    }
    groups.get(flow.folder).push(flow);
  });
  return [...groups.entries()].map(([folder, items]) => ({ folder, flows: items }));
};

export const listFolders = (flows) => [...new Set(flows.map((flow) => flow.folder).filter(Boolean))].sort(compareText);

export const flowSignature = (flow) => JSON.stringify(flow);
