jest.mock('utils/common', () => ({ uuid: () => 'uid' }));

import { STUB, defaultBends, dragBend, grabSegment, nearestSegment, pathThrough, routePoints, simplifyBends } from './routing';

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
});
