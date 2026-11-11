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
