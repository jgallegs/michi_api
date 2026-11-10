import { findNextEdge, validateFlow } from './graph';

const request = (id) => ({ id, type: 'request', config: { pathname: `${id}.bru` } });
const edge = (source, sourcePort, target, targetPort = 'in') => ({ source, sourcePort, target, targetPort });
const codes = (flow, options) => validateFlow(flow, options).map((item) => item.code);

describe('flow graph', () => {
  it('accepts a straight line', () => {
    expect(codes({ nodes: [request('a'), request('b')], edges: [edge('a', 'out', 'b')] })).toEqual([]);
  });

  it('reports an empty flow and unknown steps', () => {
    expect(codes({ nodes: [], edges: [] })).toEqual(['empty']);
    expect(codes({ nodes: [{ id: 'a', type: 'script' }], edges: [] })).toEqual(['unknown-step']);
  });

  it('reports cables to missing steps and requests without a target', () => {
    expect(codes({ nodes: [request('a')], edges: [edge('a', 'out', 'gone')] })).toEqual(['broken-cable']);
    expect(codes({ nodes: [{ id: 'a', type: 'request', config: {} }], edges: [] })).toEqual(['request-not-set']);
  });

  it('asks which step goes first when there are several', () => {
    const flow = { nodes: [request('a'), request('b')], edges: [] };
    expect(codes(flow)).toEqual(['several-starts', 'several-starts']);
    expect(codes(flow, { startNodeId: 'b' })).toEqual([]);
    expect(codes(flow, { startNodeId: 'gone' })).toEqual(['unknown-start']);
  });

  it('continues through a value cable when the flow output is not connected', () => {
    const flow = { nodes: [request('a'), request('b')], edges: [edge('a', 'field:id', 'b', 'var:id')] };
    expect(codes(flow)).toEqual([]);
    expect(findNextEdge(flow, flow.nodes[0], 'out').target).toBe('b');
  });

  it('goes to the nearest step when a value feeds several steps in a row', () => {
    const flow = {
      nodes: [request('login'), request('b'), request('c')],
      edges: [edge('login', 'field:token', 'c', 'var:token'), edge('login', 'field:token', 'b', 'var:token'), edge('b', 'out', 'c')]
    };
    expect(codes(flow)).toEqual([]);
    expect(findNextEdge(flow, flow.nodes[0], 'out').target).toBe('b');
  });

  it('does not let a branch take a value cable', () => {
    const repeat = { id: 'r', type: 'repeat', config: { times: 2 } };
    const flow = { nodes: [repeat, request('b')], edges: [edge('r', 'field:index', 'b', 'var:i')] };
    expect(findNextEdge(flow, repeat, 'exit')).toBeNull();
  });

  it('refuses a step that continues to several steps', () => {
    const flow = {
      nodes: [request('a'), request('b'), request('c')],
      edges: [edge('a', 'out', 'b'), edge('a', 'out', 'c')]
    };
    expect(codes(flow)).toEqual(['several-next-steps']);
  });

  it('refuses cycles that do not go through an end of iteration', () => {
    const flow = {
      nodes: [request('s'), request('a'), request('b')],
      edges: [edge('s', 'out', 'a'), edge('a', 'out', 'b'), edge('b', 'out', 'a')]
    };
    expect(codes(flow)).toEqual(['cycle']);
  });

  it('accepts a loop closed through the end of iteration input', () => {
    const flow = {
      nodes: [{ id: 'r', type: 'repeat', config: { times: 2 } }, request('a')],
      edges: [edge('r', 'body', 'a'), edge('a', 'out', 'r', 'loopback')]
    };
    expect(codes(flow)).toEqual([]);
  });

  it('only allows the end of iteration input on a Repeat', () => {
    const flow = { nodes: [request('a'), request('b')], edges: [edge('a', 'out', 'b', 'loopback')] };
    expect(codes(flow)).toEqual(['invalid-loopback']);
  });

  it('requires Add to list to be connected to a List, which is not a starting step', () => {
    const list = { id: 'l', type: 'list', config: {} };
    const append = { id: 'p', type: 'listappend', config: { value: 'x' } };
    expect(codes({ nodes: [append], edges: [] })).toEqual(['list-not-connected']);
    expect(codes({ nodes: [list, append], edges: [edge('l', 'field:items', 'p', 'list')] })).toEqual([]);
    expect(codes({ nodes: [request('a'), append], edges: [edge('a', 'out', 'p', 'list')] })).toEqual(['invalid-list-cable']);
  });

  it('does not treat a cable from a List as running order', () => {
    const list = { id: 'l', type: 'list', config: {} };
    const flow = { nodes: [list, request('a')], edges: [edge('l', 'field:items', 'a', 'var:all')] };
    expect(codes(flow)).toEqual([]);
  });
});
