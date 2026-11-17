const PLACEHOLDER = /\{\{\s*([^{}]+?)\s*\}\}/g;
const WHOLE_PLACEHOLDER = /^\s*\{\{\s*([^{}]+?)\s*\}\}\s*$/;
const INDEX_SEGMENT = /^-?\d+$/;

const isNil = (value) => value === undefined || value === null;

const readProperty = (container, key) => {
  if (isNil(container)) {
    return undefined;
  }
  return Object.prototype.hasOwnProperty.call(Object(container), key) ? container[key] : undefined;
};

// A number picks one item of a list, counting from the end when it is negative.
const readItem = (list, position) => list[position < 0 ? list.length + position : position];

// "?name=value" picks the first item whose field is that value. Dots and percent signs of the value
// travel written as %2E and %25, so the path can still be cut at its dots.
const WHERE_SEGMENT = '?';
const readWhere = (segment) => {
  const cut = segment.indexOf('=');
  const value = segment.slice(cut + 1).replace(/%2E/g, '.').replace(/%25/g, '%');
  return { key: segment.slice(1, cut), value };
};
const findItem = (list, segment) => {
  const { key, value } = readWhere(segment);
  return list.find((item) => String(readProperty(item, key) ?? '') === value);
};

// Response fields are offered without indexes, so a named field inside a list reads its first element.
export const getByPath = (value, path) =>
  String(path || '')
    .split('.')
    .filter(Boolean)
    .reduce((current, segment) => {
      const isWhere = segment.startsWith(WHERE_SEGMENT) && segment.includes('=');
      if (Array.isArray(current)) {
        if (isWhere) {
          return findItem(current, segment);
        }
        return INDEX_SEGMENT.test(segment) ? readItem(current, Number(segment)) : readProperty(current[0], segment);
      }
      return isWhere ? undefined : readProperty(current, segment);
    }, value);

const toText = (value) => (typeof value === 'object' ? JSON.stringify(value) : String(value));

// Replaces {{name}} with plain lookups; nothing here is ever evaluated. A text that is only a placeholder
// keeps the type of the value, and an unknown name stays as written so it is still visible.
export const interpolate = (text, variables) => {
  if (typeof text !== 'string') {
    return text;
  }
  const whole = WHOLE_PLACEHOLDER.exec(text);
  if (whole && !isNil(variables[whole[1]])) {
    return variables[whole[1]];
  }
  return text.replace(PLACEHOLDER, (placeholder, name) => (isNil(variables[name]) ? placeholder : toText(variables[name])));
};

const isEmpty = (value) => isNil(value) || value === '' || (Array.isArray(value) && value.length === 0);

const OPERATORS = {
  equals: (left, right) => String(left) === String(right),
  notEquals: (left, right) => String(left) !== String(right),
  greater: (left, right) => Number(left) > Number(right),
  less: (left, right) => Number(left) < Number(right),
  greaterEqual: (left, right) => Number(left) >= Number(right),
  lessEqual: (left, right) => Number(left) <= Number(right),
  contains: (left, right) => String(left).includes(String(right)),
  notContains: (left, right) => !String(left).includes(String(right)),
  startsWith: (left, right) => String(left).startsWith(String(right)),
  endsWith: (left, right) => String(left).endsWith(String(right)),
  isEmpty: (left) => isEmpty(left),
  isNotEmpty: (left) => !isEmpty(left),
  isTrue: (left) => left === true || left === 'true',
  isFalse: (left) => left === false || left === 'false'
};

export const COMPARISON_OPERATORS = Object.keys(OPERATORS);

// Comparisons that only look at the first value.
export const isSingleValueOperator = (operator) => ['isEmpty', 'isNotEmpty', 'isTrue', 'isFalse'].includes(operator);

export const compareValues = (left, operator, right) => {
  if (!Object.prototype.hasOwnProperty.call(OPERATORS, operator)) {
    throw new Error(`Unknown comparison: ${operator}`);
  }
  return OPERATORS[operator](left, right);
};
