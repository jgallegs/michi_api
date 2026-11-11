import { flattenItems } from 'utils/collections';
import { getKnownFields } from '../fields/memory';
import { describeShape, mergeShapes } from '../fields/paths';
import { shapeFromScript } from '../fields/script';
import { shapeFromSpecs } from '../fields/spec';

const REQUEST_TYPES = ['http-request', 'graphql-request'];
const PLACEHOLDER = /\{\{\s*([^{}]+?)\s*\}\}/g;
const VARIABLE_NAME = /^[\w.-]+$/;
const MAX_TEXT = 2000000;

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

// A response as data. A text is read as JSON unless it is so long that reading it would be felt.
export const asResponseData = (value) => {
  const text = typeof value === 'string' ? value : value && typeof value === 'object' && typeof value.content === 'string' ? value.content : null;
  if (text === null) {
    return value;
  }
  return text.length > MAX_TEXT ? undefined : parseJson(text);
};

// A response to read field names from before the flow has run: the last one received in this session,
// or the first saved example.
const sampleResponse = (item) => {
  const candidates = [item?.response?.data, ...(item?.examples || []).map((example) => example?.response?.body)];
  return candidates.map(asResponseData).find((data) => data && typeof data === 'object');
};

// Paths of every field in a value. Lists are entered through their first element, without an index,
// which is how the engine reads them.
export const listFieldPaths = (value) => describeShape(value).fields;

// Everything known about the response of a request, most reliable first: what it answered in this
// session or a saved example, the names remembered from earlier sessions, what an open API document
// declares and what its scripts mention. "origins" marks the names nobody has seen in a real response.
const knownFields = (collection, item, known) => {
  const request = requestOf(item);
  const seen = mergeShapes([describeShape(sampleResponse(item)), known.recall(collection.pathname, relativeRequestPath(collection, item))]);
  const declared = item.type === 'http-request' ? shapeFromSpecs(known.documents, request?.method, request?.url) : null;
  const mentioned = shapeFromScript(request);
  const shape = mergeShapes([seen, declared, mentioned]);
  const origins = {};
  shape.fields
    .filter((path) => !seen.fields.includes(path))
    .forEach((path) => {
      origins[path] = declared?.fields.includes(path) ? 'spec' : 'script';
    });
  return { ...shape, origins };
};

// What a Request step needs to know about its request to draw itself.
export const describeRequest = (collection, node, known = getKnownFields()) => {
  const item = node.config?.pathname ? findRequestItem(collection, node.config.pathname) : null;
  if (!item) {
    return { item: null, missing: Boolean(node.config?.pathname), variables: [], fields: [], lists: [], origins: {} };
  }
  return {
    item,
    missing: false,
    name: item.name,
    method: item.type === 'graphql-request' ? 'GQL' : String(requestOf(item)?.method || '').toUpperCase(),
    variables: listRequestVariables(item),
    ...knownFields(collection, item, known)
  };
};
