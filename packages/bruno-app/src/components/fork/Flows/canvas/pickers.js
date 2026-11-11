import { fieldPort } from '../engine/nodes';
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
  return [...steps, ...requests];
};

export const listRequestOptions = (collection) =>
  listRequests(collection).map(({ path, name, method, folder }) => ({ id: path, label: name, hint: folder, badge: method, path }));

// Fields of the response that are not shown on the step yet.
export const listFieldOptions = (node, request) =>
  (request?.fields || []).filter((path) => !(node.config?.fields || []).includes(path)).map((path) => ({ id: path, label: path, path }));

export const titleOf = (node, request) => {
  if (node.type === 'request') {
    return request?.name || PIECES.request.title;
  }
  const named = ['list', 'setvalue'].includes(node.type) && node.config?.name;
  return named ? `${PIECES[node.type].title} · ${node.config.name}` : PIECES[node.type]?.title || node.type;
};

// Values other steps hand out that fit an input: the ones already shown on those steps, and the known
// response fields of each request that are not shown yet.
export const listValueOptions = (flow, target, describe) =>
  flow.nodes
    .filter((node) => node.id !== target.nodeId)
    .flatMap((node) => {
      const { description, request } = describe(node);
      const fits = (port) => canConnect(flow, { nodeId: node.id, port }, target);
      const group = titleOf(node, request);
      const shown = description.rows
        .filter((row) => row.right && row.right.kind !== PORT_KIND.ORDER && fits(row.right.port))
        .map((row) => ({ id: `${node.id}:${row.right.port}`, group, label: row.label, translate: !row.removableField, nodeId: node.id, port: row.right.port }));
      const hidden = listFieldOptions(node, request)
        .filter(({ path }) => fits(fieldPort(path)))
        .map(({ path }) => ({ id: `${node.id}:${fieldPort(path)}`, group, label: path, nodeId: node.id, port: fieldPort(path), addField: path }));
      return [...shown, ...hidden];
    });
