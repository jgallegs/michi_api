const PLACEHOLDER = /\{\{\s*([^{}]+?)\s*\}\}/g;
const WHOLE_PLACEHOLDER = /^\s*\{\{\s*([^{}]+?)\s*\}\}\s*$/;
const INDEX_SEGMENT = /^\d+$/;

const isNil = (value) => value === undefined || value === null;

const readProperty = (container, key) => {
  if (isNil(container)) {
    return undefined;
  }
  return Object.prototype.hasOwnProperty.call(Object(container), key) ? container[key] : undefined;
};

// Response fields are offered without indexes, so a named field inside a list reads its first element.
export const getByPath = (value, path) =>
  String(path || '')
    .split('.')
    .filter(Boolean)
    .reduce((current, segment) => {
      const container = Array.isArray(current) && !INDEX_SEGMENT.test(segment) ? current[0] : current;
      return readProperty(container, segment);
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

// A value in a node's settings: a text or number typed by the user, or a reference picked from a list.
export const resolveValue = (spec, { variables, outputs }) => {
  if (spec === null || typeof spec !== 'object') {
    return interpolate(spec, variables);
  }
  if (spec.kind === 'variable') {
    return variables[spec.name];
  }
  if (spec.kind === 'output') {
    return getByPath(outputs[spec.nodeId], spec.path);
  }
  throw new Error(`Unknown kind of value: ${spec.kind}`);
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

export const compareValues = (left, operator, right) => {
  if (!Object.prototype.hasOwnProperty.call(OPERATORS, operator)) {
    throw new Error(`Unknown comparison: ${operator}`);
  }
  return OPERATORS[operator](left, right);
};
