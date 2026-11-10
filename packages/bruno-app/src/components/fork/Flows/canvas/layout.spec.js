jest.mock('utils/common', () => ({ uuid: () => 'uid' }));

import { GAP, settle, tidy } from './layout';

const box = (id, x, y, width = 240, height = 100) => ({ id, x, y, width, height });
const overlap = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const apply = (boxes, moved) => boxes.map((item) => ({ ...item, ...moved[item.id] }));
const anyOverlap = (boxes) => boxes.some((a, i) => boxes.some((b, j) => i < j && overlap(a, b)));

describe('canvas layout', () => {
  describe('settle', () => {
    it('leaves alone what does not overlap', () => {
      expect(settle([box('a', 0, 0), box('b', 400, 0)], ['b'])).toEqual({});
    });

    it('moves a dropped step to the nearest free spot, never the ones that were there', () => {
      const boxes = [box('a', 0, 0), box('b', 200, 80)];
      const moved = settle(boxes, ['b']);
      expect(Object.keys(moved)).toEqual(['b']);
      expect(moved.b).toEqual({ x: 200, y: 100 + GAP });
      expect(anyOverlap(apply(boxes, moved))).toBe(false);
    });

    it('pushes the steps below when one grows', () => {
      const boxes = [box('grown', 0, 0, 240, 200), box('below', 0, 120), box('further', 0, 240)];
      const moved = settle(boxes, ['below', 'further']);
      expect(anyOverlap(apply(boxes, moved))).toBe(false);
      expect(moved.below.y).toBeGreaterThanOrEqual(200 + GAP);
    });

    it('finds room in a crowded spot', () => {
      const boxes = [box('a', 0, 0), box('b', 260, 0), box('c', 0, 120), box('d', 260, 120), box('new', 130, 60)];
      const moved = settle(boxes, ['new']);
      expect(anyOverlap(apply(boxes, moved))).toBe(false);
    });
  });

  describe('tidy', () => {
    const node = (id, type, config = {}) => ({ id, type, x: 999, y: 999, config });
    const edge = (source, sourcePort, target, targetPort = 'in') => ({ id: `${source}-${target}`, source, sourcePort, target, targetPort, bends: [1, 2, 3] });
    const flow = {
      nodes: [node('start', 'start'), node('a', 'request'), node('if', 'if'), node('yes', 'request'), node('no', 'request'), node('list', 'list'), node('add', 'listappend'), node('spare', 'wait')],
      edges: [
        edge('start', 'out', 'a'),
        edge('a', 'out', 'if'),
        edge('if', 'yes', 'yes'),
        edge('if', 'no', 'no'),
        edge('yes', 'out', 'add'),
        edge('list', 'field:items', 'add', 'list')
      ]
    };
    const tidied = tidy(flow, () => 100);
    const at = (id) => tidied.nodes.find((item) => item.id === id);

    it('puts the steps in columns following the order of the flow', () => {
      expect(at('start').x).toBeLessThan(at('a').x);
      expect(at('a').x).toBeLessThan(at('if').x);
      expect(at('yes').x).toBe(at('no').x);
      expect(at('yes').y).toBeLessThan(at('no').y);
      expect(at('add').x).toBeGreaterThan(at('yes').x);
    });

    it('puts a list under the step that fills it and loose steps at the bottom', () => {
      expect(at('list').x).toBe(at('add').x);
      expect(at('list').y).toBeGreaterThan(at('add').y);
      expect(at('spare').y).toBeGreaterThan(Math.max(at('no').y, at('list').y));
    });

    it('leaves nothing overlapping and forgets the shape of the cables', () => {
      expect(anyOverlap(tidied.nodes.map((item) => box(item.id, item.x, item.y)))).toBe(false);
      expect(tidied.edges.every((item) => !('bends' in item))).toBe(true);
    });

    it('copes with a loop', () => {
      const loop = {
        nodes: [node('start', 'start'), node('r', 'repeat'), node('a', 'request'), node('after', 'request')],
        edges: [edge('start', 'out', 'r'), edge('r', 'body', 'a'), edge('a', 'out', 'r', 'loopback'), edge('r', 'exit', 'after')]
      };
      const result = tidy(loop, () => 100);
      expect(anyOverlap(result.nodes.map((item) => box(item.id, item.x, item.y)))).toBe(false);
    });
  });
});
