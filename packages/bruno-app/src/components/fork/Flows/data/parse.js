// A table of data as people have it: copied from a spreadsheet (tabs between cells) or written as CSV
// with commas or semicolons. The first line holds the names of the columns.
export const MAX_TABLE_ROWS = 1000;
export const MAX_TABLE_COLUMNS = 30;

const splitLine = (line, separator) => {
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quoted) {
      if (character === '"' && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"' && cell === '') {
      quoted = true;
    } else if (character === separator) {
      cells.push(cell);
      cell = '';
    } else {
      cell += character;
    }
  }
  cells.push(cell);
  return cells.map((text) => text.trim());
};

// A column is a field of each row, so its name cannot be empty, repeated or carry a dot.
const nameColumns = (head) => {
  const names = [];
  head.slice(0, MAX_TABLE_COLUMNS).forEach((raw, index) => {
    const base = raw.replace(/\./g, '_') || `column${index + 1}`;
    let name = base;
    for (let number = 2; names.includes(name); number += 1) {
      name = `${base}${number}`;
    }
    names.push(name);
  });
  return names;
};

export const parseTable = (text) => {
  const lines = String(text || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((line) => line.trim() !== '');
  if (!lines.length) {
    return { columns: [], rows: [] };
  }
  const separator = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  const [head, ...body] = lines.map((line) => splitLine(line, separator));
  const columns = nameColumns(head);
  return { columns, rows: body.slice(0, MAX_TABLE_ROWS).map((cells) => columns.map((name, index) => cells[index] ?? '')) };
};

export const tableToText = (table) => [table?.columns || [], ...(table?.rows || [])].filter((line) => line.length).map((line) => line.join('\t')).join('\n');
