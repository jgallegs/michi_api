jest.mock('utils/common', () => {
  let next = 0;
  return { uuid: () => `new-${(next += 1)}` };
});
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

import '@testing-library/jest-dom';
import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ThemeProvider } from 'styled-components';
import { act, fireEvent, render, screen } from '@testing-library/react';
import lightTheme from 'themes/light/light';
import { FLOW_VERSION } from '../model';
import { getFlow, loadFlows, resetFlowsStore, useFlow } from '../store';
import { resetHistory } from '../canvas/history';
import FlowCanvas from './index';

const COLLECTION = '/collections/shop';
const collection = {
  uid: 'c1',
  pathname: COLLECTION,
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

const Harness = () => {
  const flow = useFlow(COLLECTION, 'f1');
  return flow ? <FlowCanvas collection={collection} flow={flow} /> : null;
};

const open = async (flow) => {
  window.ipcRenderer = { invoke: jest.fn(async (channel, path, saved) => (channel === 'fork:flows:list' ? [flow] : saved)) };
  await act(() => loadFlows(COLLECTION));
  render(
    <ThemeProvider theme={lightTheme}>
      <DndProvider backend={HTML5Backend}>
        <Harness />
      </DndProvider>
    </ThemeProvider>
  );
};

const current = () => getFlow(COLLECTION, 'f1');
const port = (nodeId, side, name) => screen.getByTestId(`flow-port-${nodeId}-${side}-${name}`);
const pick = (text) => fireEvent.click(screen.getByText(text, { selector: '.flow-picker-label' }));

describe('FlowCanvas', () => {
  beforeEach(() => {
    resetFlowsStore();
    resetHistory();
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
});
