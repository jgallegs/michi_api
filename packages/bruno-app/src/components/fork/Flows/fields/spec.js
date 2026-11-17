import { MAX_DEPTH, MAX_FIELDS } from './paths';

// Reads the fields of a response from an OpenAPI or Swagger document, so they can be offered before
// the request has ever been sent. Nothing is fetched: only documents already open in API Specs are read.
const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
const HOST = /^[a-z][a-z0-9+.-]*:\/\/[^/]*/i;
const SPEC_PARAMETER = /^\{[^{}]+\}$/;
const REQUEST_PARAMETER = /^(\{\{[^{}]+\}\}|:[\w-]+)$/;
const LOCAL_REFERENCE = '#/';

const segmentsOf = (path) =>
  String(path || '')
    .trim()
    .split(/[?#]/)[0]
    .replace(HOST, '')
    .split('/')
    .filter(Boolean);

const readPointer = (document, reference) =>
  reference
    .slice(LOCAL_REFERENCE.length)
    .split('/')
    .map((part) => decodeURIComponent(part).replace(/~1/g, '/').replace(/~0/g, '~'))
    .reduce((current, key) => (current && typeof current === 'object' ? current[key] : undefined), document);

// Follows references inside the document. "trail" holds the ones already followed on the way down, so
// a schema that contains itself is read once.
const follow = (document, node, trail) => {
  let current = node;
  let visited = trail;
  while (current && typeof current === 'object' && typeof current.$ref === 'string') {
    if (!current.$ref.startsWith(LOCAL_REFERENCE) || visited.includes(current.$ref)) {
      return { schema: null, trail: visited };
    }
    visited = [...visited, current.$ref];
    current = readPointer(document, current.$ref);
  }
  return { schema: current && typeof current === 'object' ? current : null, trail: visited };
};

const isListSchema = (schema) => Boolean(schema) && (schema.type === 'array' || Boolean(schema.items));

const shapeOfSchema = (document, root) => {
  const fields = [];
  const lists = [];
  const visit = (node, prefix, depth, trail) => {
    const { schema, trail: followed } = follow(document, node, trail);
    if (!schema || depth > MAX_DEPTH) {
      return;
    }
    [...(schema.allOf || []), ...(schema.oneOf || []), ...(schema.anyOf || [])].forEach((part) => visit(part, prefix, depth, followed));
    if (isListSchema(schema)) {
      visit(schema.items, prefix, depth, followed);
      return;
    }
    Object.entries(schema.properties || {}).forEach(([key, property]) => {
      if (fields.length >= MAX_FIELDS) {
        return;
      }
      const path = prefix ? `${prefix}.${key}` : key;
      if (!fields.includes(path)) {
        fields.push(path);
      }
      const inner = follow(document, property, followed).schema;
      if (isListSchema(inner) && !lists.includes(path)) {
        lists.push(path);
      }
      visit(property, path, depth + 1, followed);
    });
  };
  visit(root, '', 0, []);
  return { fields, lists };
};

const successOf = (responses) => {
  const codes = Object.keys(responses || {});
  const code = ['200', '201'].find((wanted) => codes.includes(wanted)) || codes.find((name) => /^2/.test(name)) || (codes.includes('default') ? 'default' : null);
  return code ? responses[code] : null;
};

const schemaOfResponse = (document, operation) => {
  const response = follow(document, successOf(operation?.responses), []).schema;
  if (!response) {
    return null;
  }
  if (response.schema) {
    return response.schema;
  }
  const kinds = Object.keys(response.content || {});
  const kind = kinds.find((name) => name.includes('json')) || kinds.find((name) => response.content[name]?.schema);
  return kind ? response.content[kind].schema : null;
};

// Where the service hangs from: "basePath" in Swagger 2, the path of the first server in OpenAPI 3.
const basePathOf = (document) => segmentsOf(document.basePath || document.servers?.[0]?.url || '');

// A path of the document fits when it is the end of the address of the request. Variables on either
// side fit anything. The more fixed parts agree, the better the fit; the base path breaks ties between
// services that share an ending.
const fitOf = (specSegments, baseSegments, requestSegments) => {
  if (!specSegments.length || specSegments.length > requestSegments.length) {
    return null;
  }
  const offset = requestSegments.length - specSegments.length;
  let literal = 0;
  for (let index = 0; index < specSegments.length; index += 1) {
    const wanted = specSegments[index];
    const given = requestSegments[offset + index];
    if (SPEC_PARAMETER.test(wanted) || REQUEST_PARAMETER.test(given)) {
      continue;
    }
    if (wanted !== given) {
      return null;
    }
    literal += 1;
  }
  if (!literal) {
    return null;
  }
  let base = 0;
  while (base < baseSegments.length && base < offset && requestSegments[offset - 1 - base].endsWith(baseSegments[baseSegments.length - 1 - base])) {
    base += 1;
  }
  return literal * 100 + base * 10 + specSegments.length;
};

const cache = new WeakMap();

const findInDocument = (document, method, url) => {
  const requestSegments = segmentsOf(url);
  const baseSegments = basePathOf(document);
  let best = null;
  Object.entries(document.paths || {}).forEach(([path, entry]) => {
    const operation = entry && typeof entry === 'object' ? entry[method] : null;
    if (!operation) {
      return;
    }
    const fit = fitOf(segmentsOf(path), baseSegments, requestSegments);
    if (fit !== null && (!best || fit > best.fit)) {
      best = { fit, operation };
    }
  });
  if (!best) {
    return null;
  }
  const schema = schemaOfResponse(document, best.operation);
  const shape = schema ? shapeOfSchema(document, schema) : null;
  return shape && shape.fields.length ? { fit: best.fit, shape } : null;
};

const lookUp = (document, method, url) => {
  if (!cache.has(document)) {
    cache.set(document, new Map());
  }
  const known = cache.get(document);
  const key = `${method} ${url}`;
  if (!known.has(key)) {
    known.set(key, findInDocument(document, method, url));
  }
  return known.get(key);
};

// The fields of the response of a request, from the document that fits it best, or null.
export const shapeFromSpecs = (documents, method, url) => {
  const wanted = String(method || '').toLowerCase();
  if (!METHODS.includes(wanted) || !url) {
    return null;
  }
  const found = (documents || [])
    .filter((document) => document && typeof document === 'object' && document.paths)
    .map((document) => lookUp(document, wanted, String(url)))
    .filter(Boolean)
    .sort((a, b) => b.fit - a.fit)[0];
  return found ? found.shape : null;
};
