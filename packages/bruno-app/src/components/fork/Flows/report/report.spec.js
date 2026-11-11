import { toHtmlPage, toHtmlTable, toTsv } from './export';
import { buildReport, summarize, toGrid } from './table';

const shipments = [
  { shipment: 'E1', parcels: [{ order: '01', code: 'E1-B1' }, { order: '02', code: 'E1-B2' }] },
  { shipment: 'E2', parcels: [{ order: '01', code: 'E2-B1' }], note: 'late' }
];

describe('flow report', () => {
  it('lays a list of things out as a table, one row per item', () => {
    const report = buildReport([{ id: 1, name: 'a' }, { id: 2, state: 'ok' }]);
    expect(report.columns).toEqual(['id', 'name', 'state']);
    expect(report.count).toBe(2);
    expect(toGrid(report)).toEqual([
      ['1', '1', 'a', ''],
      ['2', '2', '', 'ok']
    ]);
  });

  it('opens a list inside an item into rows, with the fields around spanning them', () => {
    const report = buildReport(shipments);
    expect(report.columns).toEqual(['shipment', 'parcels · order', 'parcels · code', 'note']);
    expect(report.rows.map((row) => row.item)).toEqual([1, undefined, 2]);
    expect(report.rows[0].cells.shipment).toEqual({ text: 'E1', span: 2 });
    expect(report.rows[1].cells).toEqual({ 'parcels · order': { text: '02', span: 1 }, 'parcels · code': { text: 'E1-B2', span: 1 } });
    expect(toGrid(report)).toEqual([
      ['1', 'E1', '01', 'E1-B1', ''],
      ['1', 'E1', '02', 'E1-B2', ''],
      ['2', 'E2', '01', 'E2-B1', 'late']
    ]);
  });

  it('shows plain values, things inside things and lists of plain values', () => {
    expect(toGrid(buildReport(['a', 7, null]))).toEqual([['1', 'a'], ['2', '7'], ['3', '']]);
    const report = buildReport([{ who: { name: 'Ana', tags: ['x', 'y'] }, empty: [] }]);
    expect(report.columns).toEqual(['who · name', 'who · tags', 'empty']);
    expect(toGrid(report)).toEqual([['1', 'Ana', 'x, y', '']]);
    expect(buildReport(undefined)).toEqual({ columns: [], rows: [], count: 0 });
  });

  it('keeps two lists of one item side by side', () => {
    const report = buildReport([{ id: 1, parcels: [{ code: 'a' }, { code: 'b' }, { code: 'c' }], events: [{ kind: 'x' }] }]);
    expect(toGrid(report)).toEqual([
      ['1', '1', 'a', 'x'],
      ['1', '1', 'b', ''],
      ['1', '1', 'c', '']
    ]);
  });

  it('leaves as text for a spreadsheet, without tabs or line breaks inside a cell', () => {
    expect(toTsv(buildReport([{ text: 'a\tb\nc' }]), 'No.')).toBe('No.\ttext\n1\ta b c');
  });

  it('leaves as a table with its spans and nothing that could be read as markup', () => {
    const html = toHtmlTable(buildReport(shipments));
    expect(html).toContain('<th>parcels · code</th>');
    expect(html).toContain('<td rowspan="2">E1</td>');
    expect(html).toContain('<tr><td>02</td><td>E1-B2</td><td></td></tr>');
    expect(toHtmlTable(buildReport([{ name: '<b>&"' }]))).toContain('<td>&lt;b&gt;&amp;&quot;</td>');
    const page = toHtmlPage(buildReport(shipments), { title: 'List · <Final>', subtitle: '2 items', numberTitle: '#' });
    expect(page).toContain('<h1>List · &lt;Final&gt;</h1>');
    expect(page.startsWith('<!DOCTYPE html>')).toBe(true);
  });

  it('sums an item up in a line for the step', () => {
    expect(summarize(shipments[0])).toEqual([{ name: 'shipment', value: 'E1' }, { name: 'parcels', value: '(2)' }]);
    expect(summarize('plain')).toEqual([{ value: 'plain' }]);
    expect(summarize({ who: { name: 'Ana' } })).toEqual([{ name: 'who', value: '{…}' }]);
  });
});
