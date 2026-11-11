// Which values of a response become barcodes. A folder says so with an ordinary variable, so nothing in
// the collection format changes: its value lists the fields to read, separated by commas.
//   michi.barcodes = shipmentNumber, parcels.code
// A field inside a list gives one barcode per item; "parcels.0.code" or "parcels[0].code" gives one.
export const BARCODE_VARIABLE = 'michi.barcodes';
export const MAX_BARCODES = 100;
const MAX_VALUE_LENGTH = 200;

const toPath = (text) =>
  text
    .trim()
    .replace(/^\$\.?/, '')
    .replace(/\[(\d+)\]/g, '.$1')
    .replace(/^\.+|\.+$/g, '');

export const parseBarcodeFields = (value) => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return [];
  }
  const paths = String(value)
    .split(/[,;\n]/)
    .map(toPath)
    .filter(Boolean);
  return [...new Set(paths)];
};

const isIndex = (segment) => /^\d+$/.test(segment);

const showPath = (steps) => steps.reduce((text, step) => (typeof step === 'number' ? `${text}[${step}]` : text ? `${text}.${step}` : step), '');

// Walks the path and opens every list it meets on the way, unless the path names a position.
const readAll = (data, segments) => {
  let found = [{ value: data, steps: [] }];
  segments.forEach((segment) => {
    found = found.flatMap(({ value, steps }) => {
      if (Array.isArray(value)) {
        if (isIndex(segment)) {
          return Number(segment) < value.length ? [{ value: value[Number(segment)], steps: [...steps, Number(segment)] }] : [];
        }
        return value
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item && typeof item === 'object' && !Array.isArray(item) && segment in item)
          .map(({ item, index }) => ({ value: item[segment], steps: [...steps, index, segment] }));
      }
      if (value && typeof value === 'object' && segment in value) {
        return [{ value: value[segment], steps: [...steps, segment] }];
      }
      return [];
    });
  });
  // A field that is a list of plain values gives one barcode for each.
  return found.flatMap(({ value, steps }) =>
    Array.isArray(value) ? value.map((item, index) => ({ value: item, steps: [...steps, index] })) : [{ value, steps }]
  );
};

const toText = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return typeof value === 'string' ? value.trim() : '';
};

const parseBody = (data) => {
  if (typeof data !== 'string') {
    return data;
  }
  try {
    return JSON.parse(data);
  } catch (err) {
    return null;
  }
};

// One entry per value found, in the order the fields were listed. "position" and "of" tell which one
// of its field it is when the field gave several.
export const collectBarcodes = (data, paths) => {
  const body = parseBody(data);
  if (!body || typeof body !== 'object') {
    return [];
  }
  const seen = new Set();
  const barcodes = [];
  paths.forEach((path) => {
    const values = readAll(body, path.split('.'))
      .map(({ value, steps }) => ({ text: toText(value), steps }))
      .filter(({ text }) => text && text.length <= MAX_VALUE_LENGTH);
    values.forEach(({ text, steps }, index) => {
      const where = showPath(steps);
      if (seen.has(where) || barcodes.length >= MAX_BARCODES) {
        return;
      }
      seen.add(where);
      const names = steps.filter((step) => typeof step === 'string');
      barcodes.push({ id: where, field: names[names.length - 1] || path, path: where, source: path, value: text, position: index + 1, of: values.length });
    });
  });
  return barcodes;
};

const enabledVars = (vars) => (Array.isArray(vars) ? vars : []).filter((variable) => variable && variable.enabled !== false);

const valueIn = (vars) => {
  const found = enabledVars(vars).find((variable) => variable.name === BARCODE_VARIABLE);
  return found && typeof found.value === 'string' && found.value.trim() ? found.value : null;
};

// The variable of the request wins over the one of its folder, the nearest folder over the ones above
// it, and all of them over the one of the collection. "path" goes from the outermost folder to the request.
export const barcodeFieldsFor = (collection, path = []) => {
  const levels = [...path].reverse().map((item) => {
    if (!item) {
      return null;
    }
    if (item.type === 'folder') {
      return (item.draft || item.root)?.request?.vars?.req;
    }
    return (item.draft || item)?.request?.vars?.req;
  });
  levels.push((collection?.draft?.root || collection?.root)?.request?.vars?.req);
  for (const vars of levels) {
    const value = valueIn(vars);
    if (value !== null) {
      return parseBarcodeFields(value);
    }
  }
  return [];
};
