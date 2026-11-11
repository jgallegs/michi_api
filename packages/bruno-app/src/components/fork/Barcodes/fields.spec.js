import { BARCODE_VARIABLE, MAX_BARCODES, barcodeFieldsFor, collectBarcodes, parseBarcodeFields } from './fields';

const response = {
  returnCode: 0,
  shipmentNumber: '3230007581000210350026',
  weight: 2.5,
  parcels: [
    { code: 'P-0001', order: 1 },
    { code: 'P-0002', order: 2 },
    { code: '', order: 3 },
    { order: 4 }
  ],
  references: ['R1', 'R2'],
  sender: { phone: 600000000 }
};

const variable = (value, extra = {}) => ({ name: BARCODE_VARIABLE, value, enabled: true, ...extra });
const withVars = (vars) => ({ request: { vars: { req: vars } } });

describe('barcode fields', () => {
  it('reads the list of fields from the value of the variable', () => {
    expect(parseBarcodeFields(' shipmentNumber, parcels.code ')).toEqual(['shipmentNumber', 'parcels.code']);
    expect(parseBarcodeFields('a;b\nc,,a')).toEqual(['a', 'b', 'c']);
    expect(parseBarcodeFields('$.parcels[0].code, .sender.phone.')).toEqual(['parcels.0.code', 'sender.phone']);
    expect(parseBarcodeFields('')).toEqual([]);
    expect(parseBarcodeFields(undefined)).toEqual([]);
    expect(parseBarcodeFields({})).toEqual([]);
  });

  it('gives one barcode per value, opening the lists on the way', () => {
    const barcodes = collectBarcodes(response, ['shipmentNumber', 'parcels.code']);
    expect(barcodes.map((barcode) => barcode.value)).toEqual(['3230007581000210350026', 'P-0001', 'P-0002']);
    expect(barcodes.map((barcode) => barcode.path)).toEqual(['shipmentNumber', 'parcels[0].code', 'parcels[1].code']);
    expect(barcodes.map((barcode) => barcode.field)).toEqual(['shipmentNumber', 'code', 'code']);
    expect(barcodes.map((barcode) => `${barcode.position}/${barcode.of}`)).toEqual(['1/1', '1/2', '2/2']);
  });

  it('takes one item when the field names its position, numbers as text and lists of plain values', () => {
    expect(collectBarcodes(response, ['parcels.1.code']).map((barcode) => barcode.value)).toEqual(['P-0002']);
    expect(collectBarcodes(response, ['parcels.9.code'])).toEqual([]);
    expect(collectBarcodes(response, ['sender.phone'])[0].value).toBe('600000000');
    expect(collectBarcodes(response, ['references']).map((barcode) => `${barcode.path}=${barcode.value}`)).toEqual(['references[0]=R1', 'references[1]=R2']);
  });

  it('leaves out what is not there or is not a value', () => {
    expect(collectBarcodes(response, ['missing', 'sender', 'parcels', 'returnCode.deep'])).toEqual([]);
    expect(collectBarcodes(null, ['shipmentNumber'])).toEqual([]);
    expect(collectBarcodes('plain text', ['shipmentNumber'])).toEqual([]);
    expect(collectBarcodes(response, [])).toEqual([]);
  });

  it('reads a body that arrives as JSON text and does not repeat a value asked for twice', () => {
    const barcodes = collectBarcodes(JSON.stringify(response), ['shipmentNumber', 'parcels.0.code', 'parcels.code']);
    expect(barcodes.map((barcode) => barcode.path)).toEqual(['shipmentNumber', 'parcels[0].code', 'parcels[1].code']);
  });

  it('stops at the limit', () => {
    const many = { parcels: Array.from({ length: MAX_BARCODES + 20 }, (_, index) => ({ code: `P-${index}` })) };
    expect(collectBarcodes(many, ['parcels.code'])).toHaveLength(MAX_BARCODES);
  });

  it('takes the variable of the nearest level: request, folder, folder above, collection', () => {
    const collection = { root: withVars([variable('fromCollection')]) };
    const outer = { type: 'folder', root: withVars([variable('fromOuter')]) };
    const inner = { type: 'folder', root: withVars([variable('fromInner')]) };
    const plain = { type: 'folder', root: withVars([{ name: 'other', value: 'x', enabled: true }]) };
    const request = { type: 'http-request', ...withVars([variable('fromRequest')]) };
    const bare = { type: 'http-request', ...withVars([]) };

    expect(barcodeFieldsFor(collection, [outer, inner, request])).toEqual(['fromRequest']);
    expect(barcodeFieldsFor(collection, [outer, inner, bare])).toEqual(['fromInner']);
    expect(barcodeFieldsFor(collection, [outer, plain, bare])).toEqual(['fromOuter']);
    expect(barcodeFieldsFor(collection, [plain, bare])).toEqual(['fromCollection']);
    expect(barcodeFieldsFor({}, [plain, bare])).toEqual([]);
    expect(barcodeFieldsFor(null, [])).toEqual([]);
  });

  it('skips a variable that is switched off or empty, and reads unsaved edits', () => {
    const collection = { root: withVars([]) };
    const off = { type: 'folder', root: withVars([variable('fromFolder', { enabled: false })]) };
    const empty = { type: 'folder', root: withVars([variable('  ')]) };
    const edited = { type: 'folder', root: withVars([variable('saved')]), draft: withVars([variable('edited')]) };
    const request = { type: 'http-request', ...withVars([]), draft: withVars([variable('editedRequest')]) };

    expect(barcodeFieldsFor(collection, [off])).toEqual([]);
    expect(barcodeFieldsFor(collection, [edited, empty])).toEqual(['edited']);
    expect(barcodeFieldsFor(collection, [edited, request])).toEqual(['editedRequest']);
  });
});
