jest.mock('utils/common', () => ({ uuid: () => 'uid' }));

import { directionMark, spreadCables, STUB, defaultBends, dragBend, grabSegment, nearestSegment, pathThrough, routePoints, simplifyBends } from './routing';

const box = (x, y, width = 240, height = 100) => ({ x, y, width, height });
const isOrthogonal = (points) => points.every((point, index) => index === 0 || point.x === points[index - 1].x || point.y === points[index - 1].y);

describe('cable routing', () => {
  it('goes straight across with one step in the middle when the target is ahead', () => {
    const start = { x: 240, y: 20 };
    const end = { x: 400, y: 120 };
    const bends = defaultBends(start, end, box(0, 0), box(400, 100));
    expect(bends).toEqual([320]);
    expect(routePoints(start, end, bends)).toEqual([start, { x: 320, y: 20 }, { x: 320, y: 120 }, end]);
  });

  it('goes under both steps when the target is behind', () => {
    const start = { x: 640, y: 20 };
    const end = { x: 0, y: 30 };
    const bends = defaultBends(start, end, box(400, 0), box(0, 0, 240, 160));
    expect(bends).toEqual([640 + STUB, 190, -STUB]);
    expect(isOrthogonal(routePoints(start, end, bends))).toBe(true);
  });

  it('goes between the steps when there is room between them', () => {
    const bends = defaultBends({ x: 640, y: 20 }, { x: 0, y: 330 }, box(400, 0), box(0, 300));
    expect(bends[1]).toBe(200);
  });

  it('only ever draws straight stretches at right angles', () => {
    const points = routePoints({ x: 0, y: 0 }, { x: 300, y: 200 }, [50, 80, 120, 150, 260]);
    expect(isOrthogonal(points)).toBe(true);
    expect(points[points.length - 1]).toEqual({ x: 300, y: 200 });
    expect(pathThrough(points).startsWith('M 0 0')).toBe(true);
  });

  it('finds the stretch nearest to a point', () => {
    const points = routePoints({ x: 0, y: 0 }, { x: 200, y: 100 }, [100]);
    expect(nearestSegment(points, { x: 30, y: 4 })).toBe(0);
    expect(nearestSegment(points, { x: 104, y: 50 })).toBe(1);
    expect(nearestSegment(points, { x: 170, y: 96 })).toBe(2);
  });

  describe('shaping by hand', () => {
    const start = { x: 0, y: 0 };
    const end = { x: 200, y: 100 };

    it('moves a middle stretch sideways', () => {
      const grabbed = grabSegment([100], 1, start, end);
      expect(grabbed).toEqual({ bends: [100], index: 0 });
      expect(dragBend(grabbed.bends, grabbed.index, { x: 143, y: 999 })).toEqual([140]);
    });

    it('adds an elbow when the first or the last stretch is pulled', () => {
      const first = grabSegment([100], 0, start, end);
      expect(first).toEqual({ bends: [STUB, 0, 100], index: 1 });
      expect(dragBend(first.bends, first.index, { x: 0, y: -38 })).toEqual([STUB, -40, 100]);

      const last = grabSegment([100], 2, start, end);
      expect(last).toEqual({ bends: [100, 100, 200 - STUB], index: 1 });
      expect(isOrthogonal(routePoints(start, end, dragBend(last.bends, last.index, { x: 0, y: 160 })))).toBe(true);
    });

    it('drops the elbows that end up flat', () => {
      expect(simplifyBends([STUB, 0, 100], start, end)).toEqual([100]);
      expect(simplifyBends([100, 100, 180], start, end)).toEqual([100]);
      expect(simplifyBends([60, 40, 60, 70, 150], start, end)).toEqual([60, 70, 150]);
      expect(simplifyBends([60, 40, 150], start, end)).toEqual([60, 40, 150]);
    });
  });

  it('marks which way a cable runs on its longest stretch, when there is room', () => {
    expect(directionMark([{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 200 }, { x: 60, y: 200 }])).toEqual({ x: 20, y: 100, angle: 90 });
    expect(directionMark([{ x: 300, y: 50 }, { x: 100, y: 50 }])).toEqual({ x: 200, y: 50, angle: 180 });
    expect(directionMark([{ x: 0, y: 0 }, { x: 40, y: 0 }])).toBeNull();
  });

  describe('cables side by side', () => {
    const cable = (id, net, start, end, extra = {}) => ({ id, net, start, end, bends: [(start.x + end.x) / 2], fixed: false, ...extra });

    it('moves apart two cables that would turn on the same line, without making them cross', () => {
      const moved = spreadCables([cable('a', 'one', { x: 0, y: 0 }, { x: 200, y: 100 }), cable('b', 'two', { x: 0, y: 50 }, { x: 200, y: 150 })]);
      expect([...moved.entries()]).toEqual([['b', [90]]]);
    });

    it('lets the cables of one output share their line', () => {
      const moved = spreadCables([cable('a', 'same', { x: 0, y: 0 }, { x: 200, y: 100 }), cable('b', 'same', { x: 0, y: 0 }, { x: 200, y: 150 })]);
      expect(moved.size).toBe(0);
    });

    it('leaves alone the cables that do not get in each other way', () => {
      const moved = spreadCables([cable('a', 'one', { x: 0, y: 0 }, { x: 200, y: 40 }), cable('b', 'two', { x: 0, y: 200 }, { x: 200, y: 260 }), cable('c', 'three', { x: 0, y: 500 }, { x: 200, y: 500 })]);
      expect(moved.size).toBe(0);
    });

    it('never moves a cable somebody shaped, and works around it', () => {
      const shaped = cable('a', 'one', { x: 0, y: 0 }, { x: 200, y: 100 }, { fixed: true });
      const moved = spreadCables([shaped, cable('b', 'two', { x: 0, y: 50 }, { x: 200, y: 150 })]);
      expect(moved.has('a')).toBe(false);
      expect(moved.get('b')).toEqual([90]);
    });

    it('turns beside a step instead of under it', () => {
      // The middle of the gap falls under a step that sits between both ends.
      const between = { x: 150, y: 20, width: 240, height: 120 };
      const moved = spreadCables([cable('a', 'one', { x: 0, y: 160 }, { x: 480, y: 60 })], [between]);
      expect(moved.get('a')).toEqual([400]);
    });

    it('goes round a step when every straight way is under it', () => {
      const between = { x: 100, y: 0, width: 240, height: 120 };
      const moved = spreadCables([cable('a', 'one', { x: 0, y: 60 }, { x: 440, y: 60 })], [between]);
      expect(moved.get('a')).toEqual([STUB, 140, 440 - STUB]);
      const points = routePoints({ x: 0, y: 60 }, { x: 440, y: 60 }, moved.get('a'));
      expect(isOrthogonal(points)).toBe(true);
    });

    it('does not count the steps a cable starts and ends at', () => {
      const source = { id: 's', x: -240, y: 0, width: 240, height: 100 };
      const target = { id: 't', x: 200, y: 60, width: 240, height: 100 };
      expect(spreadCables([cable('a', 'one', { x: 0, y: 20 }, { x: 200, y: 80 }, { ends: ['s', 't'] })], [source, target]).size).toBe(0);
    });

    it('keeps the turn between both ports however crowded the gap is', () => {
      const crowd = Array.from({ length: 12 }, (unused, index) => cable(`c${index}`, `n${index}`, { x: 0, y: index * 10 }, { x: 80, y: 300 + index * 10 }));
      const moved = spreadCables(crowd);
      crowd.forEach((item) => {
        const [x] = moved.get(item.id) || item.bends;
        expect(x).toBeGreaterThanOrEqual(STUB);
        expect(x).toBeLessThanOrEqual(80 - STUB);
      });
    });
  });
});
