import { RUN_STATUS, runFlow } from './run';

const request = (id) => ({ id, type: 'request', name: id, config: { pathname: `${id}.bru` } });
const edge = (source, sourcePort, target, targetPort = 'in') => ({ source, sourcePort, target, targetPort });
const output = (nodeId, path) => ({ kind: 'output', nodeId, path });

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
    const { result } = await run({ nodes: [], edges: [] }, host);
    expect(result.status).toBe(RUN_STATUS.INVALID);
    expect(host.sendRequest).not.toHaveBeenCalled();
  });

  it('runs requests in order and passes wired fields as variables', async () => {
    const host = makeHost({ a: { status: 200, data: { order: { id: 'A1' } } } });
    const flow = { nodes: [request('a'), request('b')], edges: [edge('a', 'field:order.id', 'b', 'var:orderId')] };

    const { result } = await run(flow, host);

    expect(result.status).toBe(RUN_STATUS.COMPLETED);
    expect(host.sent.map((item) => item.id)).toEqual(['a', 'b']);
    expect(host.sent[1].variables).toEqual({ orderId: 'A1' });
  });

  it('warns when a wired field has no value', async () => {
    const flow = { nodes: [request('a'), request('b')], edges: [edge('a', 'field:missing', 'b', 'var:x')] };
    const host = makeHost();
    const { events } = await run(flow, host);
    expect(events.find((event) => event.type === 'warning')).toMatchObject({ nodeId: 'b', message: expect.stringContaining('"x"') });
    expect(host.sent[1].variables).toEqual({});
  });

  it('follows the branch of a comparison', async () => {
    const flow = {
      nodes: [{ id: 'c', type: 'compare', config: { left: '5', operator: 'greater', right: '3' } }, request('y'), request('n')],
      edges: [edge('c', 'yes', 'y'), edge('c', 'no', 'n')]
    };
    const host = makeHost();
    await run(flow, host);
    expect(host.sent.map((item) => item.id)).toEqual(['y']);
  });

  it('checks a response without failing the run on an error status', async () => {
    const flow = {
      nodes: [request('a'), { id: 'k', type: 'checkresponse', config: {} }, request('good'), request('bad')],
      edges: [edge('a', 'out', 'k'), edge('k', 'ok', 'good'), edge('k', 'failed', 'bad')]
    };
    const host = makeHost({ a: { status: 500, data: {} } });
    const { result } = await run(flow, host);
    expect(result.status).toBe(RUN_STATUS.COMPLETED);
    expect(host.sent.map((item) => item.id)).toEqual(['a', 'bad']);
  });

  it('repeats through the end of iteration input and leaves through exit', async () => {
    const flow = {
      nodes: [{ id: 'r', type: 'repeat', config: { times: 3 } }, request('a'), request('after')],
      edges: [edge('r', 'body', 'a'), edge('a', 'out', 'r', 'loopback'), edge('r', 'exit', 'after')]
    };
    const host = makeHost();
    const { events } = await run(flow, host);
    expect(host.sent.map((item) => item.id)).toEqual(['a', 'a', 'a', 'after']);
    expect(events.filter((event) => event.type === 'iteration').map((event) => event.index)).toEqual([2, 3]);
  });

  it('starts the next iteration when the body reaches a dead end', async () => {
    const flow = {
      nodes: [{ id: 'r', type: 'repeat', config: { times: 2 } }, request('a')],
      edges: [edge('r', 'body', 'a')]
    };
    const host = makeHost();
    const { result } = await run(flow, host);
    expect(result.status).toBe(RUN_STATUS.COMPLETED);
    expect(host.sent).toHaveLength(2);
  });

  it('skips the body when repeating zero times', async () => {
    const flow = {
      nodes: [{ id: 'r', type: 'repeat', config: { times: 0 } }, request('a'), request('after')],
      edges: [edge('r', 'body', 'a'), edge('r', 'exit', 'after')]
    };
    const host = makeHost();
    await run(flow, host);
    expect(host.sent.map((item) => item.id)).toEqual(['after']);
  });

  it('runs nested repeats completely on every outer iteration', async () => {
    const flow = {
      nodes: [{ id: 'o', type: 'repeat', config: { times: 2 } }, { id: 'i', type: 'repeat', config: { times: 3 } }, request('a')],
      edges: [edge('o', 'body', 'i'), edge('i', 'body', 'a'), edge('a', 'out', 'i', 'loopback'), edge('i', 'exit', 'o', 'loopback')]
    };
    const host = makeHost();
    await run(flow, host);
    expect(host.sent).toHaveLength(6);
  });

  it('exposes the iteration number to the steps of the body', async () => {
    const flow = {
      nodes: [{ id: 'r', type: 'repeat', config: { times: 2 } }, request('a')],
      edges: [edge('r', 'body', 'a'), edge('r', 'field:index', 'a', 'var:turn')]
    };
    const host = makeHost();
    await run(flow, host);
    expect(host.sent.map((item) => item.variables.turn)).toEqual([1, 2]);
  });

  it('collects one value per iteration into a list', async () => {
    const flow = {
      nodes: [
        { id: 'list', type: 'list', config: { name: 'numbers' } },
        { id: 'r', type: 'repeat', config: { times: 3 } },
        request('a'),
        { id: 'add', type: 'listappend', config: { value: output('a', 'number') } },
        request('after')
      ],
      edges: [
        edge('r', 'body', 'a'),
        edge('a', 'out', 'add'),
        edge('list', 'field:items', 'add', 'list'),
        edge('add', 'out', 'r', 'loopback'),
        edge('r', 'exit', 'after'),
        edge('list', 'field:items', 'after', 'var:all')
      ]
    };
    const host = makeHost({ a: (call) => ({ status: 200, data: { number: `N${call}` } }) });
    const { listOf } = await run(flow, host);

    expect(listOf('list')).toEqual(['N1', 'N2', 'N3']);
    expect(host.sent[3].variables.all).toEqual(['N1', 'N2', 'N3']);
    expect(host.sent[3].variables.numbers).toEqual(['N1', 'N2', 'N3']);
  });

  it('collects fields of two requests as objects, keeping the position of missing values', async () => {
    const flow = {
      nodes: [
        { id: 'list', type: 'list', config: {} },
        request('a'),
        request('b'),
        { id: 'add', type: 'listappend', config: { mode: 'object', fields: [{ key: 'first', value: output('a', 'id') }, { key: 'second', value: output('b', 'nope') }] } }
      ],
      edges: [edge('a', 'out', 'b'), edge('b', 'out', 'add'), edge('list', 'field:items', 'add', 'list')]
    };
    const host = makeHost({ a: { status: 200, data: { id: 1 } } });
    const { listOf, events } = await run(flow, host);
    expect(listOf('list')).toEqual([{ first: 1, second: null }]);
    expect(events.some((event) => event.type === 'warning' && event.message.includes('"second"'))).toBe(true);
  });

  it('starts every run with an empty list', async () => {
    const flow = {
      nodes: [{ id: 'list', type: 'list', config: {} }, { id: 'add', type: 'listappend', config: { value: 'x' } }],
      edges: [edge('list', 'field:items', 'add', 'list')]
    };
    await run(flow, makeHost());
    const { listOf } = await run(flow, makeHost());
    expect(listOf('list')).toEqual(['x']);
  });

  it('keeps values for later steps and reads the environment in texts', async () => {
    const flow = {
      nodes: [{ id: 's', type: 'setvalue', config: { name: 'greeting', value: 'hi {{who}}' } }, request('a')],
      edges: [edge('s', 'out', 'a')]
    };
    const host = makeHost();
    await run(flow, host, { environment: { who: 'there', secret: 'x' } });
    expect(host.sent[0].variables).toEqual({ greeting: 'hi there' });
  });

  it('extracts a field and waits', async () => {
    const flow = {
      nodes: [
        request('a'),
        { id: 'e', type: 'extract', config: { from: output('a', ''), path: 'items.code', saveAs: 'code' } },
        { id: 'w', type: 'wait', config: { milliseconds: '250' } },
        request('b')
      ],
      edges: [edge('a', 'out', 'e'), edge('e', 'out', 'w'), edge('w', 'out', 'b')]
    };
    const host = makeHost({ a: { status: 200, data: { items: [{ code: 'Z' }] } } });
    await run(flow, host);
    expect(host.sleep).toHaveBeenCalledWith(250, undefined);
    expect(host.sent[1].variables).toEqual({ code: 'Z' });
  });

  it('ends at a Stop step', async () => {
    const flow = { nodes: [{ id: 's', type: 'stop', config: {} }], edges: [] };
    const { result } = await run(flow, makeHost());
    expect(result.status).toBe(RUN_STATUS.STOPPED);
  });

  it('rejects an invalid number of repetitions', async () => {
    const flow = { nodes: [{ id: 'r', type: 'repeat', config: { times: 'many' } }], edges: [] };
    const { result } = await run(flow, makeHost());
    expect(result).toMatchObject({ status: RUN_STATUS.FAILED, nodeId: 'r', error: expect.stringContaining('whole number') });
  });

  describe('interruptions', () => {
    const loopFlow = {
      nodes: [
        { id: 'list', type: 'list', config: {} },
        { id: 'r', type: 'repeat', config: { times: 3 } },
        request('a'),
        { id: 'add', type: 'listappend', config: { value: output('a', 'n') } }
      ],
      edges: [
        edge('r', 'body', 'a'),
        edge('a', 'out', 'add'),
        edge('list', 'field:items', 'add', 'list'),
        edge('add', 'out', 'r', 'loopback')
      ]
    };

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

    it('stops before the next step when cancelled, and can continue', async () => {
      const controller = new AbortController();
      const flow = { nodes: [request('a'), request('b')], edges: [edge('a', 'out', 'b')] };
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
      const flow = { nodes: [request('a')], edges: [] };
      const { result } = await run(flow, makeHost({ a: { cancelled: true } }));
      expect(result).toMatchObject({ status: RUN_STATUS.CANCELLED, nodeId: 'a' });
    });

    it('cuts a wait short when cancelled', async () => {
      const controller = new AbortController();
      const flow = { nodes: [{ id: 'w', type: 'wait', config: { milliseconds: 60000 } }], edges: [] };
      const host = { sendRequest: jest.fn() };
      const pending = runFlow(flow, host, { signal: controller.signal });
      controller.abort();
      await expect(pending).resolves.toMatchObject({ status: RUN_STATUS.CANCELLED, nodeId: 'w' });
    });
  });
});
