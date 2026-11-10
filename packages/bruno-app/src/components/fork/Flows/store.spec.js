jest.mock('utils/common', () => ({ uuid: () => 'generated-uid' }));

import { renderHook, waitFor } from '@testing-library/react';
import { FLOW_VERSION } from './model';
import {
  createFlow,
  deleteFlow,
  discardFlowDraft,
  getFlow,
  isFlowDirty,
  loadFlows,
  renameFlow,
  resetFlowsStore,
  saveFlow,
  updateFlowDraft,
  useCollectionFlows
} from './store';

const COLLECTION = 'C:\\collections\\demo';

const START = { id: 'start', type: 'start', x: 80, y: 120, config: {} };
const makeFlow = (id, name, extra = {}) => ({ id, name, version: FLOW_VERSION, folder: '', nodes: [START], edges: [], ...extra });

describe('flows store', () => {
  let files;

  beforeEach(() => {
    resetFlowsStore();
    files = { [COLLECTION]: {} };
    window.ipcRenderer = {
      invoke: jest.fn(async (channel, collectionPath, arg) => {
        const flows = files[collectionPath];
        if (channel === 'fork:flows:list') return Object.values(flows);
        if (channel === 'fork:flows:save') {
          flows[arg.id] = arg;
          return arg;
        }
        if (channel === 'fork:flows:delete') {
          delete flows[arg];
          return undefined;
        }
        throw new Error(`unexpected channel ${channel}`);
      })
    };
  });

  afterEach(() => {
    delete window.ipcRenderer;
  });

  it('loads flows from the collection and drops unusable entries', async () => {
    files[COLLECTION] = { f1: makeFlow('f1', 'One'), bad: { id: 'bad' } };
    await loadFlows(COLLECTION);
    expect(getFlow(COLLECTION, 'f1')).toEqual(makeFlow('f1', 'One'));
    expect(getFlow(COLLECTION, 'bad')).toBeNull();
  });

  it('creates a flow and writes it through IPC', async () => {
    const flow = await createFlow(COLLECTION, { name: ' New ', folder: 'orders/' });
    expect(flow).toMatchObject({ name: 'New', folder: 'orders' });
    expect(files[COLLECTION][flow.id]).toEqual(flow);
    expect(isFlowDirty(COLLECTION, flow.id)).toBe(false);
  });

  it('keeps edits as a draft until saved and reports them as dirty', async () => {
    files[COLLECTION] = { f1: makeFlow('f1', 'One') };
    await loadFlows(COLLECTION);

    updateFlowDraft(COLLECTION, 'f1', (flow) => ({ ...flow, nodes: [{ id: 'n1', type: 'request' }] }));
    expect(isFlowDirty(COLLECTION, 'f1')).toBe(true);
    expect(files[COLLECTION].f1.nodes).toEqual([START]);

    await saveFlow(COLLECTION, 'f1');
    expect(isFlowDirty(COLLECTION, 'f1')).toBe(false);
    expect(files[COLLECTION].f1.nodes).toEqual([{ id: 'n1', type: 'request' }]);
  });

  it('is not dirty when a draft equals the saved flow, and can discard a draft', async () => {
    files[COLLECTION] = { f1: makeFlow('f1', 'One') };
    await loadFlows(COLLECTION);

    updateFlowDraft(COLLECTION, 'f1', (flow) => ({ ...flow }));
    expect(isFlowDirty(COLLECTION, 'f1')).toBe(false);

    updateFlowDraft(COLLECTION, 'f1', (flow) => ({ ...flow, name: 'Edited' }));
    discardFlowDraft(COLLECTION, 'f1');
    expect(getFlow(COLLECTION, 'f1').name).toBe('One');
  });

  it('renames without saving the pending graph edits', async () => {
    files[COLLECTION] = { f1: makeFlow('f1', 'One') };
    await loadFlows(COLLECTION);
    updateFlowDraft(COLLECTION, 'f1', (flow) => ({ ...flow, nodes: [{ id: 'n1' }] }));

    await renameFlow(COLLECTION, 'f1', { name: 'Renamed', folder: 'a/b' });

    expect(files[COLLECTION].f1).toEqual(makeFlow('f1', 'Renamed', { folder: 'a/b' }));
    expect(getFlow(COLLECTION, 'f1')).toEqual(makeFlow('f1', 'Renamed', { folder: 'a/b', nodes: [{ id: 'n1' }] }));
    expect(isFlowDirty(COLLECTION, 'f1')).toBe(true);
  });

  it('deletes a flow and forgets its draft', async () => {
    files[COLLECTION] = { f1: makeFlow('f1', 'One') };
    await loadFlows(COLLECTION);
    updateFlowDraft(COLLECTION, 'f1', (flow) => ({ ...flow, name: 'x' }));

    await deleteFlow(COLLECTION, 'f1');
    expect(getFlow(COLLECTION, 'f1')).toBeNull();
    expect(files[COLLECTION]).toEqual({});
  });

  it('shows the original message of an error from the main process', async () => {
    window.ipcRenderer.invoke = jest.fn(() => Promise.reject(new Error(`Error invoking remote method 'fork:flows:list': Error: .michi.json cannot be read`)));
    const { result } = renderHook(() => useCollectionFlows(COLLECTION));
    await waitFor(() => expect(result.current.error).toBe('.michi.json cannot be read'));
  });

  it('records the error when the file cannot be read', async () => {
    window.ipcRenderer.invoke = jest.fn(() => Promise.reject(new Error('boom')));
    const { result } = renderHook(() => useCollectionFlows(COLLECTION));
    await waitFor(() => expect(result.current.error).toBe('boom'));
    expect(getFlow(COLLECTION, 'f1')).toBeNull();
  });
});
