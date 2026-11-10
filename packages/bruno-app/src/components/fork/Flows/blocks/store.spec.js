import { renderHook, waitFor } from '@testing-library/react';
import { FLOW_VERSION } from '../model';
import { deleteOwnBlock, getOwnBlocks, loadOwnBlocks, resetOwnBlocks, saveOwnBlock, useOwnBlocks } from './store';

const COLLECTION = 'C:\\collections\\demo';
const makeBlock = (id, name, extra = {}) => ({ id, name, version: FLOW_VERSION, nodes: [{ id: 'n1', type: 'wait', x: 0, y: 0, config: {} }], edges: [], ...extra });

describe('own blocks store', () => {
  let file;

  beforeEach(() => {
    resetOwnBlocks();
    file = {};
    window.ipcRenderer = {
      invoke: jest.fn(async (channel, collectionPath, arg) => {
        if (channel === 'fork:flows:blocks:list') return Object.values(file);
        if (channel === 'fork:flows:blocks:save') {
          file[arg.id] = arg;
          return arg;
        }
        if (channel === 'fork:flows:blocks:delete') {
          delete file[arg];
          return undefined;
        }
        throw new Error(`unexpected channel ${channel}`);
      })
    };
  });

  afterEach(() => {
    delete window.ipcRenderer;
  });

  it('loads the blocks of the collection by name and drops unusable entries', async () => {
    file = { b1: makeBlock('b1', 'retry'), b2: makeBlock('b2', 'Log in'), bad: { id: 'bad' }, old: makeBlock('old', 'Old', { version: 0 }) };
    const { result } = renderHook(() => useOwnBlocks(COLLECTION));
    expect(result.current).toEqual([]);
    await waitFor(() => expect(result.current.map((block) => block.name)).toEqual(['Log in', 'retry']));
  });

  it('saves and deletes through the collection file', async () => {
    await loadOwnBlocks(COLLECTION);
    await saveOwnBlock(COLLECTION, makeBlock('b1', 'Retry'));
    await saveOwnBlock(COLLECTION, makeBlock('b1', 'Retry twice'));
    expect(getOwnBlocks(COLLECTION).map((block) => block.name)).toEqual(['Retry twice']);
    expect(Object.keys(file)).toEqual(['b1']);

    await deleteOwnBlock(COLLECTION, 'b1');
    expect(getOwnBlocks(COLLECTION)).toEqual([]);
    expect(file).toEqual({});
  });

  it('offers no blocks when the file cannot be read, and tells when one cannot be saved', async () => {
    window.ipcRenderer.invoke.mockRejectedValue(new Error('Error invoking remote method \'fork:flows:blocks:list\': Error: git conflict'));
    await loadOwnBlocks(COLLECTION);
    expect(getOwnBlocks(COLLECTION)).toEqual([]);
    await expect(saveOwnBlock(COLLECTION, makeBlock('b1', 'Retry'))).rejects.toThrow('git conflict');
    expect(getOwnBlocks(COLLECTION)).toEqual([]);
  });
});
