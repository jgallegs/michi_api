jest.mock('utils/common', () => {
  let next = 0;
  return { uuid: () => `uid-${(next += 1)}` };
});
jest.mock('utils/network', () => ({ sendNetworkRequest: jest.fn() }));
jest.mock('providers/ReduxStore/slices/collections', () => ({
  initRunRequestEvent: (payload) => ({ type: 'initRunRequestEvent', payload }),
  responseReceived: (payload) => ({ type: 'responseReceived', payload })
}));
jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  cancelRequest: (cancelTokenUid) => ({ type: 'cancelRequest', cancelTokenUid })
}));
jest.mock('components/fork/SensitiveEnvironment', () => ({ confirmFlowInSensitiveEnvironment: jest.fn() }));

import { sendNetworkRequest } from 'utils/network';
import { confirmFlowInSensitiveEnvironment } from 'components/fork/SensitiveEnvironment';
import { FLOW_VERSION } from '../model';
import { loadFlows, resetFlowsStore } from '../store';
import { RUN_STATUS } from '../engine/run';
import { RUN_MODE, startRun, stopRun } from './controller';
import { RUN_PHASE, getRunLog, getRunSession, resetRunSessions } from './session';

const COLLECTION = '/collections/shop';
const node = (id, type, config = {}) => ({ id, type, x: 0, y: 0, config });
const edge = (source, sourcePort, target, targetPort = 'in') => ({ id: `${source}-${target}-${targetPort}`, source, sourcePort, target, targetPort });

const flow = {
  id: 'f1',
  name: 'Order walk',
  version: FLOW_VERSION,
  folder: '',
  nodes: [node('start', 'start'), node('a', 'request', { pathname: 'login.bru' }), node('b', 'request', { pathname: 'orders/get order.bru' })],
  edges: [edge('start', 'out', 'a'), edge('a', 'out', 'b'), edge('a', 'field:session.token', 'b', 'var:token')]
};

const makeStore = (overrides = {}) => {
  const collection = {
    uid: 'c1',
    pathname: COLLECTION,
    activeEnvironmentUid: 'e1',
    environments: [{ uid: 'e1', name: 'Local', variables: [] }, { uid: 'e2', name: 'Other', variables: [] }],
    runtimeVariables: { kept: 'yes' },
    items: [
      { uid: 'i1', type: 'http-request', name: 'login', pathname: `${COLLECTION}/login.bru`, request: { method: 'POST', url: 'http://localhost:9/login' } },
      { uid: 'i2', type: 'http-request', name: 'get order', pathname: `${COLLECTION}/orders/get order.bru`, request: { method: 'GET', url: 'http://localhost:9/orders?t={{token}}' } }
    ],
    ...overrides
  };
  const state = { collections: { collections: [collection] }, globalEnvironments: { globalEnvironments: [], activeGlobalEnvironmentUid: null } };
  return { collection, getState: () => state, dispatch: jest.fn(async (action) => action), subscribe: () => () => {} };
};

const answer = (status, data) => ({ state: 'success', status, statusText: status === 200 ? 'OK' : '', data, duration: 12, size: 10, requestSent: { url: 'x' } });
const start = (store, mode) => startRun({ store, collectionUid: 'c1', collectionPath: COLLECTION, flowId: 'f1', mode });
const lines = () => getRunLog().map((entry) => [entry.label?.text, ...entry.parts.map((part) => (typeof part === 'string' ? part : part.text))].filter(Boolean).join(' '));

describe('running a flow', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    resetFlowsStore();
    resetRunSessions();
    sendNetworkRequest.mockReset();
    confirmFlowInSensitiveEnvironment.mockReset().mockResolvedValue(true);
    window.ipcRenderer = { invoke: jest.fn(async () => [flow]) };
    await loadFlows(COLLECTION);
  });

  afterEach(() => {
    jest.useRealTimers();
    delete window.ipcRenderer;
  });

  const finish = async (pending) => {
    await jest.runAllTimersAsync();
    return pending;
  };

  it('sends the requests like Bruno does, handing the values of the flow over as runtime variables', async () => {
    const store = makeStore();
    sendNetworkRequest.mockResolvedValueOnce(answer(200, { session: { token: 'T1' } })).mockResolvedValueOnce(answer(404, { message: 'nope' }));

    await finish(start(store));

    expect(sendNetworkRequest).toHaveBeenCalledTimes(2);
    const [item, sentCollection, environment, runtimeVariables] = sendNetworkRequest.mock.calls[1];
    expect(item).toMatchObject({ uid: 'i2', name: 'get order', requestUid: expect.any(String) });
    expect(sentCollection).toMatchObject({ uid: 'c1', promptVariables: {}, globalEnvironmentVariables: {} });
    expect(environment).toMatchObject({ uid: 'e1', name: 'Local' });
    expect(runtimeVariables).toEqual({ kept: 'yes', token: 'T1' });
    expect(sendNetworkRequest.mock.calls[0][3]).toEqual({ kept: 'yes' });

    const dispatched = store.dispatch.mock.calls.map(([action]) => `${action.type}:${action.payload.itemUid}`);
    expect(dispatched).toEqual(['initRunRequestEvent:i1', 'responseReceived:i1', 'initRunRequestEvent:i2', 'responseReceived:i2']);
  });

  it('leaves the result on each step and in the output', async () => {
    sendNetworkRequest.mockResolvedValueOnce(answer(200, { session: { token: 'T1' } })).mockResolvedValueOnce(answer(404, { message: 'nope' }));

    await finish(start(makeStore()));

    const session = getRunSession('f1');
    expect(session).toMatchObject({ phase: RUN_PHASE.DONE, outcome: RUN_STATUS.COMPLETED, resume: null });
    expect(session.steps.a).toEqual({ state: 'done', tag: { text: '200 · 12 ms', tone: 'ok' } });
    expect(session.steps.b.tag).toEqual({ text: '404 · 12 ms', tone: 'bad' });
    expect(lines()).toEqual(['Order walk Local', 'login 200 OK · 12 ms', 'get order 404 · 12 ms', 'Finished']);
    expect(getRunLog()[1].detail).toContain('"token": "T1"');
    expect(getRunLog()[2].tone).toBe('bad');
  });

  it('asks before running against a sensitive environment and sends nothing when refused', async () => {
    confirmFlowInSensitiveEnvironment.mockResolvedValue(false);
    const store = makeStore();

    await finish(start(store));

    expect(confirmFlowInSensitiveEnvironment).toHaveBeenCalledWith(store.collection);
    expect(sendNetworkRequest).not.toHaveBeenCalled();
    expect(getRunSession('f1').phase).toBe(RUN_PHASE.IDLE);
    expect(getRunLog()).toEqual([]);
  });

  it('stops at a request that could not be sent and continues from it', async () => {
    const store = makeStore();
    sendNetworkRequest.mockResolvedValueOnce(answer(200, { session: { token: 'T1' } })).mockResolvedValueOnce({ error: 'connect ECONNREFUSED' });

    await finish(start(store));
    expect(getRunSession('f1')).toMatchObject({ phase: RUN_PHASE.PAUSED, outcome: RUN_STATUS.FAILED, resume: { nodeId: 'b' } });
    expect(getRunSession('f1').steps.b.state).toBe('failed');
    expect(lines().pop()).toBe('get order connect ECONNREFUSED');

    sendNetworkRequest.mockResolvedValueOnce(answer(200, {}));
    await finish(start(store, RUN_MODE.CONTINUE));

    expect(sendNetworkRequest).toHaveBeenCalledTimes(3);
    expect(sendNetworkRequest.mock.calls[2][0].uid).toBe('i2');
    expect(sendNetworkRequest.mock.calls[2][3]).toEqual({ kept: 'yes', token: 'T1' });
    expect(getRunSession('f1')).toMatchObject({ phase: RUN_PHASE.DONE, outcome: RUN_STATUS.COMPLETED });
    expect(confirmFlowInSensitiveEnvironment).toHaveBeenCalledTimes(1);
  });

  it('asks again when the environment changed before continuing', async () => {
    const store = makeStore();
    sendNetworkRequest.mockResolvedValueOnce(answer(200, {})).mockResolvedValueOnce({ error: 'down' });
    await finish(start(store));

    store.collection.activeEnvironmentUid = 'e2';
    confirmFlowInSensitiveEnvironment.mockResolvedValue(false);
    await finish(start(store, RUN_MODE.CONTINUE));

    expect(confirmFlowInSensitiveEnvironment).toHaveBeenCalledTimes(2);
    expect(sendNetworkRequest).toHaveBeenCalledTimes(2);
    expect(getRunSession('f1').phase).toBe(RUN_PHASE.PAUSED);
  });

  it('runs one step at a time', async () => {
    const store = makeStore();
    sendNetworkRequest.mockResolvedValue(answer(200, {}));

    await finish(start(store, RUN_MODE.STEP));
    expect(sendNetworkRequest).toHaveBeenCalledTimes(1);
    expect(getRunSession('f1')).toMatchObject({ phase: RUN_PHASE.PAUSED, outcome: RUN_STATUS.PAUSED, resume: { nodeId: 'b' } });

    await finish(start(store, RUN_MODE.STEP));
    expect(sendNetworkRequest).toHaveBeenCalledTimes(2);
    expect(getRunSession('f1').phase).toBe(RUN_PHASE.DONE);
  });

  it('stops a run, cutting the request on its way', async () => {
    const store = makeStore();
    let release;
    sendNetworkRequest.mockImplementationOnce(() => new Promise((resolve) => {
      release = resolve;
    }));

    const pending = start(store);
    await jest.advanceTimersByTimeAsync(500);
    expect(getRunSession('f1').steps.a.state).toBe('running');

    store.collection.items[0].cancelTokenUid = 'token-1';
    stopRun('f1');
    expect(store.dispatch).toHaveBeenCalledWith({ type: 'cancelRequest', cancelTokenUid: 'token-1' });
    release({ isCancel: true, error: 'REQUEST_CANCELLED' });
    await finish(pending);

    expect(getRunSession('f1')).toMatchObject({ phase: RUN_PHASE.PAUSED, outcome: RUN_STATUS.CANCELLED, resume: { nodeId: 'a' } });
    expect(getRunSession('f1').steps.a.state).toBe('waiting');
    expect(lines().pop()).toBe('Stopped');
  });

  it('reports a request that is no longer in the collection', async () => {
    await finish(start(makeStore({ items: [] })));
    expect(sendNetworkRequest).not.toHaveBeenCalled();
    expect(lines().pop()).toBe('Request The request of this step is no longer in the collection');
    expect(getRunSession('f1').outcome).toBe(RUN_STATUS.FAILED);
  });

  it('writes the problems of a flow that cannot run to the output', async () => {
    resetFlowsStore();
    window.ipcRenderer.invoke.mockResolvedValue([{ ...flow, edges: [] }]);
    await loadFlows(COLLECTION);

    await finish(start(makeStore()));

    expect(lines()).toEqual(['Order walk Local', 'Start Connect Start to the first step']);
    expect(getRunSession('f1')).toMatchObject({ phase: RUN_PHASE.DONE, outcome: RUN_STATUS.INVALID });
  });

  it('tells in the output when a loop is left and what a note says', async () => {
    const loop = {
      ...flow,
      nodes: [node('start', 'start'), node('r', 'repeat', { times: '4' }), node('n', 'note', { message: 'trying' }), node('out', 'leave')],
      edges: [edge('start', 'out', 'r'), edge('r', 'body', 'n'), edge('n', 'out', 'out')]
    };
    resetFlowsStore();
    window.ipcRenderer.invoke.mockResolvedValue([loop]);
    await loadFlows(COLLECTION);

    await finish(start(makeStore()));

    expect(lines()).toEqual(['Order walk Local', 'Repeat Round 1 of 4', 'Note trying', 'Leave loop Leaves the loop on round 1 of 4', 'Finished']);
    expect(getRunSession('f1')).toMatchObject({ phase: RUN_PHASE.DONE, outcome: RUN_STATUS.COMPLETED });
  });

  it('counts the tests the requests carry and tells the total at the end', async () => {
    const store = makeStore();
    store.collection.items[0].testResults = [{ status: 'pass', description: 'Status 200' }, { status: 'fail', description: 'code is 0' }];
    store.collection.items[1].assertionResults = [{ status: 'pass', lhsExpr: 'res.status', rhsExpr: 'eq 200' }];
    sendNetworkRequest.mockResolvedValueOnce(answer(200, { session: { token: 'T' } })).mockResolvedValueOnce(answer(200, {}));
    await finish(start(store));
    expect(lines()).toEqual(expect.arrayContaining(['login 200 OK · 12 ms · 1/2 tests', 'get order 200 OK · 12 ms · 1/1 tests', 'Tests 2 pass · 1 fail']));
    expect(getRunSession('f1')).toMatchObject({ outcome: RUN_STATUS.COMPLETED, tests: { passed: 2, failed: 1 } });
    expect(getRunLog().find((entry) => entry.label?.text === 'login').detail).toContain('✗ code is 0');
  });

  it('runs from a step with what the last run left, and only that step when asked', async () => {
    const store = makeStore();
    sendNetworkRequest.mockResolvedValue(answer(200, { session: { token: 'T-1' } }));
    await finish(start(store));
    sendNetworkRequest.mockClear();

    await finish(startRun({ store, collectionUid: 'c1', collectionPath: COLLECTION, flowId: 'f1', from: 'b' }));
    expect(sendNetworkRequest).toHaveBeenCalledTimes(1);
    expect(sendNetworkRequest.mock.calls[0][3]).toMatchObject({ token: 'T-1' });
    expect(lines()).toContain('Order walk Local · from the step get order');

    sendNetworkRequest.mockClear();
    await finish(startRun({ store, collectionUid: 'c1', collectionPath: COLLECTION, flowId: 'f1', from: 'a', only: true }));
    expect(sendNetworkRequest).toHaveBeenCalledTimes(1);
    expect(getRunSession('f1').phase).toBe(RUN_PHASE.PAUSED);
  });

  it('passes the answers to the questions of Start, and tells what happens inside a flow run by a step', async () => {
    const inner = { ...flow, id: 'inner', name: 'Login flow', nodes: [node('start', 'start'), node('a', 'request', { pathname: 'login.bru' })], edges: [edge('start', 'out', 'a')] };
    const outer = {
      ...flow,
      id: 'outer',
      name: 'Outer',
      nodes: [node('start', 'start', { questions: [{ id: 'q', name: 'who', value: 'guest' }] }), node('s', 'flow', { flowId: 'inner' }), node('b', 'request', { pathname: 'orders/get order.bru' })],
      edges: [edge('start', 'out', 's'), edge('s', 'out', 'b'), edge('start', 'field:q', 'b', 'var:token')]
    };
    window.ipcRenderer.invoke = jest.fn(async () => [flow, inner, outer]);
    await loadFlows(COLLECTION);
    const store = makeStore();
    sendNetworkRequest.mockResolvedValue(answer(200, {}));
    await finish(startRun({ store, collectionUid: 'c1', collectionPath: COLLECTION, flowId: 'outer', inputs: { q: 'ana' } }));
    expect(sendNetworkRequest).toHaveBeenCalledTimes(2);
    expect(sendNetworkRequest.mock.calls[1][3]).toMatchObject({ token: 'ana', who: 'ana' });
    expect(lines()).toEqual(expect.arrayContaining(['Start who = ana', 'Login flow › login 200 OK · 12 ms', 'Run a flow Ran the flow Login flow']));
  });

  it('ignores a second start while a flow is running', async () => {
    const store = makeStore();
    sendNetworkRequest.mockResolvedValue(answer(200, {}));
    const first = start(store);
    const second = start(store);
    await finish(Promise.all([first, second]));
    expect(sendNetworkRequest).toHaveBeenCalledTimes(2);
  });
});
