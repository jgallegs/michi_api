// Turns what a list holds into something a person can read: a table with one row per item. A field
// that is itself a list of things (the parcels of a shipment) opens into as many rows as it has, and the
// fields around it span them, so every shipment stays next to its parcels.
const MAX_DEPTH = 4;
const MAX_ROWS = 2000;
const SEPARATOR = ' · ';

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isListOfRecords = (value) => Array.isArray(value) && value.length > 0 && value.every(isRecord);

export const textOf = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === 'object' && item !== null ? JSON.stringify(item) : String(item))).join(', ');
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
};

// The rows a value needs. Each row maps a column to the cell that starts on it: its text and how many
// rows it spans.
const layOut = (value, prefix, depth) => {
  if (!isRecord(value) || depth > MAX_DEPTH) {
    return [{ [prefix || 'value']: { text: textOf(value), span: 1 } }];
  }
  const own = {};
  const groups = [];
  Object.entries(value).forEach(([key, inner]) => {
    const column = prefix ? `${prefix}${SEPARATOR}${key}` : key;
    if (isListOfRecords(inner) && depth < MAX_DEPTH) {
      groups.push(inner.flatMap((item) => layOut(item, column, depth + 1)));
    } else if (isRecord(inner) && depth < MAX_DEPTH) {
      groups.push(layOut(inner, column, depth + 1));
    } else {
      own[column] = textOf(inner);
    }
  });
  const height = Math.max(1, ...groups.map((group) => group.length));
  const rows = Array.from({ length: height }, () => ({}));
  Object.entries(own).forEach(([column, text]) => {
    rows[0][column] = { text, span: height };
  });
  groups.forEach((group) => group.forEach((row, index) => Object.assign(rows[index], row)));
  return rows;
};

// The columns a value fills, in the order its fields come.
const columnsOf = (value, prefix, depth, found) => {
  if (!isRecord(value) || depth > MAX_DEPTH) {
    const column = prefix || 'value';
    if (!found.includes(column)) {
      found.push(column);
    }
    return;
  }
  Object.entries(value).forEach(([key, inner]) => {
    const column = prefix ? `${prefix}${SEPARATOR}${key}` : key;
    if (isListOfRecords(inner) && depth < MAX_DEPTH) {
      inner.forEach((item) => columnsOf(item, column, depth + 1, found));
    } else if (isRecord(inner) && depth < MAX_DEPTH) {
      columnsOf(inner, column, depth + 1, found);
    } else if (!found.includes(column)) {
      found.push(column);
    }
  });
};

// columns: the names of the columns, in the order they first appear. rows: one per line of the table;
// each holds, per column, the cell that starts there. "item" numbers the things of the list, and is
// only set on the first row of each.
export const buildReport = (items) => {
  const rows = [];
  const columns = [];
  (Array.isArray(items) ? items : []).forEach((item, index) => {
    if (rows.length < MAX_ROWS) {
      columnsOf(item, '', 0, columns);
    }
    const lines = layOut(item, '', 0);
    lines.forEach((cells, line) => {
      if (rows.length < MAX_ROWS) {
        rows.push({ cells, ...(line === 0 ? { item: index + 1, span: lines.length } : {}) });
      }
    });
  });
  return { columns, rows, count: Array.isArray(items) ? items.length : 0 };
};

// The same table as a grid without spans: a cell that covers several rows is repeated on each, which is
// what a spreadsheet needs to sort and filter.
export const toGrid = ({ columns, rows }) => {
  const running = {};
  let item = '';
  return rows.map((row) => {
    item = row.item ?? item;
    return [
      String(item),
      ...columns.map((column) => {
        const cell = row.cells[column];
        if (cell) {
          running[column] = { text: cell.text, left: cell.span };
        }
        const current = running[column];
        if (!current || current.left <= 0) {
          return '';
        }
        current.left -= 1;
        return current.text;
      })
    ];
  });
};

// A short line for each item, for the small view inside the List step.
export const summarize = (item) => {
  if (!isRecord(item)) {
    return [{ value: textOf(item) }];
  }
  return Object.entries(item).map(([name, value]) => ({
    name,
    value: Array.isArray(value) ? `(${value.length})` : isRecord(value) ? '{…}' : textOf(value)
  }));
};
