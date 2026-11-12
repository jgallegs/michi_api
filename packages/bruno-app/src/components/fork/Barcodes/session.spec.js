import { FORK_SETTINGS, resetForkSettingsCache, setForkSetting } from 'components/fork/settings/store';
import { barcodesOfItems, describeColumns } from './fromItems';
import { barcodePage, barcodeSvgMarkup } from './page';
import { MAX_SESSION_BARCODES, addToSession, clearSession, getSession, resetSessions } from './session';
import { installBarcodeSession, noteBarcodes } from './watch';

const code = (value, extra = {}) => ({ id: value, field: 'code', path: 'code', source: 'code', value, position: 1, of: 1, ...extra });

const variable = { name: 'michi.barcodes', value: 'shipmentNumber, parcels.code', enabled: true };
const makeState = (responses = {}) => ({
  collections: {
    collections: [
      {
        uid: 'c1',
        root: { request: { vars: { req: [] } } },
        items: [
          {
            uid: 'f1',
            type: 'folder',
            root: { request: { vars: { req: [variable] } } },
            items: [
              { uid: 'r1', type: 'http-request', name: 'Create shipment', request: { vars: { req: [] } }, response: responses.r1 },
              { uid: 'r3', type: 'grpc-request', name: 'Stream', request: { vars: { req: [] } }, response: responses.r3 }
            ]
          },
          { uid: 'r2', type: 'http-request', name: 'Outside', request: { vars: { req: [] } }, response: responses.r2 }
        ]
      }
    ]
  }
});
const shipment = (number, parcels) => ({ data: { shipmentNumber: number, parcels: parcels.map((value) => ({ code: value })) } });

describe('barcode session', () => {
  beforeEach(() => {
    localStorage.clear();
    resetForkSettingsCache();
    resetSessions();
  });

  it('piles up the barcodes of each response under its caption, without repeating a value', () => {
    expect(addToSession('c1', 'Create · 10:00', [code('A1'), code('A2')])).toBe(2);
    expect(addToSession('c1', 'Read · 10:01', [code('A2'), code('A3')])).toBe(1);
    expect(addToSession('c1', 'Read · 10:02', [code('A1')])).toBe(0);
    expect(addToSession('c2', 'Other', [code('A1')])).toBe(1);

    expect(getSession('c1').map((barcode) => `${barcode.value}@${barcode.caption}`)).toEqual(['A1@Create · 10:00', 'A2@Create · 10:00', 'A3@Read · 10:01']);
    expect(new Set(getSession('c1').map((barcode) => barcode.id)).size).toBe(3);
    expect(getSession('c2')).toHaveLength(1);
    expect(getSession('nothing')).toEqual([]);
  });

  it('is cleared per collection and keeps the newest when it is full', () => {
    addToSession('c1', 'One', [code('A1')]);
    addToSession('c2', 'Two', [code('B1')]);
    clearSession('c1');
    expect(getSession('c1')).toEqual([]);
    expect(getSession('c2')).toHaveLength(1);

    addToSession('c1', 'Many', Array.from({ length: MAX_SESSION_BARCODES + 5 }, (_, index) => code(`N${index}`)));
    expect(getSession('c1')).toHaveLength(MAX_SESSION_BARCODES);
    expect(getSession('c1')[0].value).toBe('N5');
  });

  it('notes every new response of a folder that asks for barcodes, once', () => {
    const seen = new WeakSet();
    const first = shipment('S-1', ['P-1', 'P-2']);
    const outside = shipment('S-9', ['P-9']);
    const state = makeState({ r1: first, r2: outside, r3: shipment('S-8', ['P-8']) });

    noteBarcodes(state, seen, new Date(2026, 10, 12, 10, 0, 0).getTime());
    noteBarcodes(state, seen);

    const session = getSession('c1');
    expect(session.map((barcode) => barcode.value)).toEqual(['S-1', 'P-1', 'P-2']);
    expect(session[0].caption.startsWith('Create shipment · ')).toBe(true);

    noteBarcodes(makeState({ r1: shipment('S-2', ['P-3']), r2: outside }), seen);
    expect(getSession('c1').map((barcode) => barcode.value)).toEqual(['S-1', 'P-1', 'P-2', 'S-2', 'P-3']);
  });

  it('watches the app once it goes quiet, and not at all when the feature is off', () => {
    jest.useFakeTimers();
    let state = makeState();
    const listeners = [];
    const store = { getState: () => state, subscribe: (listener) => (listeners.push(listener), () => listeners.splice(listeners.indexOf(listener), 1)) };
    const stop = installBarcodeSession(store);

    state = makeState({ r1: shipment('S-1', ['P-1']) });
    listeners.forEach((listener) => listener());
    expect(getSession('c1')).toEqual([]);
    jest.advanceTimersByTime(500);
    expect(getSession('c1').map((barcode) => barcode.value)).toEqual(['S-1', 'P-1']);

    setForkSetting(FORK_SETTINGS.BARCODES, false);
    state = makeState({ r1: shipment('S-2', ['P-2']) });
    listeners.forEach((listener) => listener());
    jest.advanceTimersByTime(500);
    expect(getSession('c1')).toHaveLength(2);

    stop();
    expect(listeners).toHaveLength(0);
    jest.useRealTimers();
  });
});

describe('barcodes of a list', () => {
  const items = [
    { case: 'Paq 10', shipment: '3230007581000210350026', parcels: [{ code: '32300075810002103500260001' }, { code: '32300075810002103500260002' }], result: '0' },
    { case: 'Paq 14', shipment: '3230007581000210350027', parcels: [{ code: '32300075810002103500270001' }], result: '0' },
    { case: 'Empty', shipment: '', result: '7' }
  ];

  it('tells which columns hold codes and how many values each has', () => {
    expect(describeColumns(items, ['case', 'shipment', 'parcels.code', 'result', 'missing'])).toEqual([
      { path: 'case', count: 3, code: false },
      { path: 'shipment', count: 2, code: true },
      { path: 'parcels.code', count: 3, code: true },
      { path: 'result', count: 3, code: false }
    ]);
  });

  it('gives one barcode per value, named after the rest of its item', () => {
    const barcodes = barcodesOfItems(items, ['shipment', 'parcels.code']);
    expect(barcodes.map((barcode) => barcode.value)).toEqual([
      '3230007581000210350026', '32300075810002103500260001', '32300075810002103500260002', '3230007581000210350027', '32300075810002103500270001'
    ]);
    expect(barcodes[0].caption).toBe('#1 · Paq 10 · 0');
    expect(barcodes[3].caption).toBe('#2 · Paq 14 · 0');
    expect(new Set(barcodes.map((barcode) => barcode.id)).size).toBe(5);
  });

  it('reads a list of plain values and copes with nothing', () => {
    expect(describeColumns(['3230007581000210350026', 'ABC'], ['value'])).toEqual([{ path: 'value', count: 2, code: false }]);
    expect(barcodesOfItems(['3230007581000210350026'], ['value']).map((barcode) => `${barcode.caption}=${barcode.value}`)).toEqual(['#1=3230007581000210350026']);
    expect(barcodesOfItems(null, ['value'])).toEqual([]);
    expect(barcodesOfItems(items, [])).toEqual([]);
  });
});

describe('barcode page', () => {
  it('draws the bars as SVG text, or nothing when the value cannot be drawn', () => {
    const svg = barcodeSvgMarkup('1234');
    expect(svg.startsWith('<svg ')).toBe(true);
    expect((svg.match(/<rect /g) || []).length).toBe(4 * 3 + 4);
    expect(barcodeSvgMarkup('envío')).toBe('');
  });

  it('puts every barcode on one page, with captions once and texts made safe', () => {
    const html = barcodePage({
      title: 'Barcodes <of> the session',
      subtitle: 'Collection & time',
      barcodes: [
        code('1234', { caption: 'Create · 10:00', field: 'shipmentNumber' }),
        code('5678', { caption: 'Create · 10:00', position: 2, of: 3 }),
        code('envío', { caption: 'Read · 10:01' })
      ]
    });
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<title>Barcodes &lt;of&gt; the session</title>');
    expect(html).toContain('Collection &amp; time');
    expect((html.match(/<h2>/g) || []).length).toBe(2);
    expect((html.match(/<svg /g) || []).length).toBe(2);
    expect(html).toContain('code 2/3');
    expect(html).toContain('envío');
  });
});
