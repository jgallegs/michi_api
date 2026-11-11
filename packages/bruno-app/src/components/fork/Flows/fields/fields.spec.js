import { describePosition, describeShape, listLevels, mergeShapes, plainFieldPath, toFieldPath, withListPosition } from './paths';
import { shapeFromScript } from './script';
import { shapeFromSpecs } from './spec';
import { getKnownFields, recallShape, rememberShape, resetKnownFields, setApiDocuments } from './memory';
import { noteWhatIsKnown } from './watch';

describe('flow fields', () => {
  describe('paths', () => {
    it('accepts the brackets people write in scripts', () => {
      expect(toFieldPath('orders[2].id')).toBe('orders.2.id');
      expect(toFieldPath(' orders[-1] ')).toBe('orders.-1');
      expect(toFieldPath('order.id')).toBe('order.id');
      expect(plainFieldPath('orders.2.lines.-1.sku')).toBe('orders.lines.sku');
    });

    it('describes fields and which of them are lists', () => {
      expect(describeShape({ total: 1, orders: [{ id: 7, lines: [{ sku: 'a' }] }], tags: [] })).toEqual({
        fields: ['total', 'orders', 'orders.id', 'orders.lines', 'orders.lines.sku', 'tags'],
        lists: ['orders', 'orders.lines', 'tags']
      });
      expect(describeShape('text')).toEqual({ fields: [], lists: [] });
    });

    it('joins shapes without repeating names', () => {
      expect(mergeShapes([{ fields: ['a', 'b'], lists: ['b'] }, null, { fields: ['b', 'c'], lists: [] }])).toEqual({ fields: ['a', 'b', 'c'], lists: ['b'] });
    });

    it('finds the lists a path goes through', () => {
      const lists = ['orders', 'orders.lines'];
      expect(listLevels('orders.lines.sku', lists)).toEqual([
        { list: 'orders', name: 'orders', index: null, whole: false },
        { list: 'orders.lines', name: 'lines', index: null, whole: false }
      ]);
      expect(listLevels('orders.2.id', [])).toEqual([{ list: 'orders', name: 'orders', index: 2, whole: false }]);
      expect(listLevels('orders', lists)).toEqual([{ list: 'orders', name: 'orders', index: null, whole: true }]);
      expect(listLevels('orders.-1', lists)).toEqual([{ list: 'orders', name: 'orders', index: -1, whole: true }]);
      expect(listLevels('total', lists)).toEqual([]);
    });

    it('changes which item of a list a path reads', () => {
      expect(withListPosition('orders.id', 'orders', 2)).toBe('orders.2.id');
      expect(withListPosition('orders.2.id', 'orders', -1)).toBe('orders.-1.id');
      expect(withListPosition('orders.2.id', 'orders', 0)).toBe('orders.id');
      expect(withListPosition('orders.2.lines.sku', 'orders.lines', 1)).toBe('orders.2.lines.1.sku');
      expect(withListPosition('orders', 'orders', 0)).toBe('orders.0');
      expect(withListPosition('orders.3', 'orders', null)).toBe('orders');
    });

    it('picks an item by what it holds, written like in a script or chosen', () => {
      expect(toFieldPath('parcels[order=02].code')).toBe('parcels.?order=02.code');
      expect(toFieldPath('parcels[ size = 1.5 ]')).toBe('parcels.?size=1%2E5');
      expect(plainFieldPath('parcels.?order=02.code')).toBe('parcels.code');
      expect(listLevels('parcels.?size=1%2E5.code', [])).toEqual([{ list: 'parcels', name: 'parcels', index: null, where: { key: 'size', value: '1.5' }, whole: false }]);
      expect(withListPosition('parcels.2.code', 'parcels', { key: 'order', value: '02' })).toBe('parcels.?order=02.code');
      expect(withListPosition('parcels.?order=02.code', 'parcels', 0)).toBe('parcels.code');
      expect(describePosition({ index: null, whole: false, where: { key: 'order', value: '02' } })).toEqual({ text: 'order=02' });
    });

    it('says a position the way people count', () => {
      expect(describePosition({ index: null, whole: false })).toEqual({ text: '#1' });
      expect(describePosition({ index: 2, whole: false })).toEqual({ text: '#3' });
      expect(describePosition({ index: -1, whole: false })).toEqual({ text: 'last', translate: true });
      expect(describePosition({ index: null, whole: true })).toEqual({ text: 'all', translate: true });
      expect(describePosition({ index: -2, whole: false })).toEqual({ text: '[-2]' });
    });
  });

  describe('API documents', () => {
    const openApi = {
      openapi: '3.0.1',
      servers: [{ url: 'https://example.test/shop' }],
      paths: {
        '/v1/orders/{id}': {
          get: { responses: { 200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } } } },
          delete: { responses: { 204: { description: 'gone' } } }
        },
        '/v1/orders': {
          get: { responses: { 200: { content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Order' } } } } } } }
        }
      },
      components: {
        schemas: {
          Order: {
            allOf: [{ $ref: '#/components/schemas/Base' }, { properties: { lines: { type: 'array', items: { $ref: '#/components/schemas/Line' } }, parent: { $ref: '#/components/schemas/Order' } } }]
          },
          Base: { properties: { id: { type: 'integer' } } },
          Line: { properties: { sku: { type: 'string' } } }
        }
      }
    };
    const swagger = {
      swagger: '2.0',
      basePath: '/billing',
      paths: { '/v1/orders/{id}': { get: { responses: { 200: { schema: { properties: { invoice: { type: 'string' } } } } } } } }
    };

    it('reads the fields of the answer of the path that fits the address', () => {
      expect(shapeFromSpecs([openApi], 'GET', '{{host}}/shop/v1/orders/{{orderId}}?full=1')).toEqual({
        fields: ['id', 'lines', 'lines.sku', 'parent'],
        lists: ['lines']
      });
      expect(shapeFromSpecs([openApi], 'get', 'https://example.test/shop/v1/orders').fields).toEqual(['id', 'lines', 'lines.sku', 'parent']);
    });

    it('offers nothing when no path, method or answer fits', () => {
      expect(shapeFromSpecs([openApi], 'get', '{{host}}/v1/customers/1')).toBeNull();
      expect(shapeFromSpecs([openApi], 'post', '{{host}}/v1/orders')).toBeNull();
      expect(shapeFromSpecs([openApi], 'delete', '{{host}}/v1/orders/1')).toBeNull();
      expect(shapeFromSpecs([openApi], 'get', '{{host}}/{{anything}}')).toBeNull();
      expect(shapeFromSpecs([], 'get', '{{host}}/v1/orders/1')).toBeNull();
    });

    it('tells apart two services with the same ending by where they hang from', () => {
      expect(shapeFromSpecs([openApi, swagger], 'get', '{{host}}billing/v1/orders/9').fields).toEqual(['invoice']);
      expect(shapeFromSpecs([swagger, openApi], 'get', '{{host}}/shop/v1/orders/9').fields).toContain('lines.sku');
    });
  });

  describe('scripts', () => {
    it('finds the fields of the response a script mentions, without running it', () => {
      const request = {
        script: {
          res: [
            'const status = res.getStatus();',
            'const body   = res.getBody();',
            'if (status === 200 && body && body.returnCode === 0) {',
            '  bru.setVar("last", body.result);',
            '  const other = await bru.runRequest("x"); console.log(other.data.nope);',
            '  // body.ignored is only a comment',
            '  body.items.forEach((item) => item.x);',
            '  bru.setVar("first", res.body.parcels[0].code);',
            '}'
          ].join('\n')
        },
        tests: 'expect(res.getBody().detail.message.length).to.equal(2);',
        vars: { res: [{ name: 'token', value: 'res.body.session.token' }] }
      };
      expect(shapeFromScript(request)).toEqual({
        fields: ['parcels', 'parcels.code', 'detail', 'detail.message', 'session', 'session.token', 'returnCode', 'result', 'items'],
        lists: ['parcels']
      });
    });

    it('reads unpacked names and response queries', () => {
      expect(shapeFromScript({ script: { res: 'const { id, name: label } = res.body; const x = res("order.lines[0].sku");' } }).fields).toEqual(['id', 'name', 'order', 'order.lines', 'order.lines.sku']);
    });

    it('offers nothing when the scripts do not read the response', () => {
      expect(shapeFromScript({ script: { res: 'console.log(1)' } })).toBeNull();
      expect(shapeFromScript({ script: { res: 'const b = req.body.x;' } })).toBeNull();
      expect(shapeFromScript(null)).toBeNull();
    });
  });

  describe('memory', () => {
    beforeEach(() => resetKnownFields());

    it('remembers the names seen for a request and keeps the older ones', () => {
      rememberShape('C:\\shop', 'orders\\get.bru', { fields: ['error', 'error.code'], lists: [] });
      rememberShape('C:/shop/', 'orders/get.bru', { fields: ['id', 'lines', 'lines.sku'], lists: ['lines'] });
      expect(recallShape('c:/shop', 'Orders/Get.bru')).toMatchObject({ fields: ['id', 'lines', 'lines.sku', 'error', 'error.code'], lists: ['lines'] });
      expect(recallShape('c:/shop', 'other.bru')).toBeNull();
    });

    it('keeps the names between sessions and never a value', () => {
      rememberShape('/shop', 'login.bru', describeShape({ token: 'secret-value', user: { name: 'Ana' } }));
      const stored = window.localStorage.getItem('michi.flows.fields');
      expect(JSON.parse(stored)['/shop']['login.bru'].fields).toEqual(['token', 'user', 'user.name']);
      expect(stored).not.toContain('secret-value');
      expect(stored).not.toContain('Ana');
    });

    it('tells when something new is known', () => {
      const before = getKnownFields();
      rememberShape('/shop', 'login.bru', { fields: ['token'], lists: [] });
      const after = getKnownFields();
      expect(after).not.toBe(before);
      rememberShape('/shop', 'login.bru', { fields: ['token'], lists: [] });
      expect(getKnownFields()).toBe(after);
      const document = { paths: {} };
      setApiDocuments([document]);
      expect(getKnownFields().documents).toEqual([document]);
    });

    it('notes every response that arrives, whoever sent the request', () => {
      const response = { status: 200, data: { result: 'x', parcels: [{ code: 1 }] } };
      const state = {
        apiSpec: { apiSpecs: [{ json: { paths: {} } }] },
        collections: {
          collections: [
            {
              pathname: '/shop',
              items: [
                { type: 'http-request', pathname: '/shop/create.bru', response },
                { type: 'http-request', pathname: '/shop/text.bru', response: { data: 'not json' } },
                { type: 'folder', pathname: '/shop/f', items: [{ type: 'http-request', pathname: '/shop/f/deep.bru', response: { data: '{"ok":true}' } }] }
              ]
            }
          ]
        }
      };
      const seen = new WeakSet();
      noteWhatIsKnown(state, seen);
      expect(recallShape('/shop', 'create.bru')).toMatchObject({ fields: ['result', 'parcels', 'parcels.code'], lists: ['parcels'] });
      expect(recallShape('/shop', 'f/deep.bru').fields).toEqual(['ok']);
      expect(recallShape('/shop', 'text.bru')).toBeNull();
      expect(getKnownFields().documents).toHaveLength(1);
      expect(seen.has(response)).toBe(true);
    });
  });
});
