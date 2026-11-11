import { MAX_TABLE_ROWS, parseTable, tableToText } from './parse';

describe('data table text', () => {
  it('reads what is copied from a spreadsheet, with the first line as the names of the columns', () => {
    expect(parseTable('ref\tphone\nA-1\t600\nA-2\t601\n')).toEqual({ columns: ['ref', 'phone'], rows: [['A-1', '600'], ['A-2', '601']] });
  });

  it('reads comma or semicolon separated text, with quotes around a cell that holds the separator', () => {
    expect(parseTable('name,city\n"Pérez, Ana",Lugo')).toEqual({ columns: ['name', 'city'], rows: [['Pérez, Ana', 'Lugo']] });
    expect(parseTable('name;note\r\nAna;"she said ""hi"""')).toEqual({ columns: ['name', 'note'], rows: [['Ana', 'she said "hi"']] });
  });

  it('gives every column a name that can be a field, and every row all its cells', () => {
    expect(parseTable('a.b\t\ta.b\n1\n1\t2\t3\t4')).toEqual({ columns: ['a_b', 'column2', 'a_b2'], rows: [['1', '', ''], ['1', '2', '3']] });
  });

  it('reads nothing from an empty text and never more rows than a table can hold', () => {
    expect(parseTable('  \n ')).toEqual({ columns: [], rows: [] });
    const long = ['n', ...Array.from({ length: MAX_TABLE_ROWS + 20 }, (unused, index) => String(index))].join('\n');
    expect(parseTable(long).rows).toHaveLength(MAX_TABLE_ROWS);
  });

  it('writes a table back as the text it is edited in', () => {
    const table = { columns: ['ref', 'phone'], rows: [['A-1', '600']] };
    expect(parseTable(tableToText(table))).toEqual(table);
    expect(tableToText({})).toBe('');
  });
});
