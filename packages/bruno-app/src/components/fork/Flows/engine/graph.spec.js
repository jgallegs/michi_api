import { findLoopBody, findNextEdge, findReachedNodeIds, validateFlow } from './graph';

const start = { id: 'start', type: 'start' };
const request = (id) => ({ id, type: 'request', config: { pathname: `${id}.bru` } });
const repeat = (id, times = 2) => ({ id, type: 'repeat', config: { times } });
const edge = (source, sourcePort, target, targetPort = 'in') => ({ source, sourcePort, target, targetPort });
const flowOf = (nodes, edges) => ({ nodes: [start, ...nodes], edges });
const codes = (flow, options) => validateFlow(flow, options).map((item) => item.code);

describe('flow graph', () => {
  it('accepts a straight line from Start', () => {
    expect(codes(flowOf([request('a'), request('b')], [edge('start', 'out', 'a'), edge('a', 'out', 'b')]))).toEqual([]);
  });

  it('needs exactly one Start, connected to something', () => {
    expect(codes({ nodes: [], edges: [] })).toEqual(['no-start']);
    expect(codes({ nodes: [start, { id: 'other', type: 'start' }], edges: [] })).toEqual(['several-starts']);
    expect(codes(flowOf([request('a')], []))).toEqual(['start-not-connected']);
    expect(codes(flowOf([request('a')], [edge('a', 'out', 'start')]))).toEqual(['invalid-start-cable']);
  });

  it('reports unknown steps and cables to missing steps', () => {
    expect(codes(flowOf([{ id: 'a', type: 'script' }], []))).toEqual(['unknown-step']);
    expect(codes(flowOf([request('a')], [edge('start', 'out', 'gone')]))).toEqual(['broken-cable']);
  });

  it('only checks the steps a run can get to', () => {
    const unset = { id: 'spare', type: 'request', config: {} };
    expect(codes(flowOf([request('a'), unset], [edge('start', 'out', 'a')]))).toEqual([]);
    expect(codes(flowOf([unset], [edge('start', 'out', 'spare')]))).toEqual(['request-not-set']);
  });

  it('continues from a given step when asked to', () => {
    const flow = flowOf([request('a'), request('b')], [edge('start', 'out', 'a')]);
    expect(codes(flow, { startNodeId: 'b' })).toEqual([]);
    expect(codes(flow, { startNodeId: 'gone' })).toEqual(['unknown-start']);
  });

  it('continues through a value cable when the flow output is not connected', () => {
    const flow = flowOf([request('a'), request('b')], [edge('start', 'out', 'a'), edge('a', 'field:id', 'b', 'var:id')]);
    expect(codes(flow)).toEqual([]);
    expect(findNextEdge(flow, flow.nodes[1], 'out').target).toBe('b');
  });

  it('goes to the nearest step when a value feeds several steps in a row', () => {
    const flow = flowOf(
      [request('login'), request('b'), request('c')],
      [
        edge('start', 'out', 'login'),
        edge('login', 'field:token', 'c', 'var:token'),
        edge('login', 'field:token', 'b', 'var:token'),
        edge('b', 'field:id', 'c', 'var:id')
      ]
    );
    expect(codes(flow)).toEqual([]);
    expect(findNextEdge(flow, flow.nodes[1], 'out').target).toBe('b');
  });

  it('does not follow a value cable into a step that already has its place in the order', () => {
    const flow = flowOf(
      [repeat('r'), request('a'), request('after')],
      [edge('start', 'out', 'r'), edge('r', 'body', 'a'), edge('r', 'exit', 'after'), edge('a', 'field:id', 'after', 'var:id')]
    );
    expect(codes(flow)).toEqual([]);
    expect(findNextEdge(flow, flow.nodes[2], 'out')).toBeNull();
  });

  it('does not let a branch take a value cable', () => {
    const flow = flowOf([repeat('r'), request('b')], [edge('start', 'out', 'r'), edge('r', 'field:index', 'b', 'var:i')]);
    expect(findNextEdge(flow, flow.nodes[1], 'exit')).toBeNull();
  });

  it('refuses a step that continues to several steps', () => {
    const flow = flowOf(
      [request('a'), request('b'), request('c')],
      [edge('start', 'out', 'a'), edge('a', 'out', 'b'), edge('a', 'out', 'c')]
    );
    expect(codes(flow)).toEqual(['several-next-steps']);
  });

  it('refuses cycles that do not go through an end of iteration', () => {
    const flow = flowOf([request('a'), request('b')], [edge('start', 'out', 'a'), edge('a', 'out', 'b'), edge('b', 'out', 'a')]);
    expect(codes(flow)).toEqual(['cycle']);
  });

  it('accepts a loop closed through the end of iteration input', () => {
    const flow = flowOf([repeat('r'), request('a')], [edge('start', 'out', 'r'), edge('r', 'body', 'a'), edge('a', 'out', 'r', 'loopback')]);
    expect(codes(flow)).toEqual([]);
  });

  it('only allows the end of iteration input on a Repeat', () => {
    const flow = flowOf([request('a'), request('b')], [edge('start', 'out', 'a'), edge('a', 'out', 'b', 'loopback')]);
    expect(codes(flow)).toEqual(['invalid-loopback']);
  });

  it('requires Add to list to be connected to a List', () => {
    const list = { id: 'l', type: 'list', config: {} };
    const append = { id: 'p', type: 'listappend', config: { value: 'x' } };
    const toAppend = edge('start', 'out', 'p');
    expect(codes(flowOf([append], [toAppend]))).toEqual(['list-not-connected']);
    expect(codes(flowOf([list, append], [toAppend, edge('l', 'field:items', 'p', 'list')]))).toEqual([]);
    expect(codes(flowOf([request('a'), append], [toAppend, edge('a', 'out', 'p', 'list')]))).toEqual(['invalid-list-cable']);
  });

  it('does not treat a cable from a List as running order', () => {
    const list = { id: 'l', type: 'list', config: {} };
    const flow = flowOf([list, request('a')], [edge('l', 'field:items', 'a', 'var:all')]);
    expect(codes(flow)).toEqual(['start-not-connected']);
  });

  it('tells which steps a run can get to', () => {
    const flow = flowOf([request('a'), request('spare')], [edge('start', 'out', 'a')]);
    expect([...findReachedNodeIds(flow)]).toEqual(['start', 'a']);
  });

  it('finds the steps a Repeat runs on every iteration, nested repeats included', () => {
    const flow = flowOf(
      [repeat('r'), request('a'), repeat('inner'), request('b'), request('after')],
      [
        edge('start', 'out', 'r'),
        edge('r', 'body', 'a'),
        edge('a', 'out', 'inner'),
        edge('inner', 'body', 'b'),
        edge('b', 'out', 'inner', 'loopback'),
        edge('inner', 'exit', 'r', 'loopback'),
        edge('r', 'exit', 'after')
      ]
    );
    expect([...findLoopBody(flow, flow.nodes[1])].sort()).toEqual(['a', 'b', 'inner']);
    expect([...findLoopBody(flow, flow.nodes[3])]).toEqual(['b']);
  });
});
