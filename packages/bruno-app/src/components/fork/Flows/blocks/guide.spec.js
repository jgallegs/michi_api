import { act, renderHook } from '@testing-library/react';
import { closeGuide, noteGuideRun, readGuide, resetGuides, startGuide, tickGuidePoint, useGuide } from './guide';

const node = (id, type, config = {}) => ({ id, type, config });
const edge = (source, sourcePort, target, targetPort) => ({ source, sourcePort, target, targetPort });

const points = [
  { id: 'p1', nodeId: 'a', text: 'Choose the first request', check: 'request' },
  { id: 'p2', nodeId: 'b', text: 'Give it its value', check: 'value' },
  { id: 'p3', nodeId: 'if', text: 'Say what to compare', check: 'input:left' },
  { id: 'p4', nodeId: 'if', text: 'Go on from Yes', check: 'output:yes' },
  { id: 'p5', nodeId: 'each', text: 'Choose the list', check: 'list' },
  { id: 'p6', nodeId: 'w', text: 'Set the seconds', check: 'manual' },
  { id: 'p7', nodeId: null, text: 'Press Run', check: 'run' }
];

const guide = { title: 'Block', translate: true, points, ticked: [], ran: false };

const flowOf = (configs = {}, edges = []) => ({
  nodes: [node('a', 'request', configs.a), node('b', 'request', configs.b), node('if', 'if', configs.if), node('each', 'foreach'), node('w', 'wait')],
  edges
});

const state = (flow, from = guide) => readGuide(from, flow).points.map((point) => `${point.number}${point.done ? ' done' : point.current ? ' next' : ''}`);

describe('guide of a block', () => {
  it('numbers the points and marks the first one that is not done as the next', () => {
    expect(state(flowOf())).toEqual(['1 next', '2', '3', '4', '5', '6', '7']);
    expect(readGuide(guide, flowOf())).toMatchObject({ title: 'Block', translate: true, finished: false });
  });

  it('ticks each point off when the canvas shows it is done', () => {
    const done = flowOf(
      { a: { pathname: 'login.bru' }, if: { left: 'x' } },
      [edge('a', 'field:token', 'b', 'var:token'), edge('if', 'yes', 'w', 'in'), edge('a', 'field:orders', 'each', 'value:list')]
    );
    expect(state(done)).toEqual(['1 done', '2 done', '3 done', '4 done', '5 done', '6 next', '7']);
  });

  it('counts a value typed in the step, and an input fed by a cable', () => {
    const typed = flowOf({ b: { variables: { id: '7', page: '' } } }, [edge('a', 'status', 'if', 'value:left')]);
    expect(state(typed)).toEqual(['1 next', '2 done', '3 done', '4', '5', '6', '7']);
    expect(state(flowOf({ b: { variables: { page: ' ' } } }))[1]).toBe('2');
  });

  it('takes the points ticked by hand and the run as done', () => {
    const all = flowOf(
      { a: { pathname: 'login.bru' }, if: { left: 'x' } },
      [edge('a', 'field:token', 'b', 'var:token'), edge('if', 'yes', 'w', 'in'), edge('a', 'field:orders', 'each', 'value:list')]
    );
    expect(readGuide({ ...guide, ticked: ['p6'], ran: true }, all).finished).toBe(true);
    expect(state(flowOf(), { ...guide, ticked: ['p1'] })[0]).toBe('1 done');
  });

  it('leaves out the points about steps that are gone', () => {
    const flow = { nodes: [node('a', 'request')], edges: [] };
    expect(readGuide(guide, flow).points.map((point) => [point.id, point.number])).toEqual([['p1', 1], ['p7', 2]]);
  });

  it('reads nothing when there is no guide', () => {
    expect(readGuide(null, flowOf())).toBeNull();
  });
});

describe('guide store', () => {
  beforeEach(() => resetGuides());

  it('keeps one guide per flow: ticked by hand, told about the run and closed', () => {
    const flow = { nodes: [node('w', 'wait')], edges: [] };
    const short = [{ id: 'p1', nodeId: 'w', text: 'Set the seconds', check: 'manual' }, { id: 'p2', nodeId: null, text: 'Press Run', check: 'run' }];
    const { result } = renderHook(() => useGuide('f1'));
    const done = () => readGuide(result.current, flow).points.map((point) => point.done);
    expect(result.current).toBeNull();

    act(() => startGuide('f1', { title: 'Wait', translate: true, points: short }));
    expect(done()).toEqual([false, false]);

    act(() => tickGuidePoint('f1', 'p1'));
    expect(done()).toEqual([true, false]);
    act(() => tickGuidePoint('f1', 'p1'));
    expect(done()).toEqual([false, false]);

    act(() => {
      tickGuidePoint('f1', 'p1');
      noteGuideRun('f1');
    });
    expect(done()).toEqual([true, true]);

    act(() => closeGuide('f1'));
    expect(result.current).toBeNull();
    act(() => noteGuideRun('f1'));
    expect(result.current).toBeNull();
  });
});
