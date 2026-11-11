import { FIELD_PORT_PREFIX, fieldPort, findListOf, itemFieldPort, valuePort } from '../engine/nodes';
import { plainFieldPath } from '../fields/paths';
import { canFollow } from '../blocks/building';
import { canConnect, createNode, findFittingPort } from './editing';
import { ADDABLE_PIECES, PIECES, PORT_KIND, describePiece } from './pieces';
import { describeRequest, listRequests } from './requests';

const ORIGIN = { x: 0, y: 0 };

const fitsLooseEnd = (flow, node, request, loose) => !loose || Boolean(findFittingPort(flow, describePiece(node, flow, request), node, loose));

// What can be added to a flow comes in three kinds, each with its own list: the steps that do
// something, the requests of the collection and the blocks, which have their own gallery.
export const ADD = { STEPS: 'steps', REQUESTS: 'requests', BLOCKS: 'blocks' };

// A request is added from the list of requests, already chosen, so the empty one is not offered.
const listStepOptions = (flow, loose) =>
  ADDABLE_PIECES.filter((type) => type !== 'request' && fitsLooseEnd(flow, createNode(type, ORIGIN), null, loose)).map((type) => ({
    id: `piece:${type}`,
    label: PIECES[type].title,
    translate: true,
    type
  }));

// Grouped by folder, in the order of the collection.
const listRequestStepOptions = (flow, collection, loose) =>
  listRequests(collection)
    .filter(({ path }) => {
      const node = createNode('request', ORIGIN, { pathname: path });
      return fitsLooseEnd(flow, node, describeRequest(collection, node), loose);
    })
    .map(({ path, name, method, folder }) => ({
      id: `request:${path}`,
      ...(folder ? { group: folder } : {}),
      label: name,
      badge: method,
      type: 'request',
      config: { pathname: path }
    }));

// With the loose end of a cable, only what that cable can be joined to.
export const listPieceOptions = (flow, collection, loose, what = ADD.STEPS) =>
  what === ADD.REQUESTS ? listRequestStepOptions(flow, collection, loose) : listStepOptions(flow, loose);

export const listAddTabs = (flow, loose) => [
  { id: ADD.STEPS, label: 'Steps' },
  { id: ADD.REQUESTS, label: 'Requests' },
  ...(!loose || canFollow(flow, loose) ? [{ id: ADD.BLOCKS, label: 'Blocks' }] : [])
];

export const listRequestOptions = (collection) =>
  listRequests(collection).map(({ path, name, method, folder }) => ({ id: path, label: name, hint: folder, badge: method, path }));

// A field nobody has seen in a real response says where its name comes from.
const ORIGIN_HINTS = { spec: 'from the API spec', script: 'from the script' };

const originHint = (request, path) => (request?.origins?.[path] ? { hint: ORIGIN_HINTS[request.origins[path]], translateHint: true } : {});

// Fields of the response that are not shown on the step yet.
export const listFieldOptions = (node, request) =>
  (request?.fields || [])
    .filter((path) => !(node.config?.fields || []).includes(path))
    .map((path) => ({ id: path, label: path, path, ...originHint(request, path) }));

// What to offer while someone types in the box of an input: the values of other steps called like what
// is being typed, the ones called exactly so first. "inSpanish" gives the name an interface text has on
// screen, so it is found in either language.
const MAX_SUGGESTIONS = 6;

export const listValueSuggestions = (options, text, inSpanish) => {
  const wanted = String(text || '').trim().toLowerCase();
  if (wanted.length < 2) {
    return [];
  }
  const namesOf = (option) => [option.label, option.translate ? inSpanish(option.label) : ''].filter(Boolean).map((name) => name.toLowerCase());
  const rank = (option) => {
    const names = namesOf(option);
    return names.includes(wanted) ? 0 : names.some((name) => name.startsWith(wanted)) ? 1 : names.some((name) => name.includes(wanted)) ? 2 : 3;
  };
  return options
    .map((option) => ({ ...option, exact: rank(option) === 0, rank: rank(option) }))
    .filter((option) => option.rank < 3)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, MAX_SUGGESTIONS);
};

// The items a field can read from each list on its path. A position typed as a number counts from 1,
// the way people count; the path keeps it the way the engine reads it.
const positionOption = (level, several, label, index) => ({
  id: `${level.list}:${index}`,
  label,
  translate: true,
  list: level.list,
  index,
  ...(several ? { group: level.name } : {})
});

export const listPositionOptions = (levels) =>
  levels.flatMap((level) => [
    ...(level.whole ? [positionOption(level, levels.length > 1, 'The whole list', null)] : []),
    positionOption(level, levels.length > 1, 'The first item', 0),
    positionOption(level, levels.length > 1, 'The last item', -1)
  ]);

// "3" is the third item; "state=open" is the first one whose state is open.
export const listTypedPositionOptions = (levels, text) => {
  const where = /^([\w-]+)\s*=\s*(.+)$/.exec(text);
  if (where) {
    const pick = { key: where[1], value: where[2].trim() };
    return levels.map((level) => ({ ...positionOption(level, levels.length > 1, `The one whose ${pick.key} is ${pick.value}`, pick), id: `${level.list}:where` }));
  }
  const position = /^\d{1,6}$/.test(text) ? Number(text) : 0;
  return position > 0 ? levels.map((level) => positionOption(level, levels.length > 1, `Item number ${position}`, position - 1)) : null;
};

// A request step is called like its request, a name someone chose; every other title is an interface text.
export const isNamedByUser = (node, request) => node.type === 'request' && Boolean(request?.name);

export const titleOf = (node, request) => {
  if (node.type === 'request') {
    return request?.name || PIECES.request.title;
  }
  const named = ['list', 'setvalue'].includes(node.type) && node.config?.name;
  return named ? `${PIECES[node.type].title} · ${node.config.name}` : PIECES[node.type]?.title || node.type;
};

// The fields the items of a "For each item" step have, as far as they can be told before running: from
// the field of a response its list comes from, from what a List of the flow is filled with, or from the
// columns of a table.
export const listItemFields = (flow, node, describe) => {
  const cable = flow.edges.find((edge) => edge.target === node.id && edge.targetPort === valuePort('list'));
  const source = cable ? flow.nodes.find((candidate) => candidate.id === cable.source) : null;
  if (!source) {
    return [];
  }
  if (source.type === 'request') {
    const path = plainFieldPath(String(cable.sourcePort).slice(FIELD_PORT_PREFIX.length));
    const prefix = path ? `${path}.` : '';
    return (describe(source)?.request?.fields || []).filter((field) => field.startsWith(prefix) && field.length > prefix.length).map((field) => field.slice(prefix.length));
  }
  if (source.type === 'list') {
    const keys = flow.nodes
      .filter((candidate) => candidate.type === 'listappend' && candidate.config?.mode === 'object' && findListOf(flow, candidate)?.id === source.id)
      .flatMap((adder) => (adder.config.fields || []).map((field) => field.key));
    return [...new Set(keys.filter(Boolean))];
  }
  return source.type === 'table' ? source.config?.columns || [] : [];
};

const notShown = (node, paths) => paths.filter((path) => !(node.config?.fields || []).includes(path));

export const listItemFieldOptions = (flow, node, describe) => notShown(node, listItemFields(flow, node, describe)).map((path) => ({ id: path, label: path, path }));

// A field nobody has seen yet, because its request has not been sent, can be typed by name: it is
// offered on every step that hands out fields.
export const listTypedFieldOptions = (flow, target, describe, path) =>
  flow.nodes
    .filter((node) => node.id !== target.nodeId && ['request', 'foreach'].includes(node.type))
    .map((node) => {
      const port = node.type === 'foreach' ? itemFieldPort(path) : fieldPort(path);
      const { request } = describe(node);
      return { id: `${node.id}:${port}`, group: titleOf(node, request), translateGroup: !isNamedByUser(node, request), label: path, nodeId: node.id, port, addField: path };
    })
    .filter((option) => canConnect(flow, { nodeId: option.nodeId, port: option.port }, target));

// Values other steps hand out that fit an input: the ones already shown on those steps, and the known
// response fields of each request that are not shown yet.
export const listValueOptions = (flow, target, describe) =>
  flow.nodes
    .filter((node) => node.id !== target.nodeId)
    .flatMap((node) => {
      const { description, request } = describe(node);
      const fits = (port) => canConnect(flow, { nodeId: node.id, port }, target);
      const group = { group: titleOf(node, request), translateGroup: !isNamedByUser(node, request) };
      const shown = description.rows
        .filter((row) => row.right && row.right.kind !== PORT_KIND.ORDER && fits(row.right.port))
        .map((row) => ({ id: `${node.id}:${row.right.port}`, ...group, label: row.label, translate: !row.removableField && !row.own, nodeId: node.id, port: row.right.port }));
      const hidden = listFieldOptions(node, request)
        .filter(({ path }) => fits(fieldPort(path)))
        .map(({ path, hint, translateHint }) => ({ id: `${node.id}:${fieldPort(path)}`, ...group, label: path, hint, translateHint, nodeId: node.id, port: fieldPort(path), addField: path }));
      const ofItem = node.type === 'foreach'
        ? notShown(node, listItemFields(flow, node, describe))
            .filter((path) => fits(itemFieldPort(path)))
            .map((path) => ({ id: `${node.id}:${itemFieldPort(path)}`, ...group, label: path, nodeId: node.id, port: itemFieldPort(path), addField: path }))
        : [];
      return [...shown, ...hidden, ...ofItem];
    });
