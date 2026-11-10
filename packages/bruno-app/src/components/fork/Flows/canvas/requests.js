import { flattenItems } from 'utils/collections';

const REQUEST_TYPES = ['http-request', 'graphql-request'];
const PLACEHOLDER = /\{\{\s*([^{}]+?)\s*\}\}/g;
const VARIABLE_NAME = /^[\w.-]+$/;
const MAX_FIELDS = 300;
const MAX_DEPTH = 8;

const normalizePath = (pathname) => String(pathname || '').replace(/\\/g, '/').replace(/\/+$/, '');

const requestOf = (item) => item?.draft?.request || item?.request || null;

// Flows are shared through git, so a step points to its request by the path inside the collection.
export const relativeRequestPath = (collection, item) => {
  const root = `${normalizePath(collection.pathname)}/`;
  const full = normalizePath(item.pathname);
  return full.toLowerCase().startsWith(root.toLowerCase()) ? full.slice(root.length) : full;
};

export const listRequests = (collection) =>
  flattenItems(collection?.items || [])
    .filter((item) => REQUEST_TYPES.includes(item.type) && item.pathname)
    .map((item) => {
      const path = relativeRequestPath(collection, item);
      const folder = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
      return { item, path, folder, name: item.name, method: requestOf(item)?.method || '' };
    });

export const findRequestItem = (collection, relativePath) => {
  const wanted = normalizePath(relativePath).toLowerCase();
  return listRequests(collection).find((request) => request.path.toLowerCase() === wanted)?.item || null;
};

// Names written as {{name}} anywhere in the request. Process variables and Bruno's own random values
// ({{$guid}} and the like) are not something a flow hands over.
export const listRequestVariables = (item) => {
  const request = requestOf(item);
  if (!request) {
    return [];
  }
  const { url, headers, params, body, auth } = request;
  const names = [...JSON.stringify({ url, headers, params, body, auth }).matchAll(PLACEHOLDER)].map((match) => match[1]);
  return [...new Set(names)].filter((name) => VARIABLE_NAME.test(name) && !name.startsWith('process.env.'));
};

const parseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch (err) {
    return undefined;
  }
};

const asData = (value) => {
  if (typeof value === 'string') {
    return parseJson(value);
  }
  if (value && typeof value === 'object' && typeof value.content === 'string') {
    return parseJson(value.content);
  }
  return value;
};

// A response to read field names from before the flow has run: the last one received in this session,
// or the first saved example.
const sampleResponse = (item) => {
  const candidates = [item?.response?.data, ...(item?.examples || []).map((example) => example?.response?.body)];
  return candidates.map(asData).find((data) => data && typeof data === 'object');
};

// Paths of every field in a value. Lists are entered through their first element, without an index,
// which is how the engine reads them.
export const listFieldPaths = (value) => {
  const paths = [];
  const visit = (current, prefix, depth) => {
    const container = Array.isArray(current) ? current[0] : current;
    if (!container || typeof container !== 'object' || Array.isArray(container) || depth > MAX_DEPTH) {
      return;
    }
    Object.keys(container).forEach((key) => {
      if (paths.length >= MAX_FIELDS) {
        return;
      }
      const path = prefix ? `${prefix}.${key}` : key;
      paths.push(path);
      visit(container[key], path, depth + 1);
    });
  };
  visit(value, '', 0);
  return paths;
};

// What a Request step needs to know about its request to draw itself.
export const describeRequest = (collection, node) => {
  const item = node.config?.pathname ? findRequestItem(collection, node.config.pathname) : null;
  if (!item) {
    return { item: null, missing: Boolean(node.config?.pathname), variables: [], fields: [] };
  }
  return {
    item,
    missing: false,
    name: item.name,
    method: item.type === 'graphql-request' ? 'GQL' : String(requestOf(item)?.method || '').toUpperCase(),
    variables: listRequestVariables(item),
    fields: listFieldPaths(sampleResponse(item))
  };
};
