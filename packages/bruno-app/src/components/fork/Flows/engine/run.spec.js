import { RUN_STATUS, runFlow } from './run';

const start = { id: 'start', type: 'start' };
const request = (id) => ({ id, type: 'request', name: id, config: { pathname: `${id}.bru` } });
const repeat = (id, times) => ({ id, type: 'repeat', config: { times } });
const edge = (source, sourcePort, target, targetPort = 'in') => ({ source, sourcePort, target, targetPort });
const flowOf = (nodes, edges) => ({ nodes: [start, ...nodes], edges: [edge('start', 'out', nodes.find((node) => node.type !== 'list').id), ...edges] });

const makeHost = (responses = {}) => {
  const sent = [];
  return {
    sent,
    sendRequest: jest.fn(async (node, variables) => {
      sent.push({ id: node.id, variables });
      const response = responses[node.id];
      const value = typeof response === 'function' ? response(sent.filter((item) => item.id === node.id).length) : response;
      return value || { status: 200, data: {} };
    }),
    sleep: jest.fn(async () => {})
  };
};

const run = async (flow, host, options) => {
  const events = [];
  const result = await runFlow(flow, host, { ...options, onEvent: (event) => events.push(event) });
  return { result, events, listOf: (id) => events.filter((event) => event.detail?.listNodeId === id).pop()?.detail.items };
};

describe('runFlow', () => {
  it('refuses an invalid flow without sending anything', async () => {
    const host = makeHost();
    const { result } = await run({ nodes: [start, request('a')], edges: [] }, host);
    expect(result).toMatchObject({ status: RUN_STATUS.INVALID, issues: [{ code: 'start-not-connected' }] });
    expect(host.sendRequest).not.toHaveBeenCalled();
  });

  it('runs requests in order and passes wired fields as variables', async () => {
    const host = makeHost({ a: { status: 200, data: { order: { id: 'A1' } } } });
    const flow = flowOf([request('a'), request('b')], [edge('a', 'field:order.id', 'b', 'var:orderId')]);

    const { result } = await run(flow, host);

    expect(result.status).toBe(RUN_STATUS.COMPLETED);
    expect(host.sent.map((item) => item.id)).toEqual(['a', 'b']);
    expect(host.sent[1].variables).toEqual({ orderId: 'A1' });
  });

  it('leaves spare steps out of the run', async () => {
    const host = makeHost();
    const flow = { nodes: [start, request('a'), request('spare')], edges: [edge('start', 'out', 'a')] };
    await run(flow, host);
    expect(host.sent.map((item) => item.id)).toEqual(['a']);
  });

  it('passes the status code and the whole response through cables', async () => {
    const host = makeHost({ a: { status: 201, data: { id: 7 } } });
    const flow = flowOf([request('a'), request('b')], [edge('a', 'status', 'b', 'var:code'), edge('a', 'field:', 'b', 'var:body')]);
    await run(flow, host);
    expect(host.sent[1].variables).toEqual({ code: 201, body: { id: 7 } });
  });

  it('uses the values typed in the step for the variables of its request', async () => {
    const typedRequest = { ...request('a'), config: { pathname: 'a.bru', variables: { city: 'in {{where}}', page: '', id: 'typed' } } };
    const flow = flowOf([request('first'), typedRequest], [edge('first', 'out', 'a'), edge('first', 'field:id', 'a', 'var:id')]);
    const host = makeHost({ first: { status: 200, data: { id: 'wired' } } });
    await run(flow, host, { environment: { where: 'Lugo' } });
    expect(host.sent[1].variables).toEqual({ city: 'in Lugo', id: 'wired' });
  });

  it('warns when a wired field has no value', async () => {
    const flow = flowOf([request('a'), request('b')], [edge('a', 'field:missing', 'b', 'var:x')]);
    const host = makeHost();
    const { events } = await run(flow, host);
    expect(events.find((event) => event.type === 'warning')).toMatchObject({ nodeId: 'b', message: expect.stringContaining('"x"') });
    expect(host.sent[1].variables).toEqual({});
  });

  describe('If', () => {
    const branches = [request('y'), request('n')];
    const branchEdges = [edge('if', 'yes', 'y'), edge('if', 'no', 'n')];

    it('compares typed values', async () => {
      const flow = flowOf([{ id: 'if', type: 'if', config: { check: 'compare', left: '5', operator: 'greater', right: '3' } }, ...branches], branchEdges);
      const host = makeHost();
      await run(flow, host);
      expect(host.sent.map((item) => item.id)).toEqual(['y']);
    });

    it('compares a value that arrives through a cable', async () => {
      const flow = flowOf(
        [request('a'), { id: 'if', type: 'if', config: { check: 'compare', left: 'ignored', operator: 'equals', right: 'open' } }, ...branches],
        [edge('a', 'out', 'if'), edge('a', 'field:state', 'if', 'value:left'), ...branchEdges]
      );
      const host = makeHost({ a: { status: 200, data: { state: 'closed' } } });
      await run(flow, host);
      expect(host.sent.map((item) => item.id)).toEqual(['a', 'n']);
    });

    it('checks the last response without failing the run on an error status', async () => {
      const flow = flowOf([request('a'), { id: 'if', type: 'if', config: {} }, ...branches], [edge('a', 'out', 'if'), ...branchEdges]);
      const host = makeHost({ a: { status: 500, data: {} } });
      const { result } = await run(flow, host);
      expect(result.status).toBe(RUN_STATUS.COMPLETED);
      expect(host.sent.map((item) => item.id)).toEqual(['a', 'n']);
    });

    it('checks the status code of the last response', async () => {
      const flow = flowOf(
        [request('a'), { id: 'if', type: 'if', config: { check: 'status', status: '404' } }, ...branches],
        [edge('a', 'out', 'if'), ...branchEdges]
      );
      const host = makeHost({ a: { status: 404, data: {} } });
      await run(flow, host);
      expect(host.sent.map((item) => item.id)).toEqual(['a', 'y']);
    });

    it('fails when there is no response to check', async () => {
      const flow = flowOf([{ id: 'if', type: 'if', config: {} }], []);
      const { result } = await run(flow, makeHost());
      expect(result).toMatchObject({ status: RUN_STATUS.FAILED, nodeId: 'if', error: expect.stringContaining('no response') });
    });
  });

  describe('Validate', () => {
    const validate = (config) => ({ id: 'v', type: 'validate', config });

    it('goes on through Not valid when the value is the one that means so', async () => {
      const flow = flowOf(
        [request('a'), validate({ operator: 'notEquals', right: '0' }), request('good'), request('bad')],
        [edge('a', 'out', 'v'), edge('a', 'field:code', 'v', 'value:left'), edge('v', 'valid', 'good'), edge('v', 'invalid', 'bad')]
      );
      const refused = makeHost({ a: { status: 200, data: { code: 7 } } });
      const { events } = await run(flow, refused);
      expect(refused.sent.map((item) => item.id)).toEqual(['a', 'bad']);
      expect(events.find((event) => event.nodeId === 'v' && event.detail)).toMatchObject({ detail: { kind: 'validation', valid: false, left: 7, operator: 'notEquals', right: '0' } });

      const accepted = makeHost({ a: { status: 200, data: { code: 0 } } });
      await run(flow, accepted);
      expect(accepted.sent.map((item) => item.id)).toEqual(['a', 'good']);
    });

    it('keeps out of a list the responses that are not valid, and the loop goes on', async () => {
      const flow = flowOf(
        [{ id: 'list', type: 'list', config: {} }, repeat('r', 4), request('a'), validate({ operator: 'equals', right: 'ERROR' }), { id: 'add', type: 'listappend', config: {} }],
        [
          edge('r', 'body', 'a'),
          edge('a', 'out', 'v'),
          edge('a', 'field:state', 'v', 'value:left'),
          edge('v', 'valid', 'add'),
          edge('a', 'field:id', 'add', 'value:value'),
          edge('list', 'field:items', 'add', 'list')
        ]
      );
      const host = makeHost({ a: (call) => ({ status: 200, data: { id: call, state: call % 2 ? 'OK' : 'ERROR' } }) });
      const { result, listOf } = await run(flow, host);
      expect(result.status).toBe(RUN_STATUS.COMPLETED);
      expect(host.sent).toHaveLength(4);
      expect(listOf('list')).toEqual([1, 3]);
    });
  });

  it('repeats through the end of iteration input and leaves through exit', async () => {
    const flow = flowOf(
      [repeat('r', 3), request('a'), request('after')],
      [edge('r', 'body', 'a'), edge('a', 'out', 'r', 'loopback'), edge('r', 'exit', 'after')]
    );
    const host = makeHost();
    const { events } = await run(flow, host);
    expect(host.sent.map((item) => item.id)).toEqual(['a', 'a', 'a', 'after']);
    expect(events.filter((event) => event.type === 'iteration').map((event) => event.index)).toEqual([2, 3]);
  });

  it('starts the next iteration when the body reaches a dead end', async () => {
    const flow = flowOf([repeat('r', 2), request('a')], [edge('r', 'body', 'a')]);
    const host = makeHost();
    const { result } = await run(flow, host);
    expect(result.status).toBe(RUN_STATUS.COMPLETED);
    expect(host.sent).toHaveLength(2);
  });

  it('does not leave the loop through a value cable to a step after it', async () => {
    const flow = flowOf(
      [repeat('r', 2), request('a'), request('after')],
      [edge('r', 'body', 'a'), edge('r', 'exit', 'after'), edge('a', 'field:id', 'after', 'var:last')]
    );
    const host = makeHost({ a: (call) => ({ status: 200, data: { id: call } }) });
    await run(flow, host);
    expect(host.sent.map((item) => item.id)).toEqual(['a', 'a', 'after']);
    expect(host.sent[2].variables).toEqual({ last: 2 });
  });

  it('takes the number of repetitions from a cable and skips the body for zero', async () => {
    const flow = flowOf(
      [request('count'), repeat('r', 5), request('a'), request('after')],
      [edge('count', 'out', 'r'), edge('count', 'field:total', 'r', 'value:times'), edge('r', 'body', 'a'), edge('r', 'exit', 'after')]
    );
    const host = makeHost({ count: { status: 200, data: { total: 0 } } });
    await run(flow, host);
    expect(host.sent.map((item) => item.id)).toEqual(['count', 'after']);
  });

  it('runs nested repeats completely on every outer iteration', async () => {
    const flow = flowOf(
      [repeat('o', 2), repeat('i', 3), request('a')],
      [edge('o', 'body', 'i'), edge('i', 'body', 'a'), edge('a', 'out', 'i', 'loopback'), edge('i', 'exit', 'o', 'loopback')]
    );
    const host = makeHost();
    await run(flow, host);
    expect(host.sent).toHaveLength(6);
  });

  it('exposes the iteration number to the steps of the body', async () => {
    const flow = flowOf([repeat('r', 2), request('a')], [edge('r', 'body', 'a'), edge('r', 'field:index', 'a', 'var:turn')]);
    const host = makeHost();
    await run(flow, host);
    expect(host.sent.map((item) => item.variables.turn)).toEqual([1, 2]);
  });

  it('collects one value per iteration into a list', async () => {
    const flow = flowOf(
      [
        { id: 'list', type: 'list', config: { name: 'numbers' } },
        repeat('r', 3),
        request('a'),
        { id: 'add', type: 'listappend', config: {} },
        request('after')
      ],
      [
        edge('r', 'body', 'a'),
        edge('a', 'out', 'add'),
        edge('a', 'field:number', 'add', 'value:value'),
        edge('list', 'field:items', 'add', 'list'),
        edge('add', 'out', 'r', 'loopback'),
        edge('r', 'exit', 'after'),
        edge('list', 'field:items', 'after', 'var:all')
      ]
    );
    const host = makeHost({ a: (call) => ({ status: 200, data: { number: `N${call}` } }) });
    const { listOf } = await run(flow, host);

    expect(listOf('list')).toEqual(['N1', 'N2', 'N3']);
    expect(host.sent[3].variables.all).toEqual(['N1', 'N2', 'N3']);
    expect(host.sent[3].variables.numbers).toEqual(['N1', 'N2', 'N3']);
  });

  it('collects fields of two requests as objects, keeping the position of missing values', async () => {
    const fields = [{ id: 'f1', key: 'first' }, { id: 'f2', key: 'second' }, { id: 'f3', key: 'source', value: 'typed' }];
    const flow = flowOf(
      [{ id: 'list', type: 'list', config: {} }, request('a'), request('b'), { id: 'add', type: 'listappend', config: { mode: 'object', fields } }],
      [
        edge('a', 'out', 'b'),
        edge('b', 'out', 'add'),
        edge('a', 'field:id', 'add', 'value:f1'),
        edge('b', 'field:nope', 'add', 'value:f2'),
        edge('list', 'field:items', 'add', 'list')
      ]
    );
    const host = makeHost({ a: { status: 200, data: { id: 1 } } });
    const { listOf, events } = await run(flow, host);
    expect(listOf('list')).toEqual([{ first: 1, second: null, source: 'typed' }]);
    expect(events.some((event) => event.type === 'warning' && event.message.includes('"second"'))).toBe(true);
  });

  it('adds to the list chosen in the step, without a cable between them', async () => {
    const flow = flowOf(
      [
        { id: 'one', type: 'list', config: {} },
        { id: 'two', type: 'list', config: {} },
        request('a'),
        { id: 'add', type: 'listappend', config: { list: 'two' } }
      ],
      [edge('a', 'out', 'add'), edge('a', 'field:id', 'add', 'value:value')]
    );
    const { listOf, result } = await run(flow, makeHost({ a: { status: 200, data: { id: 7 } } }));
    expect(result.status).toBe(RUN_STATUS.COMPLETED);
    expect(listOf('two')).toEqual([7]);
    expect(listOf('one')).toBeUndefined();
  });

  it('starts every run with an empty list', async () => {
    const flow = flowOf(
      [{ id: 'list', type: 'list', config: {} }, { id: 'add', type: 'listappend', config: { value: 'x' } }],
      [edge('list', 'field:items', 'add', 'list')]
    );
    await run(flow, makeHost());
    const { listOf } = await run(flow, makeHost());
    expect(listOf('list')).toEqual(['x']);
  });

  it('keeps values for later steps and reads the environment in texts', async () => {
    const flow = flowOf([{ id: 's', type: 'setvalue', config: { name: 'greeting', value: 'hi {{who}}' } }, request('a')], [edge('s', 'out', 'a')]);
    const host = makeHost();
    await run(flow, host, { environment: { who: 'there', secret: 'x' } });
    expect(host.sent[0].variables).toEqual({ greeting: 'hi there' });
  });

  it('waits the given seconds', async () => {
    const flow = flowOf([{ id: 'w', type: 'wait', config: { seconds: '1.5' } }, request('b')], [edge('w', 'out', 'b')]);
    const host = makeHost();
    await run(flow, host);
    expect(host.sleep).toHaveBeenCalledWith(1500, undefined);
    expect(host.sent.map((item) => item.id)).toEqual(['b']);
  });

  it('waits before each step when asked to, so the run can be followed', async () => {
    const flow = flowOf([request('a'), request('b')], [edge('a', 'out', 'b')]);
    const host = makeHost();
    await run(flow, host, { stepDelay: 150 });
    expect(host.sleep.mock.calls).toEqual([[150, undefined], [150, undefined]]);
  });

  it('ends at a Stop step', async () => {
    const flow = flowOf([{ id: 's', type: 'stop', config: { message: 'done {{who}}' } }], []);
    const { result, events } = await run(flow, makeHost(), { environment: { who: 'here' } });
    expect(result.status).toBe(RUN_STATUS.STOPPED);
    expect(events.pop().detail).toEqual({ kind: 'stop', message: 'done here' });
  });

  it('rejects an invalid number of repetitions', async () => {
    const flow = flowOf([repeat('r', 'many')], []);
    const { result } = await run(flow, makeHost());
    expect(result).toMatchObject({ status: RUN_STATUS.FAILED, nodeId: 'r', error: expect.stringContaining('whole number') });
  });

  describe('leaving a loop', () => {
    const leave = { id: 'leave', type: 'leave', config: {} };
    const check = { id: 'if', type: 'if', config: { check: 'success' } };
    const retry = flowOf(
      [repeat('r', 5), request('a'), check, leave, { id: 'w', type: 'wait', config: { seconds: 1 } }, request('after')],
      [edge('r', 'body', 'a'), edge('a', 'out', 'if'), edge('if', 'yes', 'leave'), edge('if', 'no', 'w'), edge('r', 'exit', 'after')]
    );

    it('ends the loop early and goes on from its exit', async () => {
      const host = makeHost({ a: (call) => ({ status: call < 3 ? 503 : 200, data: {} }) });
      const { result, events } = await run(retry, host);
      expect(result.status).toBe(RUN_STATUS.COMPLETED);
      expect(host.sent.map((item) => item.id)).toEqual(['a', 'a', 'a', 'after']);
      expect(host.sleep).toHaveBeenCalledTimes(2);
      expect(events.find((event) => event.detail?.kind === 'leave').detail).toEqual({ kind: 'leave', index: 3, times: 5 });
    });

    it('ends only the innermost loop', async () => {
      const flow = flowOf([repeat('outer', 2), repeat('inner', 5), request('a'), leave], [edge('outer', 'body', 'inner'), edge('inner', 'body', 'a'), edge('a', 'out', 'leave')]);
      const host = makeHost();
      const { result } = await run(flow, host);
      expect(result.status).toBe(RUN_STATUS.COMPLETED);
      expect(host.sent).toHaveLength(2);
    });

    it('is refused outside a loop', async () => {
      const { result } = await run(flowOf([request('a'), leave], [edge('a', 'out', 'leave')]), makeHost());
      expect(result).toMatchObject({ status: RUN_STATUS.INVALID, issues: [{ code: 'leave-outside-loop', nodeId: 'leave' }] });
    });
  });

  describe('going through a list', () => {
    const each = { id: 'each', type: 'foreach', config: {} };

    it('runs the body once per item, handing out the item, its fields and the round number', async () => {
      const flow = flowOf(
        [request('all'), each, request('one'), request('after')],
        [
          edge('all', 'out', 'each'),
          edge('all', 'field:orders', 'each', 'value:list'),
          edge('each', 'body', 'one'),
          edge('each', 'field:item.id', 'one', 'var:id'),
          edge('each', 'field:item', 'one', 'var:whole'),
          edge('each', 'field:index', 'one', 'var:turn'),
          edge('each', 'exit', 'after')
        ]
      );
      const host = makeHost({ all: { status: 200, data: { orders: [{ id: 'A' }, { id: 'B' }] } } });
      const { result, events } = await run(flow, host);
      expect(result.status).toBe(RUN_STATUS.COMPLETED);
      expect(host.sent.map((item) => item.id)).toEqual(['all', 'one', 'one', 'after']);
      expect(host.sent[1].variables).toEqual({ id: 'A', whole: { id: 'A' }, turn: 1 });
      expect(host.sent[2].variables).toEqual({ id: 'B', whole: { id: 'B' }, turn: 2 });
      expect(events.filter((event) => event.type === 'iteration')).toMatchObject([{ nodeId: 'each', index: 2, times: 2 }]);
    });

    it('goes through a list filled earlier in the flow', async () => {
      const list = { id: 'list', type: 'list', config: {} };
      const add = { id: 'add', type: 'listappend', config: { value: 'x' } };
      const flow = flowOf(
        [list, repeat('r', 3), add, each, request('one')],
        [edge('r', 'body', 'add'), edge('list', 'field:items', 'add', 'list'), edge('r', 'exit', 'each'), edge('list', 'field:items', 'each', 'value:list'), edge('each', 'body', 'one')]
      );
      const host = makeHost();
      await run(flow, host);
      expect(host.sent).toHaveLength(3);
    });

    it('skips the body for an empty list', async () => {
      const flow = flowOf([request('all'), each, request('one'), request('after')], [
        edge('all', 'out', 'each'),
        edge('all', 'field:orders', 'each', 'value:list'),
        edge('each', 'body', 'one'),
        edge('each', 'exit', 'after')
      ]);
      const host = makeHost({ all: { status: 200, data: { orders: [] } } });
      await run(flow, host);
      expect(host.sent.map((item) => item.id)).toEqual(['all', 'after']);
    });

    it('fails when what arrives is not a list', async () => {
      const flow = flowOf([request('all'), each], [edge('all', 'out', 'each'), edge('all', 'field:total', 'each', 'value:list')]);
      const { result } = await run(flow, makeHost({ all: { status: 200, data: { total: 3 } } }));
      expect(result).toMatchObject({ status: RUN_STATUS.FAILED, nodeId: 'each', error: expect.stringContaining('needs a list') });
    });

    it('continues on the same item after a failed request', async () => {
      const flow = flowOf([request('all'), each, request('one')], [edge('all', 'out', 'each'), edge('all', 'field:ids', 'each', 'value:list'), edge('each', 'body', 'one'), edge('each', 'field:item', 'one', 'var:id')]);
      const host = makeHost({ all: { status: 200, data: { ids: [7, 8, 9] } }, one: (call) => (call === 2 ? { error: 'connection refused' } : { status: 200, data: {} }) });
      const first = await run(flow, host);
      expect(first.result.status).toBe(RUN_STATUS.FAILED);
      const second = await run(flow, host, { resume: JSON.parse(JSON.stringify(first.result.resume)) });
      expect(second.result.status).toBe(RUN_STATUS.COMPLETED);
      expect(host.sent.filter((item) => item.id === 'one').map((item) => item.variables.id)).toEqual([7, 8, 8, 9]);
    });
  });

  it('writes a note and goes on', async () => {
    const flow = flowOf([{ id: 'n', type: 'note', config: { message: 'checking {{who}}' } }, request('a')], [edge('n', 'out', 'a')]);
    const host = makeHost();
    const { result, events } = await run(flow, host, { environment: { who: 'orders' } });
    expect(result.status).toBe(RUN_STATUS.COMPLETED);
    expect(events.find((event) => event.detail?.kind === 'note').detail.message).toBe('checking orders');
    expect(host.sent).toHaveLength(1);
  });

  describe('interruptions', () => {
    const loopFlow = flowOf(
      [{ id: 'list', type: 'list', config: {} }, repeat('r', 3), request('a'), { id: 'add', type: 'listappend', config: {} }],
      [
        edge('r', 'body', 'a'),
        edge('a', 'out', 'add'),
        edge('a', 'field:n', 'add', 'value:value'),
        edge('list', 'field:items', 'add', 'list'),
        edge('add', 'out', 'r', 'loopback')
      ]
    );

    it('continues from the failed step keeping the loop and the list', async () => {
      const responses = (call) => (call === 2 ? { error: 'connection refused' } : { status: 200, data: { n: call } });
      const host = makeHost({ a: responses });

      const first = await run(loopFlow, host);
      expect(first.result).toMatchObject({ status: RUN_STATUS.FAILED, nodeId: 'a', error: 'connection refused' });
      expect(first.events.find((event) => event.type === 'node-failed')).toMatchObject({ nodeId: 'a' });

      const second = await run(loopFlow, host, { resume: JSON.parse(JSON.stringify(first.result.resume)) });
      expect(second.result.status).toBe(RUN_STATUS.COMPLETED);
      expect(host.sent).toHaveLength(4);
      expect(second.listOf('list')).toEqual([1, 3, 4]);
    });

    it('pauses after each step when running step by step', async () => {
      const flow = flowOf([request('a'), request('b')], [edge('a', 'out', 'b')]);
      const host = makeHost();

      const first = await run(flow, host, { step: true });
      expect(first.result).toMatchObject({ status: RUN_STATUS.PAUSED, nodeId: 'b' });
      expect(host.sent.map((item) => item.id)).toEqual(['a']);

      const second = await run(flow, host, { step: true, resume: first.result.resume });
      expect(second.result.status).toBe(RUN_STATUS.COMPLETED);
      expect(host.sent.map((item) => item.id)).toEqual(['a', 'b']);
    });

    it('stops before the next step when cancelled, and can continue', async () => {
      const controller = new AbortController();
      const flow = flowOf([request('a'), request('b')], [edge('a', 'out', 'b')]);
      const host = makeHost({
        a: () => {
          controller.abort();
          return { status: 200, data: {} };
        }
      });

      const { result } = await run(flow, host, { signal: controller.signal });
      expect(result).toMatchObject({ status: RUN_STATUS.CANCELLED, nodeId: 'b' });
      expect(host.sent.map((item) => item.id)).toEqual(['a']);

      await run(flow, host, { resume: result.resume });
      expect(host.sent.map((item) => item.id)).toEqual(['a', 'b']);
    });

    it('treats a request refused at the sensitive environment check as cancelled', async () => {
      const flow = flowOf([request('a')], []);
      const { result } = await run(flow, makeHost({ a: { cancelled: true } }));
      expect(result).toMatchObject({ status: RUN_STATUS.CANCELLED, nodeId: 'a' });
    });

    it('cuts a wait short when cancelled', async () => {
      const controller = new AbortController();
      const flow = flowOf([{ id: 'w', type: 'wait', config: { seconds: 60 } }], []);
      const host = { sendRequest: jest.fn() };
      const pending = runFlow(flow, host, { signal: controller.signal });
      controller.abort();
      await expect(pending).resolves.toMatchObject({ status: RUN_STATUS.CANCELLED, nodeId: 'w' });
    });
  });
});
