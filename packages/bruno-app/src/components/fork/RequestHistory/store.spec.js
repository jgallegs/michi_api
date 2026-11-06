import { addHistoryEntry, clearHistory, getHistory, makeExcerpt, maskUrl, MAX_ENTRIES, resetHistoryCache } from './store';
import { buildHistoryEntry, requestHistoryMiddleware } from './middleware';
import { FORK_SETTINGS, resetForkSettingsCache, setForkSetting } from 'components/fork/settings/store';

const state = {
  collections: {
    collections: [
      {
        uid: 'c1',
        name: 'Shipping',
        pathname: '/repo/shipping',
        activeEnvironmentUid: 'e2',
        environments: [
          { uid: 'e1', name: 'DEV' },
          { uid: 'e2', name: 'PRE' }
        ],
        items: [
          {
            uid: 'f1',
            type: 'folder',
            items: [
              {
                uid: 'r1',
                name: 'Create shipment',
                pathname: '/repo/shipping/orders/Create shipment.bru',
                type: 'http-request',
                request: { method: 'post', url: '{{host}}/shipments' }
              }
            ]
          }
        ]
      }
    ]
  }
};

const payload = {
  collectionUid: 'c1',
  itemUid: 'r1',
  requestSent: { method: 'POST', url: 'https://pre.example.test/shipments?client=1&token=abc' },
  response: { status: 200, statusText: 'OK', duration: 412, size: 2048, data: { id: 7, accessToken: 'xyz' } }
};

describe('request history', () => {
  beforeEach(() => {
    localStorage.clear();
    resetHistoryCache();
    resetForkSettingsCache();
  });

  it('masks credentials in URLs', () => {
    expect(maskUrl('https://user:pw@host.test/a?token=1&client=2&api_key=3')).toBe('https://***:***@host.test/a?token=***&client=2&api_key=***');
    expect(maskUrl('not a url')).toBe('not a url');
    expect(maskUrl('{{host}}/a?password=1&b=2')).toBe('{{host}}/a?password=***&b=2');
  });

  it('keeps a short excerpt of the body with credentials masked', () => {
    expect(makeExcerpt({ password: 'p', name: 'n', authToken: 't' })).toBe('{"password":"***","name":"n","authToken":"***"}');
    expect(makeExcerpt('Authorization: Bearer eyJhbGciOi.payload.sig')).toBe('Authorization: Bearer ***');
    expect(makeExcerpt('x'.repeat(2000))).toHaveLength(1001);
  });

  it('builds an entry with the request, the environment and the result', () => {
    expect(buildHistoryEntry(state, payload, 1000)).toEqual({
      at: 1000,
      collection: { name: 'Shipping', pathname: '/repo/shipping' },
      request: { name: 'Create shipment', pathname: '/repo/shipping/orders/Create shipment.bru', type: 'http-request' },
      method: 'POST',
      url: 'https://pre.example.test/shipments?client=1&token=***',
      environment: 'PRE',
      status: 200,
      statusText: 'OK',
      duration: 412,
      size: 2048,
      isError: false,
      error: '',
      excerpt: '{"id":7,"accessToken":"***"}'
    });
  });

  it('skips cancelled requests', () => {
    expect(buildHistoryEntry(state, { ...payload, response: null })).toBeNull();
  });

  it('records through the middleware, newest first, and can be cleared', () => {
    const next = jest.fn((action) => action);
    const run = requestHistoryMiddleware({ getState: () => state })(next);
    run({ type: 'collections/responseReceived', payload });
    run({ type: 'collections/responseReceived', payload: { ...payload, response: { status: 500, data: 'boom' } } });
    run({ type: 'collections/requestUrlChanged', payload: {} });

    expect(next).toHaveBeenCalledTimes(3);
    expect(getHistory().map((entry) => entry.status)).toEqual([500, 200]);
    clearHistory();
    expect(getHistory()).toEqual([]);
  });

  it('records nothing when the switch is off', () => {
    setForkSetting(FORK_SETTINGS.REQUEST_HISTORY, false);
    requestHistoryMiddleware({ getState: () => state })((action) => action)({ type: 'collections/responseReceived', payload });
    expect(getHistory()).toEqual([]);
  });

  it(`keeps at most ${MAX_ENTRIES} entries`, () => {
    for (let index = 0; index < MAX_ENTRIES + 5; index += 1) {
      addHistoryEntry({ at: index });
    }
    expect(getHistory()).toHaveLength(MAX_ENTRIES);
    expect(getHistory()[0].at).toBe(MAX_ENTRIES + 4);
  });
});
