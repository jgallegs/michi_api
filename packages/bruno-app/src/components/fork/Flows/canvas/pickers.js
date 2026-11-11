import { fieldPort, itemFieldPort } from '../engine/nodes';
import { canFollow } from '../blocks/building';
import { canConnect, createNode, findFittingPort } from './editing';
import { ADDABLE_PIECES, PIECES, PORT_KIND, describePiece } from './pieces';
import { describeRequest, listRequests } from './requests';

const ORIGIN = { x: 0, y: 0 };

const fitsLooseEnd = (flow, node, request, loose) => !loose || Boolean(findFittingPort(flow, describePiece(node, flow, request), node, loose));

// Steps that can be added. With the loose end of a cable, only the ones that cable can be joined to.
export const listPieceOptions = (flow, collection, loose) => {
  const steps = ADDABLE_PIECES.filter((type) => fitsLooseEnd(flow, createNode(type, ORIGIN), null, loose)).map((type) => ({
    id: `piece:${type}`,
    group: 'Steps',
    label: PIECES[type].title,
    translate: true,
    translateGroup: true,
    type
  }));
  const requests = listRequests(collection)
    .filter(({ path }) => {
      const node = createNode('request', ORIGIN, { pathname: path });
      return fitsLooseEnd(flow, node, describeRequest(collection, node), loose);
    })
    .map(({ path, name, method, folder }) => ({
      id: `request:${path}`,
      group: 'Requests of the collection',
      translateGroup: true,
      label: name,
      hint: folder,
      badge: method,
      type: 'request',
      config: { pathname: path }
    }));
  // Blocks have their own gallery; the entry that opens it is offered wherever a block can go.
  const blocks = !loose || canFollow(flow, loose) ? [{ id: 'blocks', group: 'Blocks', translateGroup: true, label: 'Choose a block…', translate: true, opensBlocks: true }] : [];
  return [...steps, ...blocks, ...requests];
};

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

export const listTypedPositionOptions = (levels, text) => {
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
        .map((row) => ({ id: `${node.id}:${row.right.port}`, ...group, label: row.label, translate: !row.removableField, nodeId: node.id, port: row.right.port }));
      const hidden = listFieldOptions(node, request)
        .filter(({ path }) => fits(fieldPort(path)))
        .map(({ path, hint, translateHint }) => ({ id: `${node.id}:${fieldPort(path)}`, ...group, label: path, hint, translateHint, nodeId: node.id, port: fieldPort(path), addField: path }));
      return [...shown, ...hidden];
    });
