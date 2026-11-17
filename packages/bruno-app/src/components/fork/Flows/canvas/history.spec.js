jest.mock('utils/common', () => ({ uuid: () => 'uid' }));

import { FLOW_VERSION } from '../model';
import { getFlow, isFlowDirty, loadFlows, resetFlowsStore } from '../store';
import { canRedo, canUndo, editFlow, redo, resetHistory, undo } from './history';

const COLLECTION = '/collections/shop';
const START = { id: 'start', type: 'start', x: 80, y: 120, config: {} };
const stored = { id: 'f1', name: 'One', version: FLOW_VERSION, folder: '', nodes: [START], edges: [] };

const addStep = (id) => (flow) => ({ ...flow, nodes: [...flow.nodes, { id, type: 'wait' }] });
const stepIds = () => getFlow(COLLECTION, 'f1').nodes.map((node) => node.id);

describe('flow history', () => {
  beforeEach(async () => {
    resetFlowsStore();
    resetHistory();
    window.ipcRenderer = { invoke: jest.fn(async () => [stored]) };
    await loadFlows(COLLECTION);
  });

  afterEach(() => {
    delete window.ipcRenderer;
  });

  it('edits the draft, not the saved flow', () => {
    editFlow(COLLECTION, 'f1', addStep('a'));
    expect(stepIds()).toEqual(['start', 'a']);
    expect(isFlowDirty(COLLECTION, 'f1')).toBe(true);
    expect(canUndo('f1')).toBe(true);
  });

  it('undoes and redoes step by step', () => {
    editFlow(COLLECTION, 'f1', addStep('a'));
    editFlow(COLLECTION, 'f1', addStep('b'));

    undo(COLLECTION, 'f1');
    expect(stepIds()).toEqual(['start', 'a']);
    undo(COLLECTION, 'f1');
    expect(stepIds()).toEqual(['start']);
    expect(canUndo('f1')).toBe(false);

    redo(COLLECTION, 'f1');
    redo(COLLECTION, 'f1');
    expect(stepIds()).toEqual(['start', 'a', 'b']);
    expect(canRedo('f1')).toBe(false);
  });

  it('forgets what could be redone after a new edit', () => {
    editFlow(COLLECTION, 'f1', addStep('a'));
    undo(COLLECTION, 'f1');
    editFlow(COLLECTION, 'f1', addStep('b'));
    expect(canRedo('f1')).toBe(false);
    expect(stepIds()).toEqual(['start', 'b']);
  });

  it('undoes what was typed in one box in one go', () => {
    const type = (text) => (flow) => ({ ...flow, nodes: [{ ...flow.nodes[0], config: { text } }] });
    editFlow(COLLECTION, 'f1', type('h'), { mergeKey: 'box', now: 1000 });
    editFlow(COLLECTION, 'f1', type('hi'), { mergeKey: 'box', now: 1400 });
    editFlow(COLLECTION, 'f1', type('hi!'), { mergeKey: 'box', now: 9000 });

    undo(COLLECTION, 'f1');
    expect(getFlow(COLLECTION, 'f1').nodes[0].config).toEqual({ text: 'hi' });
    undo(COLLECTION, 'f1');
    expect(getFlow(COLLECTION, 'f1').nodes[0].config).toEqual({});
  });

  it('ignores an edit that changes nothing and keeps the name out of it', () => {
    editFlow(COLLECTION, 'f1', (flow) => flow);
    expect(canUndo('f1')).toBe(false);

    editFlow(COLLECTION, 'f1', addStep('a'));
    editFlow(COLLECTION, 'f1', (flow) => ({ ...flow, name: 'Renamed' }));
    undo(COLLECTION, 'f1');
    undo(COLLECTION, 'f1');
    expect(getFlow(COLLECTION, 'f1')).toMatchObject({ name: 'Renamed', nodes: [START] });
  });
});
