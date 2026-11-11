// Field paths as the canvas writes them: names joined by dots, where a number picks one item of a list
// ("orders.2.id" is the id of the third order, "orders.-1.id" the one of the last) and "?name=value"
// picks the first item whose field is that value ("orders.?state=open.id"). Without either, a list is
// entered through its first item.
export const MAX_FIELDS = 300;
export const MAX_DEPTH = 8;

const INDEX = /^-?\d+$/;
const WHERE = /^\?[^=]+=/;
const BRACKET_INDEX = /\[\s*(-?\d+)\s*\]/g;
const BRACKET_WHERE = /\[\s*([\w-]+)\s*=\s*([^\]]*?)\s*\]/g;

// A segment that says which item of a list is read, by position or by what it holds.
export const isIndexSegment = (segment) => INDEX.test(String(segment)) || WHERE.test(String(segment));

// The value goes with its dots and percent signs written out, so the path can still be cut at its dots.
export const whereSegment = ({ key, value }) => `?${key}=${String(value).replace(/%/g, '%25').replace(/\./g, '%2E')}`;

const readPick = (segment) => {
  if (INDEX.test(segment)) {
    return { index: Number(segment) };
  }
  const cut = segment.indexOf('=');
  return { index: null, where: { key: segment.slice(1, cut), value: segment.slice(cut + 1).replace(/%2E/g, '.').replace(/%25/g, '%') } };
};

export const splitFieldPath = (path) => String(path || '').split('.').filter(Boolean);

// People who write scripts type "orders[2].id"; it means the same as "orders.2.id".
export const toFieldPath = (text) =>
  splitFieldPath(
    String(text || '')
      .trim()
      .replace(BRACKET_WHERE, (whole, key, value) => `.${whereSegment({ key, value })}.`)
      .replace(BRACKET_INDEX, '.$1.')
  ).join('.');

export const plainFieldPath = (path) =>
  splitFieldPath(path)
    .filter((segment) => !isIndexSegment(segment))
    .join('.');

// What a value looks like: the paths of its fields and which of them hold a list.
export const describeShape = (value) => {
  const fields = [];
  const lists = [];
  const visit = (current, prefix, depth) => {
    const container = Array.isArray(current) ? current[0] : current;
    if (!container || typeof container !== 'object' || Array.isArray(container) || depth > MAX_DEPTH) {
      return;
    }
    Object.keys(container).forEach((key) => {
      if (fields.length >= MAX_FIELDS) {
        return;
      }
      const path = prefix ? `${prefix}.${key}` : key;
      fields.push(path);
      if (Array.isArray(container[key])) {
        lists.push(path);
      }
      visit(container[key], path, depth + 1);
    });
  };
  visit(value, '', 0);
  return { fields, lists };
};

export const EMPTY_SHAPE = { fields: [], lists: [] };

// Joins what several sources know, keeping the order of the first ones.
export const mergeShapes = (shapes) => {
  const known = shapes.filter(Boolean);
  return {
    fields: [...new Set(known.flatMap((shape) => shape.fields || []))].slice(0, MAX_FIELDS),
    lists: [...new Set(known.flatMap((shape) => shape.lists || []))]
  };
};

// The lists a path goes through, in order. Each one says which item is read: a number written in the
// path, or none, which reads the first. A list at the very end ("whole") is handed out complete unless
// it has a number.
export const listLevels = (path, lists = []) => {
  const segments = splitFieldPath(path);
  const levels = [];
  const names = [];
  segments.forEach((segment, at) => {
    if (isIndexSegment(segment)) {
      return;
    }
    names.push(segment);
    const list = names.join('.');
    const next = segments[at + 1];
    const hasIndex = next !== undefined && isIndexSegment(next);
    const isLast = !segments.slice(at + 1).some((later) => !isIndexSegment(later));
    if (hasIndex || lists.includes(list)) {
      levels.push({ list, name: segment, index: null, ...(hasIndex ? readPick(next) : {}), whole: isLast });
    }
  });
  return levels;
};

// The same path reading another item of one of its lists; without an index, the whole list when it is
// the end of the path. The first item is written without a number, which is how the fields are offered,
// except at the end of the path, where the number is what tells an item from the whole list.
export const withListPosition = (path, list, index) => {
  const segments = splitFieldPath(path);
  const result = [];
  const names = [];
  segments.forEach((segment, at) => {
    if (isIndexSegment(segment)) {
      const owner = names.join('.');
      if (owner !== list) {
        result.push(segment);
      }
      return;
    }
    names.push(segment);
    result.push(segment);
    if (names.join('.') === list) {
      const isLast = !segments.slice(at + 1).some((later) => !isIndexSegment(later));
      if (index && typeof index === 'object') {
        result.push(whereSegment(index));
      } else if (Number.isInteger(index) && (index !== 0 || isLast)) {
        result.push(String(index));
      }
    }
  });
  return result.join('.');
};

// How a position reads on a step: "#1" is the first item, "last" the last one and "all" the whole list.
export const describePosition = ({ index, whole, where }) => {
  if (where) {
    return { text: `${where.key}=${where.value}` };
  }
  if (index === null && whole) {
    return { text: 'all', translate: true };
  }
  if (index === null || index === 0) {
    return { text: '#1' };
  }
  if (index === -1) {
    return { text: 'last', translate: true };
  }
  return index > 0 ? { text: `#${index + 1}` } : { text: `[${index}]` };
};
