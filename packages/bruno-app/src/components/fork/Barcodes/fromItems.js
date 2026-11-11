import { canEncodeCode128 } from './code128';
import { MAX_BARCODES, collectBarcodes } from './fields';

// Barcodes out of a list of things (what a list of a flow holds after a run): which of its columns
// carry codes, and one barcode per value, named after the rest of its item.
export const MAX_LIST_BARCODES = MAX_BARCODES * 5;

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

// An item that is a plain value is read as if it were { value: … }.
const asRecord = (item) => (isRecord(item) ? item : { value: item });

// A code and not a description: something a reader can take, without blanks, long enough and with digits.
const looksLikeCode = (text) => canEncodeCode128(text) && text.length >= 6 && !/\s/.test(text) && /\d/.test(text);

// columns: the paths of the report of the list ("shipment", "parcels.code"). Each comes back with how
// many values it has and whether they all look like codes, which is what gets it picked from the start.
export const describeColumns = (items, columns) =>
  columns
    .map((path) => {
      const values = (Array.isArray(items) ? items : []).flatMap((item) => collectBarcodes(asRecord(item), [path]).map((barcode) => barcode.value));
      return { path, count: values.length, code: values.length > 0 && values.every(looksLikeCode) };
    })
    .filter((column) => column.count > 0);

const plainValuesOf = (record, except) =>
  Object.entries(record)
    .filter(([name, value]) => !except.has(name) && (typeof value === 'string' || typeof value === 'number') && String(value).trim())
    .map(([, value]) => String(value).trim());

// One barcode per value of the chosen columns, item by item. The caption of an item is its number in
// the list and its other plain values, so each barcode says which case it belongs to.
export const barcodesOfItems = (items, paths) => {
  const chosen = new Set(paths.map((path) => path.split('.')[0]));
  const barcodes = [];
  (Array.isArray(items) ? items : []).forEach((item, index) => {
    const record = asRecord(item);
    const found = collectBarcodes(record, paths);
    if (!found.length || barcodes.length >= MAX_LIST_BARCODES) {
      return;
    }
    const caption = [`#${index + 1}`, ...plainValuesOf(record, chosen)].join(' · ');
    found.forEach((barcode) => {
      if (barcodes.length < MAX_LIST_BARCODES) {
        barcodes.push({ ...barcode, id: `${index}:${barcode.path}`, caption });
      }
    });
  });
  return barcodes;
};
