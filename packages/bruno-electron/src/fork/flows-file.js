const { ipcMain, BrowserWindow } = require('electron');
const { isCollectionRoot, assertCollectionRoot, readSettings, writeSettings } = require('./collection-settings-file');
const { CHANGED_CHANNEL, watchCollection } = require('./flows-watch');

// Flows live under the "flows" key of .michi.json, one entry per flow id, so they travel with the
// collection and stay invisible to upstream Bruno. Keys are written sorted to keep git diffs stable.
// The blocks a team keeps to build flows faster (a few steps already joined) are stored the same way
// under "flowBlocks": a block is a graph with a name, like a flow without a Start.
const FLOW_VERSION = 1;
const FLOW_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
// Same limit as MAX_FLOW_NAME_LENGTH in the renderer (components/fork/Flows/model.js): both must stay in sync.
const MAX_FLOW_NAME_LENGTH = 120;
const MAX_FLOW_BYTES = 2 * 1024 * 1024;

const FLOWS = { key: 'flows', what: 'flow', label: 'Flow', stored: 'flows' };
const BLOCKS = { key: 'flowBlocks', what: 'block', label: 'Block', stored: 'blocks' };

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const validateGraph = (graph, { what, label }) => {
  if (!isPlainObject(graph)) {
    throw new Error(`Invalid ${what}`);
  }
  if (typeof graph.id !== 'string' || !FLOW_ID_PATTERN.test(graph.id)) {
    throw new Error(`Invalid ${what} id`);
  }
  if (typeof graph.name !== 'string' || !graph.name.trim() || graph.name.trim().length > MAX_FLOW_NAME_LENGTH) {
    throw new Error(`Invalid ${what} name`);
  }
  if (graph.version !== FLOW_VERSION) {
    throw new Error(`Unsupported ${what} version: ${graph.version}`);
  }
  if (graph.folder !== undefined && typeof graph.folder !== 'string') {
    throw new Error(`Invalid ${what} folder`);
  }
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    throw new Error(`Invalid ${what} graph`);
  }
  if (Buffer.byteLength(JSON.stringify(graph), 'utf8') > MAX_FLOW_BYTES) {
    throw new Error(`${label} is too large`);
  }
};

const readMap = (collectionPath, { key, stored }) => {
  const value = readSettings(collectionPath)[key];
  if (value === undefined) {
    return {};
  }
  if (!isPlainObject(value)) {
    throw new Error(`The ${stored} stored in .michi.json are not valid`);
  }
  return value;
};

const sortedMap = (entries) =>
  Object.keys(entries)
    .sort()
    .reduce((acc, id) => Object.assign(acc, { [id]: entries[id] }), {});

const list = (collectionPath, kind) => {
  if (!isCollectionRoot(collectionPath)) {
    return [];
  }
  return Object.entries(readMap(collectionPath, kind))
    .filter(([id, entry]) => isPlainObject(entry) && entry.id === id)
    .map(([, entry]) => entry);
};

const save = (collectionPath, graph, kind) => {
  assertCollectionRoot(collectionPath);
  validateGraph(graph, kind);

  const settings = readSettings(collectionPath);
  writeSettings(collectionPath, { ...settings, [kind.key]: sortedMap({ ...readMap(collectionPath, kind), [graph.id]: graph }) });
  return graph;
};

const remove = (collectionPath, id, kind) => {
  assertCollectionRoot(collectionPath);
  if (typeof id !== 'string' || !FLOW_ID_PATTERN.test(id)) {
    throw new Error(`Invalid ${kind.what} id`);
  }

  const settings = readSettings(collectionPath);
  const entries = { ...readMap(collectionPath, kind) };
  delete entries[id];

  const next = { ...settings, [kind.key]: sortedMap(entries) };
  if (!Object.keys(next[kind.key]).length) {
    delete next[kind.key];
  }
  writeSettings(collectionPath, next);
};

const listFlows = (collectionPath) => list(collectionPath, FLOWS);
const saveFlow = (collectionPath, flow) => save(collectionPath, flow, FLOWS);
const deleteFlow = (collectionPath, flowId) => remove(collectionPath, flowId, FLOWS);

const listBlocks = (collectionPath) => list(collectionPath, BLOCKS);
const saveBlock = (collectionPath, block) => save(collectionPath, block, BLOCKS);
const deleteBlock = (collectionPath, blockId) => remove(collectionPath, blockId, BLOCKS);

const tellWindows = (collectionPath) => {
  BrowserWindow.getAllWindows()
    .filter((win) => !win.isDestroyed())
    .forEach((win) => win.webContents.send(CHANGED_CHANNEL, { collectionPath }));
};

// Asking for the flows or the blocks of a collection is what starts the watch on its file.
const watched = (read) => (_event, collectionPath) => {
  watchCollection(collectionPath, tellWindows);
  return read(collectionPath);
};

const register = () => {
  ipcMain.handle('fork:flows:list', watched(listFlows));
  ipcMain.handle('fork:flows:save', (_event, collectionPath, flow) => saveFlow(collectionPath, flow));
  ipcMain.handle('fork:flows:delete', (_event, collectionPath, flowId) => deleteFlow(collectionPath, flowId));
  ipcMain.handle('fork:flows:blocks:list', watched(listBlocks));
  ipcMain.handle('fork:flows:blocks:save', (_event, collectionPath, block) => saveBlock(collectionPath, block));
  ipcMain.handle('fork:flows:blocks:delete', (_event, collectionPath, blockId) => deleteBlock(collectionPath, blockId));
};

module.exports = { FLOW_VERSION, listFlows, saveFlow, deleteFlow, listBlocks, saveBlock, deleteBlock, register };
