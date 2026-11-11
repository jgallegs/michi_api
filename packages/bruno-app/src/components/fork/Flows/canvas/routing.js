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

// Room between two cables that run side by side, and how far a cable may be pushed off its middle.
export const LANE = 10;
const LANES_EACH_SIDE = 24;
// What each fault of a way costs: the cheapest way wins. Going under a step is worse than crossing a few
// cables, and running along another cable is the worst, because both read as one.
const CROSSING_COST = 100;
const THROUGH_COST = 400;
const OVERLAP_COST = 1000;
const ROUND_COST = 3;
const MAX_CABLES_TO_SPREAD = 200;

const stretchesOf = (points) => points.slice(1).map((to, index) => ({ from: points[index], to }));
const isUpright = (stretch) => stretch.from.x === stretch.to.x;
const span = (a, b) => [Math.min(a, b), Math.max(a, b)];

const crosses = (a, b) => {
  if (isUpright(a) === isUpright(b)) {
    return false;
  }
  const [upright, flat] = isUpright(a) ? [a, b] : [b, a];
  const [top, bottom] = span(upright.from.y, upright.to.y);
  const [left, right] = span(flat.from.x, flat.to.x);
  return upright.from.x > left && upright.from.x < right && flat.from.y > top && flat.from.y < bottom;
};

// Two upright stretches so close that they read as one line.
const runsOver = (a, b) => {
  if (!isUpright(a) || !isUpright(b) || Math.abs(a.from.x - b.from.x) >= LANE) {
    return false;
  }
  const [topA, bottomA] = span(a.from.y, a.to.y);
  const [topB, bottomB] = span(b.from.y, b.to.y);
  return Math.min(bottomA, bottomB) > Math.max(topA, topB);
};

// A stretch that goes under a step, where it cannot be seen, or so close to its edge that it reads as
// part of it. A cable has to touch the steps it joins, so those only count when it goes under them.
const CLEARANCE = LANE - 1;

const goesThrough = (stretch, box, isOwn) => {
  const room = isOwn ? -1 : CLEARANCE;
  const [left, right] = span(stretch.from.x, stretch.to.x);
  const [top, bottom] = span(stretch.from.y, stretch.to.y);
  return right > box.x - room && left < box.x + box.width + room && bottom > box.y - room && top < box.y + box.height + room;
};

const faultsOf = (stretches, cable, placed, boxes) => {
  let cost = 0;
  stretches.forEach((mine) => {
    boxes.forEach((box) => {
      cost += goesThrough(mine, box, (cable.ends || []).includes(box.id)) ? THROUGH_COST : 0;
    });
    placed.forEach((other) => {
      if (other.net !== cable.net) {
        other.stretches.forEach((theirs) => {
          cost += (crosses(mine, theirs) ? CROSSING_COST : 0) + (runsOver(mine, theirs) ? OVERLAP_COST : 0);
        });
      }
    });
  });
  return cost;
};

// Cables nobody has shaped all turn in the middle of the gap they cross, so several of them end up on
// top of each other, cross more than they need or hide under a step. This moves the turn of each one
// sideways, in steps of a lane, to where it has the fewest faults; when every straight way goes under a
// step, the cable goes round it, below or above. Cables that leave the same output ("net") belong
// together and may share a line. "boxes" are the steps, and "ends" the two a cable joins. Returns the
// new turns of the cables that move.
export const spreadCables = (cables, boxes = []) => {
  const moved = new Map();
  if (cables.length > MAX_CABLES_TO_SPREAD) {
    return moved;
  }
  const isFree = (cable) => !cable.fixed && cable.bends.length === 1;
  const placed = cables.filter((cable) => !isFree(cable)).map((cable) => ({ net: cable.net, stretches: stretchesOf(routePoints(cable.start, cable.end, cable.bends)) }));
  cables
    .filter(isFree)
    .sort((a, b) => a.bends[0] - b.bends[0] || a.start.y - b.start.y || a.end.y - b.end.y)
    .forEach((cable) => {
      const middle = cable.bends[0];
      let best = null;
      const consider = (bends, effort) => {
        const stretches = stretchesOf(routePoints(cable.start, cable.end, bends));
        const cost = effort + faultsOf(stretches, cable, placed, boxes);
        if (!best || cost < best.cost) {
          best = { bends, cost, stretches };
        }
      };
      for (let attempt = 0; attempt <= 2 * LANES_EACH_SIDE; attempt += 1) {
        const offset = (attempt % 2 ? 1 : -1) * Math.ceil(attempt / 2) * LANE;
        const x = middle + offset;
        if (x >= cable.start.x + STUB && x <= cable.end.x - STUB) {
          consider([x], Math.abs(offset) / LANE);
          // Lanes are tried from the middle outwards: the first one without a fault is the best there is.
          if (best.cost < CROSSING_COST) {
            break;
          }
        }
      }
      if (best && best.cost >= THROUGH_COST) {
        const inTheWay = boxes.filter((box) => best.stretches.some((stretch) => goesThrough(stretch, box, (cable.ends || []).includes(box.id))));
        if (inTheWay.length) {
          const below = Math.max(...inTheWay.map((box) => box.y + box.height)) + 2 * LANE;
          const above = Math.min(...inTheWay.map((box) => box.y)) - 2 * LANE;
          [below, above].forEach((y) => consider([cable.start.x + STUB, snap(y), cable.end.x - STUB], ROUND_COST));
        }
      }
      if (!best) {
        return;
      }
      placed.push({ net: cable.net, stretches: best.stretches });
      if (best.bends.length !== 1 || best.bends[0] !== middle) {
        moved.set(cable.id, best.bends);
      }
    });
  return moved;
};

// Where to mark which way a cable runs: the middle of its longest stretch, when it is long enough for
// the mark to fit without touching a turn.
const MIN_STRETCH_FOR_MARK = 56;

export const directionMark = (points) => {
  let best = null;
  for (let index = 1; index < points.length; index += 1) {
    const [from, to] = [points[index - 1], points[index]];
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    if (length >= MIN_STRETCH_FOR_MARK && (!best || length > best.length)) {
      best = { length, x: (from.x + to.x) / 2, y: (from.y + to.y) / 2, angle: (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI };
    }
  }
  return best ? { x: best.x, y: best.y, angle: Math.round(best.angle) } : null;
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
