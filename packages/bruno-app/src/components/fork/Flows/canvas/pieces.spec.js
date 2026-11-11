jest.mock('utils/common', () => ({ uuid: () => 'uid' }));

import { HEADER_HEIGHT, PIECES, PORT_KIND, ROW_HEIGHT, describePiece, findPort } from './pieces';
import { NODE_DEFINITIONS } from '../engine/nodes';
import { ADD, listAddTabs, listFieldOptions, listPieceOptions, listValueOptions, listValueSuggestions, titleOf } from './pickers';
import { describeRequest, listFieldPaths, listRequestVariables, relativeRequestPath } from './requests';

const node = (id, type, config = {}, extra = {}) => ({ id, type, x: 0, y: 0, config, ...extra });
const edge = (source, sourcePort, target, targetPort) => ({ id: `${source}-${target}-${targetPort}`, source, sourcePort, target, targetPort });
const portsOf = (description, side) => description.ports.filter((port) => port.side === side).map((port) => port.port);

const collection = {
  uid: 'c1',
  pathname: 'C:\\work\\shop',
  items: [
    {
      type: 'http-request',
      name: 'login',
      pathname: 'C:\\work\\shop\\login.bru',
      request: { method: 'post', url: '{{baseUrl}}/login', headers: [], body: { mode: 'json', json: '{"user": "{{user}}", "id": "{{$guid}}"}' } },
      response: { data: { session: { token: 'x', roles: [{ name: 'admin' }] } } }
    },
    {
      type: 'folder',
      name: 'orders',
      pathname: 'C:\\work\\shop\\orders',
      items: [
        {
          type: 'http-request',
          name: 'get order',
          pathname: 'C:\\work\\shop\\orders\\get order.bru',
          request: { method: 'get', url: 'https://example.test/orders/{{orderId}}', headers: [{ name: 'Authorization', value: 'Bearer {{token}}' }] },
          examples: [{ response: { body: { content: '{"order": {"id": 1}}' } } }]
        }
      ]
    },
    { type: 'grpc-request', name: 'stream', pathname: 'C:\\work\\shop\\stream.bru', request: {} }
  ]
};

describe('flow pieces', () => {
  it('describes every kind of step the engine can run', () => {
    expect(Object.keys(PIECES).sort()).toEqual(Object.keys(NODE_DEFINITIONS).sort());
  });

  it('gives every order output of the engine a port', () => {
    const flow = { nodes: [], edges: [] };
    Object.entries(NODE_DEFINITIONS).forEach(([type, definition]) => {
      const description = describePiece(node('n', type), flow, null);
      expect(portsOf(description, 'right')).toEqual(expect.arrayContaining(definition.outputs));
    });
  });

  it('places each port on its row', () => {
    const description = describePiece(node('r', 'repeat'), { nodes: [], edges: [] }, null);
    expect(findPort(description, 'in', 'left')).toMatchObject({ kind: PORT_KIND.ORDER, y: HEADER_HEIGHT / 2 });
    expect(findPort(description, 'value:times', 'left').y).toBe(HEADER_HEIGHT + ROW_HEIGHT / 2);
    expect(findPort(description, 'loopback', 'left').y).toBe(HEADER_HEIGHT + 2 * ROW_HEIGHT + ROW_HEIGHT / 2);
    expect(description.height).toBeGreaterThan(HEADER_HEIGHT + 5 * ROW_HEIGHT);
  });

  it('gives a step that goes through a list the item, its chosen fields and the round number', () => {
    const description = describePiece(node('e', 'foreach', { fields: ['id'] }), { nodes: [], edges: [] }, null);
    expect(portsOf(description, 'left')).toEqual(['in', 'value:list', 'loopback']);
    expect(portsOf(description, 'right')).toEqual(['body', 'exit', 'field:item', 'field:item.id', 'field:index']);
    expect(description.rows.find((row) => row.id === 'value:list').control).toMatchObject({ type: 'wired' });
  });

  it('shows on an If only what its kind of check needs', () => {
    const flow = { nodes: [], edges: [] };
    const inputs = (config) => portsOf(describePiece(node('i', 'if', config), flow, null), 'left');
    expect(inputs({})).toEqual(['in']);
    expect(inputs({ check: 'status' })).toEqual(['in', 'value:status']);
    expect(inputs({ check: 'compare' })).toEqual(['in', 'value:left', 'value:right']);
    expect(inputs({ check: 'compare', operator: 'isEmpty' })).toEqual(['in', 'value:left']);
  });

  it('gives "Add to list" one input per field', () => {
    const fields = [{ id: 'f1', key: 'a' }, { id: 'f2', key: 'b' }];
    const description = describePiece(node('p', 'listappend', { mode: 'object', fields }), { nodes: [], edges: [] }, null);
    expect(portsOf(description, 'left')).toEqual(['in', 'value:f1', 'value:f2']);
  });

  it('lets "Add to list" choose its list by name, and keeps the port of a flow that joined it by cable', () => {
    const add = node('p', 'listappend', {});
    const lists = [node('l1', 'list', { name: 'Final' }), node('l2', 'list', {})];
    const choice = (flow, step = add) => describePiece(step, flow, null).rows.find((row) => row.id === 'list');

    expect(choice({ nodes: [add, lists[0]], edges: [] }).control).toMatchObject({ fallback: 'l1', options: [{ value: 'l1', label: 'Final', own: true }] });
    expect(choice({ nodes: [add, ...lists], edges: [] }).control).toMatchObject({
      fallback: '',
      options: [{ value: '', label: 'Choose a list' }, { value: 'l1', label: 'Final', own: true }, { value: 'l2', label: 'List 2', own: false }]
    });

    const cabled = { nodes: [add, ...lists], edges: [edge('l2', 'field:items', 'p', 'list')] };
    expect(choice(cabled)).toMatchObject({ left: { port: 'list' }, control: { fallback: 'l2' } });
    const chosen = node('p', 'listappend', { list: 'l1' });
    expect(choice({ ...cabled, nodes: [chosen, ...lists] }, chosen).left).toBeUndefined();
  });

  describe('request', () => {
    const login = node('a', 'request', { pathname: 'login.bru', fields: ['session.token'] });
    const order = node('b', 'request', { pathname: 'orders/get order.bru' });
    const flow = { nodes: [login, order], edges: [edge('a', 'field:session.token', 'b', 'var:token'), edge('a', 'field:gone', 'b', 'var:old')] };

    it('finds the request by its path inside the collection, whatever the separators', () => {
      expect(relativeRequestPath(collection, collection.items[1].items[0])).toBe('orders/get order.bru');
      expect(describeRequest(collection, order)).toMatchObject({ name: 'get order', method: 'GET', missing: false });
      expect(describeRequest(collection, node('x', 'request', { pathname: 'nope.bru' }))).toMatchObject({ item: null, missing: true });
      expect(describeRequest(collection, node('x', 'request'))).toMatchObject({ item: null, missing: false });
    });

    it('lists the variables a request uses, without Bruno random values', () => {
      expect(listRequestVariables(collection.items[0])).toEqual(['baseUrl', 'user']);
      expect(listRequestVariables(collection.items[1].items[0])).toEqual(['orderId', 'token']);
    });

    it('lists nested fields, entering lists without an index', () => {
      expect(listFieldPaths({ a: 1, b: { c: [{ d: 2 }] } })).toEqual(['a', 'b', 'b.c', 'b.c.d']);
      expect(listFieldPaths('text')).toEqual([]);
      expect(describeRequest(collection, login).fields).toEqual(['session', 'session.token', 'session.roles', 'session.roles.name']);
      expect(describeRequest(collection, order).fields).toEqual(['order', 'order.id']);
    });

    it('shows its variables as inputs and its chosen fields as outputs, plus whatever has a cable', () => {
      const description = describePiece(order, flow, describeRequest(collection, order));
      expect(portsOf(description, 'left')).toEqual(['in', 'var:orderId', 'var:token', 'var:old']);
      const outputs = portsOf(describePiece(login, flow, describeRequest(collection, login)), 'right');
      expect(outputs).toEqual(['out', 'status', 'field:', 'field:session.token', 'field:gone']);
    });

    it('keeps the cables of a collapsed section hanging from its title', () => {
      const collapsed = { ...order, collapsed: { inputs: true } };
      const description = describePiece(collapsed, flow, describeRequest(collection, collapsed));
      const token = findPort(description, 'var:token', 'left');
      expect(token).toMatchObject({ hidden: true, y: HEADER_HEIGHT + ROW_HEIGHT + ROW_HEIGHT / 2 });
      expect(description.rows.find((row) => row.section === 'inputs')).toMatchObject({ collapsed: true, count: 3 });
    });

    it('titles a step after its request, its list or its variable', () => {
      expect(titleOf(login, describeRequest(collection, login))).toBe('login');
      expect(titleOf(node('x', 'request'), describeRequest(collection, node('x', 'request')))).toBe('Request');
      expect(titleOf(node('l', 'list', { name: 'orders' }), null)).toBe('List · orders');
      expect(titleOf(node('w', 'wait'), null)).toBe('Wait');
    });
  });

  describe('pickers', () => {
    const start = node('start', 'start');
    const login = node('a', 'request', { pathname: 'login.bru', fields: ['session.token'] });
    const order = node('b', 'request', { pathname: 'orders/get order.bru' });
    const list = node('l', 'list');
    const append = node('p', 'listappend');
    const flow = { nodes: [start, login, order, list, append], edges: [] };
    const describe = (item) => {
      const request = item.type === 'request' ? describeRequest(collection, item) : null;
      return { request, description: describePiece(item, flow, request) };
    };

    it('offers the steps and the requests of the collection as two separate lists', () => {
      expect(listPieceOptions(flow, collection, null).map((option) => option.type)).toEqual(['if', 'validate', 'repeat', 'foreach', 'leave', 'list', 'listappend', 'setvalue', 'wait', 'note', 'stop']);
      const requests = listPieceOptions(flow, collection, null, ADD.REQUESTS);
      expect(requests.map((option) => option.config.pathname)).toEqual(['login.bru', 'orders/get order.bru']);
      expect(requests.map((option) => option.group)).toEqual([undefined, 'orders']);
      expect(listAddTabs(flow, null).map((tab) => tab.id)).toEqual(['steps', 'requests', 'blocks']);
      expect(listAddTabs(flow, { nodeId: 'a', port: 'field:session.token', side: 'right' }).map((tab) => tab.id)).toEqual(['steps', 'requests']);
    });

    it('offers only what the loose end of a cable can be joined to', () => {
      const fromStart = { nodeId: 'start', port: 'out', side: 'right' };
      const afterStart = listPieceOptions(flow, collection, fromStart).map((option) => option.label);
      expect(afterStart).not.toContain('List');
      expect(afterStart).toContain('Repeat');
      expect(listPieceOptions(flow, collection, fromStart, ADD.REQUESTS).map((option) => option.label)).toEqual(['login', 'get order']);

      const fromValue = { nodeId: 'a', port: 'field:session.token', side: 'right' };
      expect(listPieceOptions(flow, collection, fromValue).map((option) => option.label)).toEqual(['Validate', 'Repeat', 'For each item', 'Add to list', 'Set variable', 'Wait', 'Note', 'Stop']);
      expect(listPieceOptions(flow, collection, fromValue, ADD.REQUESTS).map((option) => option.label)).toEqual(['login', 'get order']);
    });

    it('offers, while typing in a box, the values called like what is typed', () => {
      const options = [
        { id: '1', label: 'session.token' },
        { id: '2', label: 'token' },
        { id: '3', label: 'Status code', translate: true },
        { id: '4', label: 'tokens.count' }
      ];
      const spanish = (text) => ({ 'Status code': 'Código de estado' })[text] || '';
      expect(listValueSuggestions(options, 'Token', spanish).map((option) => [option.label, option.exact])).toEqual([['token', true], ['tokens.count', false], ['session.token', false]]);
      expect(listValueSuggestions(options, 'código', spanish).map((option) => option.label)).toEqual(['Status code']);
      expect(listValueSuggestions(options, 't', spanish)).toEqual([]);
      expect(listValueSuggestions(options, '622222222', spanish)).toEqual([]);
    });

    it('offers the fields of a response that are not on the step yet', () => {
      expect(listFieldOptions(login, describeRequest(collection, login)).map((option) => option.path)).toEqual(['session', 'session.roles', 'session.roles.name']);
    });

    it('offers the values of the other steps for an input, known response fields included', () => {
      const options = listValueOptions(flow, { nodeId: 'b', port: 'var:token' }, describe);
      expect(options.filter((option) => option.nodeId === 'a').map((option) => option.label)).toEqual([
        'Status code',
        'Whole response',
        'session.token',
        'session',
        'session.roles',
        'session.roles.name'
      ]);
      expect(options.find((option) => option.label === 'session.roles')).toMatchObject({ addField: 'session.roles', port: 'field:session.roles' });
      expect(options.some((option) => option.nodeId === 'b')).toBe(false);
      expect(options.filter((option) => option.nodeId === 'l').map((option) => option.label)).toEqual(['Items', 'How many']);
    });

    it('offers only lists for the list input', () => {
      const options = listValueOptions(flow, { nodeId: 'p', port: 'list' }, describe);
      expect(options.map((option) => `${option.nodeId}:${option.port}`)).toEqual(['l:field:items']);
    });
  });
});
