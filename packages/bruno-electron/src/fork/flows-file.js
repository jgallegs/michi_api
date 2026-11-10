const { ipcMain } = require('electron');
const { isCollectionRoot, assertCollectionRoot, readSettings, writeSettings } = require('./collection-settings-file');

// Flows live under the "flows" key of .michi.json, one entry per flow id, so they travel with the
// collection and stay invisible to upstream Bruno. Keys are written sorted to keep git diffs stable.
const FLOW_VERSION = 1;
const FLOW_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_FLOW_BYTES = 2 * 1024 * 1024;

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const validateFlow = (flow) => {
  if (!isPlainObject(flow)) {
    throw new Error('Invalid flow');
  }
  if (typeof flow.id !== 'string' || !FLOW_ID_PATTERN.test(flow.id)) {
    throw new Error('Invalid flow id');
  }
  if (typeof flow.name !== 'string' || !flow.name.trim()) {
    throw new Error('Invalid flow name');
  }
  if (flow.version !== FLOW_VERSION) {
    throw new Error(`Unsupported flow version: ${flow.version}`);
  }
  if (flow.folder !== undefined && typeof flow.folder !== 'string') {
    throw new Error('Invalid flow folder');
  }
  if (!Array.isArray(flow.nodes) || !Array.isArray(flow.edges)) {
    throw new Error('Invalid flow graph');
  }
  if (JSON.stringify(flow).length > MAX_FLOW_BYTES) {
    throw new Error('Flow is too large');
  }
};

const readFlowsMap = (collectionPath) => {
  const flows = readSettings(collectionPath).flows;
  return isPlainObject(flows) ? flows : {};
};

const sortedMap = (flows) =>
  Object.keys(flows)
    .sort()
    .reduce((acc, id) => Object.assign(acc, { [id]: flows[id] }), {});

const listFlows = (collectionPath) => {
  if (!isCollectionRoot(collectionPath)) {
    return [];
  }
  return Object.entries(readFlowsMap(collectionPath))
    .filter(([id, flow]) => isPlainObject(flow) && flow.id === id)
    .map(([, flow]) => flow);
};

const saveFlow = (collectionPath, flow) => {
  assertCollectionRoot(collectionPath);
  validateFlow(flow);

  const settings = readSettings(collectionPath);
  writeSettings(collectionPath, { ...settings, flows: sortedMap({ ...readFlowsMap(collectionPath), [flow.id]: flow }) });
  return flow;
};

const deleteFlow = (collectionPath, flowId) => {
  assertCollectionRoot(collectionPath);
  if (typeof flowId !== 'string' || !FLOW_ID_PATTERN.test(flowId)) {
    throw new Error('Invalid flow id');
  }

  const settings = readSettings(collectionPath);
  const flows = { ...readFlowsMap(collectionPath) };
  delete flows[flowId];

  const next = { ...settings, flows: sortedMap(flows) };
  if (!Object.keys(next.flows).length) {
    delete next.flows;
  }
  writeSettings(collectionPath, next);
};

const register = () => {
  ipcMain.handle('fork:flows:list', (_event, collectionPath) => listFlows(collectionPath));
  ipcMain.handle('fork:flows:save', (_event, collectionPath, flow) => saveFlow(collectionPath, flow));
  ipcMain.handle('fork:flows:delete', (_event, collectionPath, flowId) => deleteFlow(collectionPath, flowId));
};

module.exports = { FLOW_VERSION, listFlows, saveFlow, deleteFlow, register };
