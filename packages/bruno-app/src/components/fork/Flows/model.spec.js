jest.mock('utils/common', () => ({ uuid: () => 'generated-uid' }));

import { FLOW_VERSION, createFlow, groupFlowsByFolder, isValidFlowName, listFolders, normalizeFlow, normalizeFolder } from './model';

const START = { id: 'start', type: 'start', x: 80, y: 120, config: {} };

describe('flow model', () => {
  it('normalises folder labels', () => {
    expect(normalizeFolder(' Shipments / Warehouse ')).toBe('Shipments/Warehouse');
    expect(normalizeFolder('a\\b//c/')).toBe('a/b/c');
    expect(normalizeFolder(undefined)).toBe('');
  });

  it('validates names', () => {
    expect(isValidFlowName('Create order')).toBe(true);
    expect(isValidFlowName('   ')).toBe(false);
    expect(isValidFlowName('x'.repeat(121))).toBe(false);
    expect(isValidFlowName(42)).toBe(false);
  });

  it('creates a flow with only its Start step and the current version', () => {
    const flow = createFlow({ name: '  Login  ', folder: 'auth/' });
    expect(flow).toMatchObject({ version: FLOW_VERSION, name: 'Login', folder: 'auth', nodes: [START], edges: [] });
    expect(flow.id).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('normalises stored flows and drops unusable ones', () => {
    expect(normalizeFlow({ id: 'f1', version: FLOW_VERSION, name: ' A ', folder: 'x/', nodes: 'bad' })).toEqual({
      id: 'f1',
      version: FLOW_VERSION,
      name: 'A',
      folder: 'x',
      nodes: [START],
      edges: []
    });
    const stored = { id: 'f2', version: FLOW_VERSION, name: 'B', nodes: [{ id: 'mine', type: 'start' }, { id: 'a', type: 'wait' }], edges: [] };
    expect(normalizeFlow(stored).nodes).toEqual(stored.nodes);
    expect(normalizeFlow({ id: 'f1', version: 2, name: 'A' })).toBeNull();
    expect(normalizeFlow({ version: FLOW_VERSION, name: 'A' })).toBeNull();
    expect(normalizeFlow('junk')).toBeNull();
  });

  it('groups flows by folder with root flows first', () => {
    const flows = [
      { id: '1', name: 'b', folder: 'Zeta' },
      { id: '2', name: 'a', folder: '' },
      { id: '3', name: 'c', folder: 'alpha' },
      { id: '4', name: 'A', folder: 'Zeta' }
    ];
    expect(groupFlowsByFolder(flows)).toEqual([
      { folder: '', flows: [flows[1]] },
      { folder: 'alpha', flows: [flows[2]] },
      { folder: 'Zeta', flows: [flows[3], flows[0]] }
    ]);
    expect(listFolders(flows)).toEqual(['alpha', 'Zeta']);
  });
});
