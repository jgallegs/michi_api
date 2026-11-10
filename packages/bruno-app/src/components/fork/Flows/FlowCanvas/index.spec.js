jest.mock('utils/common', () => {
  let next = 0;
  return { uuid: () => `new-${(next += 1)}` };
});
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock('../run/controller', () => ({
  RUN_MODE: { RUN: 'run', STEP: 'step', CONTINUE: 'continue' },
  startRun: jest.fn(() => Promise.resolve()),
  stopRun: jest.fn()
}));
jest.mock('components/fork/SensitiveEnvironment/store', () => ({ useIsSensitiveEnvironment: (collection, environment) => environment?.name === 'Live' }));

import '@testing-library/jest-dom';
import React from 'react';
import { DndProvider } from 'react-dnd';
import { Provider } from 'react-redux';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ThemeProvider } from 'styled-components';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import lightTheme from 'themes/light/light';
import { FLOW_VERSION } from '../model';
import { getFlow, loadFlows, resetFlowsStore, useFlow } from '../store';
import { resetHistory } from '../canvas/history';
import { startRun, stopRun } from '../run/controller';
import { RUN_PHASE, patchRunSession, resetRunSessions } from '../run/session';
import { resetGuides } from '../blocks/guide';
import { resetOwnBlocks } from '../blocks/store';
import FlowCanvas, { resetCanvasMemory } from './index';

const COLLECTION = '/collections/shop';
const collection = {
  uid: 'c1',
  pathname: COLLECTION,
  activeEnvironmentUid: 'e1',
  environments: [{ uid: 'e1', name: 'Local', variables: [] }, { uid: 'e2', name: 'Live', variables: [] }],
  items: [
    { type: 'http-request', name: 'login', pathname: `${COLLECTION}/login.bru`, request: { method: 'post', url: 'http://localhost:9/login' } },
    { type: 'http-request', name: 'get order', pathname: `${COLLECTION}/get order.bru`, request: { method: 'get', url: 'http://localhost:9/{{orderId}}' } }
  ]
};

const node = (id, type, x, y, config = {}) => ({ id, type, x, y, config });
const edge = (id, source, sourcePort, target, targetPort = 'in') => ({ id, source, sourcePort, target, targetPort });

const makeFlow = (nodes = [], edges = []) => ({
  id: 'f1',
  name: 'Walk',
  version: FLOW_VERSION,
  folder: '',
  nodes: [node('start', 'start', 80, 120), ...nodes],
  edges
});

const reduxStore = { getState: () => ({ collections: { collections: [collection] } }), dispatch: jest.fn(), subscribe: () => () => {} };

const Harness = ({ shown = collection }) => {
  const flow = useFlow(COLLECTION, 'f1');
  return flow ? <FlowCanvas collection={shown} flow={flow} /> : null;
};

const open = async (flow, shown) => {
  window.ipcRenderer = { invoke: jest.fn(async (channel, path, saved) => (channel === 'fork:flows:list' ? [flow] : saved)) };
  await act(() => loadFlows(COLLECTION));
  render(
    <ThemeProvider theme={lightTheme}>
      <Provider store={reduxStore}>
        <DndProvider backend={HTML5Backend}>
          <Harness shown={shown} />
        </DndProvider>
      </Provider>
    </ThemeProvider>
  );
  // The blocks saved in the collection arrive right after the canvas is on screen.
  await act(async () => {});
};

const current = () => getFlow(COLLECTION, 'f1');
const port = (nodeId, side, name) => screen.getByTestId(`flow-port-${nodeId}-${side}-${name}`);
const pick = (text) => fireEvent.click(screen.getByText(text, { selector: '.flow-picker-label' }));

describe('FlowCanvas', () => {
  beforeEach(() => {
    resetFlowsStore();
    resetHistory();
    resetRunSessions();
    resetGuides();
    resetOwnBlocks();
    resetCanvasMemory();
    startRun.mockClear();
    stopRun.mockClear();
  });

  afterEach(() => {
    delete window.ipcRenderer;
  });

  it('opens a new flow with Start and a hint on how to go on', async () => {
    await open(makeFlow());
    expect(screen.getByTestId('flow-piece-start')).toBeInTheDocument();
    expect(screen.getByText(/Pull a cable out of the triangle/)).toBeInTheDocument();
    expect(screen.queryByTestId('flow-issue-start')).not.toBeInTheDocument();
  });

  it('adds the step picked after clicking an output, already joined', async () => {
    await open(makeFlow());
    fireEvent.mouseDown(port('start', 'right', 'out'), { button: 0 });
    fireEvent.mouseUp(window);
    expect(screen.getByText('What goes here?')).toBeInTheDocument();
    expect(screen.queryByText('List', { selector: '.flow-picker-label' })).not.toBeInTheDocument();

    pick('login');

    const [, added] = current().nodes;
    expect(added).toMatchObject({ type: 'request', config: { pathname: 'login.bru' } });
    expect(current().edges).toMatchObject([{ source: 'start', sourcePort: 'out', target: added.id, targetPort: 'in' }]);
    expect(screen.queryByTestId('flow-picker')).not.toBeInTheDocument();
  });

  it('takes a value from another step through the value picker', async () => {
    const flow = makeFlow(
      [node('a', 'request', 400, 120, { pathname: 'login.bru', fields: ['token'] }), node('b', 'request', 720, 120, { pathname: 'get order.bru' })],
      [edge('e1', 'start', 'out', 'a'), edge('e2', 'a', 'out', 'b')]
    );
    await open(flow);
    fireEvent.mouseDown(port('b', 'left', 'var:orderId'), { button: 0 });
    fireEvent.mouseUp(window);
    pick('token');

    expect(current().edges).toHaveLength(3);
    expect(current().edges[2]).toMatchObject({ source: 'a', sourcePort: 'field:token', target: 'b', targetPort: 'var:orderId' });
    expect(screen.getByText('login · token')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Disconnect'));
    expect(current().edges).toHaveLength(2);
  });

  it('takes a field nobody has seen yet by typing its name in the value picker', async () => {
    const flow = makeFlow(
      [node('a', 'request', 400, 120, { pathname: 'login.bru' }), node('each', 'foreach', 720, 120), node('b', 'request', 1040, 120, { pathname: 'get order.bru' })],
      [edge('e1', 'start', 'out', 'a'), edge('e2', 'a', 'out', 'each'), edge('e3', 'each', 'body', 'b')]
    );
    await open(flow);

    fireEvent.click(screen.getByText('Choose the list'));
    fireEvent.change(screen.getByPlaceholderText('Search or type a field, like order.id'), { target: { value: 'orders' } });
    fireEvent.click(screen.getAllByText('orders', { selector: '.flow-picker-label' })[0]);
    expect(current().edges[3]).toMatchObject({ source: 'a', sourcePort: 'field:orders', target: 'each', targetPort: 'value:list' });
    expect(current().nodes[1].config.fields).toEqual(['orders']);

    fireEvent.mouseDown(port('b', 'left', 'var:orderId'), { button: 0 });
    fireEvent.mouseUp(window);
    fireEvent.change(screen.getByPlaceholderText('Search or type a field, like order.id'), { target: { value: 'id' } });
    const offered = screen.getAllByText('id', { selector: '.flow-picker-label' });
    expect(offered).toHaveLength(2);
    fireEvent.click(offered[1]);
    expect(current().edges[4]).toMatchObject({ source: 'each', sourcePort: 'field:item.id', target: 'b', targetPort: 'var:orderId' });
    expect(current().nodes[2].config.fields).toEqual(['id']);
  });

  it('types settings into a step and undoes them from the toolbar', async () => {
    await open(makeFlow([node('r', 'repeat', 400, 120, { times: '3' })], [edge('e1', 'start', 'out', 'r')]));
    fireEvent.change(screen.getByDisplayValue('3'), { target: { value: '12' } });
    expect(current().nodes[1].config.times).toBe('12');

    fireEvent.click(screen.getByTestId('flow-undo'));
    expect(current().nodes[1].config.times).toBe('3');
    fireEvent.click(screen.getByTestId('flow-redo'));
    expect(current().nodes[1].config.times).toBe('12');
  });

  it('marks the steps with a problem and dims the ones that are not connected', async () => {
    await open(makeFlow([node('a', 'request', 400, 120), node('spare', 'wait', 400, 400)], [edge('e1', 'start', 'out', 'a')]));
    expect(screen.getByTestId('flow-issue-a')).toHaveAttribute('title', 'Choose the request this step sends');
    expect(screen.getByTestId('flow-piece-spare')).toHaveClass('dimmed');
    expect(screen.getByTestId('flow-piece-a')).not.toHaveClass('dimmed');
  });

  it('draws a zone around what a Repeat repeats', async () => {
    const flow = makeFlow(
      [node('r', 'repeat', 400, 120, { times: '5' }), node('w', 'wait', 720, 120)],
      [edge('e1', 'start', 'out', 'r'), edge('e2', 'r', 'body', 'w')]
    );
    await open(flow);
    expect(screen.getByTestId('flow-zone-r')).toHaveTextContent('Repeats × 5');
  });

  it('chooses the list a step goes through and frames what it repeats', async () => {
    const flow = makeFlow(
      [node('a', 'request', 400, 120, { pathname: 'login.bru', fields: ['orders'] }), node('each', 'foreach', 720, 120), node('w', 'wait', 1040, 120)],
      [edge('e1', 'start', 'out', 'a'), edge('e2', 'a', 'out', 'each'), edge('e3', 'each', 'body', 'w')]
    );
    await open(flow);
    expect(screen.getByTestId('flow-issue-each')).toHaveAttribute('title', 'Choose the list this step goes through');
    expect(screen.getByTestId('flow-zone-each')).toHaveTextContent('Repeats');

    fireEvent.click(screen.getByText('Choose the list'));
    pick('orders');

    expect(current().edges[3]).toMatchObject({ source: 'a', sourcePort: 'field:orders', target: 'each', targetPort: 'value:list' });
    expect(screen.getByText('login · orders')).toBeInTheDocument();
    expect(screen.queryByTestId('flow-issue-each')).not.toBeInTheDocument();
  });

  it('deletes the selected step with the keyboard, but never Start', async () => {
    await open(makeFlow([node('w', 'wait', 400, 120)], [edge('e1', 'start', 'out', 'w')]));
    const canvas = screen.getByTestId('flow-canvas');

    fireEvent.keyDown(canvas, { key: 'a', ctrlKey: true });
    fireEvent.keyDown(canvas, { key: 'Delete' });

    expect(current().nodes.map((item) => item.id)).toEqual(['start']);
    expect(current().edges).toEqual([]);

    fireEvent.keyDown(canvas, { key: 'z', ctrlKey: true });
    expect(current().nodes.map((item) => item.id)).toEqual(['start', 'w']);
  });

  it('copies and pastes steps with the keyboard', async () => {
    await open(makeFlow([node('w', 'wait', 400, 120)], [edge('e1', 'start', 'out', 'w')]));
    const canvas = screen.getByTestId('flow-canvas');
    fireEvent.keyDown(canvas, { key: 'a', ctrlKey: true });
    fireEvent.keyDown(canvas, { key: 'c', ctrlKey: true });
    fireEvent.keyDown(canvas, { key: 'v', ctrlKey: true });
    expect(current().nodes.map((item) => item.type)).toEqual(['start', 'wait', 'wait']);
  });

  it('does not let keys typed in a box act on the canvas', async () => {
    await open(makeFlow([node('r', 'repeat', 400, 120, { times: '3' })], [edge('e1', 'start', 'out', 'r')]));
    fireEvent.keyDown(screen.getByTestId('flow-canvas'), { key: 'a', ctrlKey: true });
    fireEvent.keyDown(screen.getByDisplayValue('3'), { key: 'Backspace' });
    expect(current().nodes).toHaveLength(2);
  });

  it('tidies up and saves', async () => {
    await open(makeFlow([node('w', 'wait', 80, 120)], [edge('e1', 'start', 'out', 'w')]));
    expect(screen.getByTestId('flow-save')).toBeDisabled();

    fireEvent.click(screen.getByTestId('flow-tidy'));
    const [start, wait] = current().nodes;
    expect(wait.x).toBeGreaterThan(start.x + 240);
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId('flow-save'));
    });
    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('fork:flows:save', COLLECTION, expect.objectContaining({ id: 'f1' }));
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  });
  it('warns when the flow changed in the collection under unsaved edits, and can take that version', async () => {
    await open(makeFlow([node('w', 'wait', 400, 120)], [edge('e1', 'start', 'out', 'w')]));
    fireEvent.click(screen.getByTestId('flow-tidy'));
    expect(screen.queryByTestId('flow-stale')).not.toBeInTheDocument();

    window.ipcRenderer.invoke.mockResolvedValue([makeFlow([node('theirs', 'stop', 400, 120)], [])]);
    await act(() => loadFlows(COLLECTION));
    expect(screen.getByTestId('flow-stale')).toBeInTheDocument();
    expect(screen.getByTestId('flow-piece-w')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('flow-discard'));
    expect(screen.queryByTestId('flow-stale')).not.toBeInTheDocument();
    expect(screen.getByTestId('flow-piece-theirs')).toBeInTheDocument();
    expect(screen.getByTestId('flow-undo')).toBeDisabled();
  });

  describe('blocks', () => {
    const point = (number) => screen.getByTestId(`flow-guide-point-${number}`);

    it('opens a new flow asking what to do, and leaves it empty when starting from scratch', async () => {
      await open(makeFlow());
      expect(screen.getByTestId('flow-gallery')).toHaveTextContent('What do you want to do?');
      expect(screen.getByTestId('flow-block-retry')).toHaveTextContent('Retry until it works');

      fireEvent.click(screen.getByTestId('flow-gallery-blank'));
      expect(screen.queryByTestId('flow-gallery')).not.toBeInTheDocument();
      expect(current().nodes).toHaveLength(1);
      expect(screen.queryByTestId('flow-guide')).not.toBeInTheDocument();
    });

    it('does not ask on a flow that already has steps', async () => {
      await open(makeFlow([node('w', 'wait', 400, 120)], [edge('e1', 'start', 'out', 'w')]));
      expect(screen.queryByTestId('flow-gallery')).not.toBeInTheDocument();
    });

    it('drops a ready-made block after Start and guides through what is left', async () => {
      await open(makeFlow());
      fireEvent.click(screen.getByTestId('flow-block-pass-value'));

      const [, gives, needs] = current().nodes;
      expect([gives.type, needs.type]).toEqual(['request', 'request']);
      expect(current().edges).toMatchObject([
        { source: gives.id, sourcePort: 'out', target: needs.id, targetPort: 'in' },
        { source: 'start', sourcePort: 'out', target: gives.id, targetPort: 'in' }
      ]);
      expect(screen.queryByTestId('flow-gallery')).not.toBeInTheDocument();
      expect(screen.getByTestId('flow-guide')).toHaveTextContent('Use a value from one response in the next call');
      expect(point(1)).toHaveClass('current');
      expect(screen.getByTestId(`flow-guide-mark-${gives.id}`)).toHaveTextContent('1');
      expect(screen.getByTestId(`flow-guide-mark-${needs.id}`)).toHaveTextContent('2');

      fireEvent.click(within(screen.getByTestId(`flow-piece-${gives.id}`)).getByText('Choose a request'));
      pick('login');
      expect(point(1)).toHaveClass('done');
      expect(point(2)).toHaveClass('current');
      expect(screen.queryByTestId(`flow-guide-mark-${gives.id}`)).not.toBeInTheDocument();

      fireEvent.click(within(point(3)).getByLabelText('Mark as done'));
      expect(point(3)).toHaveClass('done');

      fireEvent.click(screen.getByTestId('flow-run'));
      expect(point(4)).toHaveClass('done');

      fireEvent.click(within(point(2)).getByText('Choose the request that needs that value'));
      expect(screen.getByTestId(`flow-piece-${needs.id}`)).toHaveClass('selected');

      fireEvent.click(screen.getByTestId('flow-guide-close'));
      expect(screen.queryByTestId('flow-guide')).not.toBeInTheDocument();
    });

    it('undoes a whole block at once', async () => {
      await open(makeFlow());
      fireEvent.click(screen.getByTestId('flow-block-retry'));
      expect(current().nodes).toHaveLength(8);
      expect(screen.getAllByText('Repeats')).toHaveLength(1);

      fireEvent.click(screen.getByTestId('flow-undo'));
      expect(current().nodes).toHaveLength(1);
      expect(screen.queryByTestId('flow-gallery')).not.toBeInTheDocument();
    });

    it('hangs a block from the cable it was asked from', async () => {
      await open(makeFlow([node('w', 'wait', 400, 120)], [edge('e1', 'start', 'out', 'w')]));
      fireEvent.mouseDown(port('w', 'right', 'out'), { button: 0 });
      fireEvent.mouseUp(window);
      pick('Choose a block…');
      fireEvent.click(screen.getByTestId('flow-block-sequence'));

      const first = current().nodes[2];
      expect(current().nodes).toHaveLength(5);
      expect(current().edges[current().edges.length - 1]).toMatchObject({ source: 'w', sourcePort: 'out', target: first.id, targetPort: 'in' });
    });

    it('does not offer blocks where one cannot go', async () => {
      await open(makeFlow([node('a', 'request', 400, 120, { pathname: 'login.bru' })], [edge('e1', 'start', 'out', 'a')]));
      fireEvent.mouseDown(port('a', 'right', 'status'), { button: 0 });
      fireEvent.mouseUp(window);
      expect(screen.getByText('What goes here?')).toBeInTheDocument();
      expect(screen.queryByText('Choose a block…')).not.toBeInTheDocument();
    });

    it('keeps the selected steps as a block of the collection and offers it back', async () => {
      const flow = makeFlow([node('w', 'wait', 400, 120, { seconds: '4' })], [edge('e1', 'start', 'out', 'w')]);
      await open(flow);
      expect(screen.queryByTestId('flow-save-block')).not.toBeInTheDocument();

      fireEvent.keyDown(screen.getByTestId('flow-canvas'), { key: 'a', ctrlKey: true });
      fireEvent.click(screen.getByTestId('flow-save-block'));
      expect(screen.getByTestId('flow-block-form-submit-btn')).toBeDisabled();
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Short pause' } });
      await act(async () => {
        fireEvent.click(screen.getByTestId('flow-block-form-submit-btn'));
      });

      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(
        'fork:flows:blocks:save',
        COLLECTION,
        expect.objectContaining({ name: 'Short pause', nodes: [expect.objectContaining({ type: 'wait', x: 0, y: 0, config: { seconds: '4' } })], edges: [] })
      );
      expect(screen.queryByTestId('flow-block-form')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('flow-blocks'));
      fireEvent.click(within(screen.getByTestId('flow-own-block')).getByText('Short pause'));
      expect(current().nodes.map((item) => [item.type, item.config.seconds])).toEqual([['start', undefined], ['wait', '4'], ['wait', '4']]);
      expect(screen.queryByTestId('flow-guide')).not.toBeInTheDocument();
    });

    it('deletes a block of the collection after asking once more', async () => {
      const saved = { id: 'b1', name: 'Log in', version: FLOW_VERSION, nodes: [node('n', 'wait', 0, 0)], edges: [] };
      await open(makeFlow([node('w', 'wait', 400, 120)], [edge('e1', 'start', 'out', 'w')]));
      window.ipcRenderer.invoke.mockImplementation(async (channel) => (channel === 'fork:flows:blocks:list' ? [saved] : undefined));
      await act(async () => {
        window.dispatchEvent(new Event('focus'));
      });

      fireEvent.click(screen.getByTestId('flow-blocks'));
      fireEvent.click(screen.getByLabelText('Delete this block'));
      await act(async () => {
        fireEvent.click(screen.getByTestId('flow-own-block-delete'));
      });

      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('fork:flows:blocks:delete', COLLECTION, 'b1');
      expect(screen.queryByTestId('flow-own-block')).not.toBeInTheDocument();
    });

    it('explains the shapes and the keys, one click away', async () => {
      await open(makeFlow([node('w', 'wait', 400, 120)], [edge('e1', 'start', 'out', 'w')]));
      fireEvent.click(screen.getByTestId('flow-help-button'));
      expect(screen.getByTestId('flow-help')).toHaveTextContent('A square is a value a step needs.');
      expect(port('w', 'left', 'value:seconds')).toHaveAttribute('title', 'A value it needs: click to choose where it comes from');

      fireEvent.click(screen.getByTestId('flow-help-blocks'));
      expect(screen.queryByTestId('flow-help')).not.toBeInTheDocument();
      expect(screen.getByTestId('flow-gallery')).toBeInTheDocument();

      fireEvent.keyDown(screen.getByTestId('flow-canvas'), { key: 'Escape' });
      expect(screen.queryByTestId('flow-gallery')).not.toBeInTheDocument();
    });

    it('finds a step by its name in Spanish', async () => {
      await open(makeFlow([node('w', 'wait', 400, 120)], [edge('e1', 'start', 'out', 'w')]));
      fireEvent.click(screen.getByTestId('flow-add-step'));
      fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'esperar' } });
      expect(screen.getAllByText(/./, { selector: '.flow-picker-label' }).map((item) => item.textContent)).toEqual(['Wait']);
    });
  });

  describe('running', () => {
    const walk = () => makeFlow([node('w', 'wait', 400, 120), node('l', 'list', 400, 300)], [edge('e1', 'start', 'out', 'w')]);
    const started = (mode) => expect(startRun).toHaveBeenLastCalledWith(expect.objectContaining({ collectionUid: 'c1', collectionPath: COLLECTION, flowId: 'f1', mode }));

    it('runs, steps and shows the environment it runs against', async () => {
      await open(walk());
      expect(screen.getByTestId('flow-environment')).toHaveTextContent('Local');
      expect(screen.getByTestId('flow-environment')).not.toHaveClass('sensitive');

      fireEvent.click(screen.getByTestId('flow-run'));
      started('run');
      fireEvent.click(screen.getByTestId('flow-step'));
      started('step');
      fireEvent.keyDown(screen.getByTestId('flow-canvas'), { key: 'Enter', ctrlKey: true });
      expect(startRun).toHaveBeenCalledTimes(3);
      expect(screen.queryByTestId('flow-continue')).not.toBeInTheDocument();
    });

    it('warns when the environment is sensitive', async () => {
      await open(walk(), { ...collection, activeEnvironmentUid: 'e2' });
      expect(screen.getByTestId('flow-environment')).toHaveClass('sensitive');
      expect(screen.getByTestId('flow-environment')).toHaveTextContent('Live');
    });

    it('offers to stop while it runs', async () => {
      await open(walk());
      act(() => patchRunSession('f1', { phase: RUN_PHASE.RUNNING, steps: { w: { state: 'running' } } }));
      expect(screen.getByTestId('flow-piece-w')).toHaveClass('run-running');
      expect(screen.queryByTestId('flow-run')).not.toBeInTheDocument();
      expect(screen.getByTestId('flow-step')).toBeDisabled();

      fireEvent.click(screen.getByTestId('flow-stop'));
      expect(stopRun).toHaveBeenCalledWith('f1');
    });

    it('shows what the run left on each step and continues from where it stopped', async () => {
      await open(walk());
      act(() =>
        patchRunSession('f1', {
          phase: RUN_PHASE.PAUSED,
          steps: { start: { state: 'done' }, w: { state: 'failed', tag: { text: '2 s' } } },
          lists: { l: 3 },
          resume: { nodeId: 'w', state: {} }
        })
      );
      expect(screen.getByTestId('flow-piece-start')).toHaveClass('run-done');
      expect(screen.getByTestId('flow-piece-w')).toHaveClass('run-waiting');
      expect(screen.getByTestId('flow-piece-w')).toHaveTextContent('2 s');
      expect(screen.getByTestId('flow-piece-l')).toHaveTextContent('3');

      fireEvent.click(screen.getByLabelText('Continue from this step'));
      started('continue');
      fireEvent.click(screen.getByTestId('flow-continue'));
      expect(startRun).toHaveBeenCalledTimes(2);
    });
  });
});
