import { snap } from './editing';

// Cables only run along the grid: they leave a port sideways, turn at right angles and arrive sideways.
// "bends" lists the turns between both ports as x, y, x, ... x: go across to x, up or down to y, and so
// on; the last turn drops to the height of the target port.
export const STUB = 20;
const DETOUR = 30;
const CORNER = 6;

const lowestEdge = (box) => box.y + box.height;

// The way a cable goes when nobody has shaped it: straight across with one step in the middle, or
// around the steps when the target is behind the source.
export const defaultBends = (start, end, sourceBox, targetBox) => {
  if (end.x - start.x >= 2 * STUB) {
    return [snap((start.x + end.x) / 2)];
  }
  const gapBelowSource = targetBox.y - lowestEdge(sourceBox);
  const gapBelowTarget = sourceBox.y - lowestEdge(targetBox);
  const between = [gapBelowSource, gapBelowTarget].some((gap) => gap >= 2 * STUB);
  const detour = between
    ? (Math.max(sourceBox.y, targetBox.y) + Math.min(lowestEdge(sourceBox), lowestEdge(targetBox))) / 2
    : Math.max(lowestEdge(sourceBox), lowestEdge(targetBox)) + DETOUR;
  return [start.x + STUB, snap(detour), end.x - STUB];
};

export const routePoints = (start, end, bends) => {
  const points = [{ x: start.x, y: start.y }];
  bends.forEach((coordinate, index) => {
    const last = points[points.length - 1];
    points.push(index % 2 === 0 ? { x: coordinate, y: last.y } : { x: last.x, y: coordinate });
  });
  points.push({ x: points[points.length - 1].x, y: end.y }, { x: end.x, y: end.y });
  return points;
};

const towards = (from, to, distance) => {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const ratio = length === 0 ? 0 : Math.min(distance, length / 2) / length;
  return { x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio };
};

// SVG path through the points, with the corners slightly rounded.
export const pathThrough = (points) => {
  const commands = [`M ${points[0].x} ${points[0].y}`];
  for (let index = 1; index < points.length - 1; index += 1) {
    const corner = points[index];
    const before = towards(corner, points[index - 1], CORNER);
    const after = towards(corner, points[index + 1], CORNER);
    commands.push(`L ${before.x} ${before.y}`, `Q ${corner.x} ${corner.y} ${after.x} ${after.y}`);
  }
  const last = points[points.length - 1];
  commands.push(`L ${last.x} ${last.y}`);
  return commands.join(' ');
};

const distanceToSegment = (point, from, to) => {
  const clamp = (value, a, b) => Math.max(Math.min(a, b), Math.min(Math.max(a, b), value));
  return Math.hypot(point.x - clamp(point.x, from.x, to.x), point.y - clamp(point.y, from.y, to.y));
};

export const nearestSegment = (points, point) => {
  let best = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    if (distanceToSegment(point, points[index], points[index + 1]) < distanceToSegment(point, points[best], points[best + 1])) {
      best = index;
    }
  }
  return best;
};

// Grabbing a stretch of a cable: the turns that describe the cable while it is dragged, and which of
// them follows the pointer. The first and last stretches are tied to their ports, so pulling one of
// them adds a new elbow instead.
export const grabSegment = (bends, segment, start, end) => {
  if (segment === 0) {
    return { bends: [start.x + STUB, start.y, ...bends], index: 1 };
  }
  if (segment === bends.length + 1) {
    return { bends: [...bends, end.y, end.x - STUB], index: bends.length };
  }
  return { bends, index: segment - 1 };
};

export const dragBend = (bends, index, point) => bends.map((coordinate, position) => (position === index ? snap(index % 2 === 0 ? point.x : point.y) : coordinate));

// Drops the elbows that ended up flat, so a cable never keeps turns nobody can see.
export const simplifyBends = (bends, start, end) => {
  const result = [...bends];
  for (let changed = true; changed;) {
    changed = false;
    for (let index = 1; index < result.length && !changed; index += 2) {
      const levelBefore = index === 1 ? start.y : result[index - 2];
      const isLast = index === result.length - 2;
      if (result[index] === levelBefore) {
        result.splice(index - 1, 2);
        changed = true;
      } else if (result[index + 1] === result[index - 1] || (isLast && result[index] === end.y)) {
        result.splice(index, 2);
        changed = true;
      }
    }
  }
  return result;
};
