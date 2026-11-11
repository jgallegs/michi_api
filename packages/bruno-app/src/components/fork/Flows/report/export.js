import { toGrid } from './table';

// A report leaves the app as text: tab separated for a spreadsheet, as a table for a mail or a document,
// and as a page of its own to keep or send.
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escape = (text) => String(text).replace(/[&<>"]/g, (character) => ESCAPES[character]);
const flat = (text) => String(text).replace(/[\t\r\n]+/g, ' ');

export const toTsv = (report, numberTitle = '#') =>
  [[numberTitle, ...report.columns], ...toGrid(report)].map((line) => line.map(flat).join('\t')).join('\n');

// The table with its spans. A cell missing where nothing starts and nothing reaches is written empty,
// so the columns never slide.
export const toHtmlTable = (report, numberTitle = '#') => {
  const reach = {};
  const head = `<tr>${[numberTitle, ...report.columns].map((column) => `<th>${escape(column)}</th>`).join('')}</tr>`;
  const body = report.rows
    .map((row) => {
      const number = row.item ? `<td rowspan="${row.span}">${row.item}</td>` : '';
      const cells = report.columns
        .map((column) => {
          const cell = row.cells[column];
          if (cell) {
            reach[column] = cell.span - 1;
            return `<td${cell.span > 1 ? ` rowspan="${cell.span}"` : ''}>${escape(cell.text)}</td>`;
          }
          if (reach[column] > 0) {
            reach[column] -= 1;
            return '';
          }
          return '<td></td>';
        })
        .join('');
      return `<tr>${number}${cells}</tr>`;
    })
    .join('');
  return `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
};

const PAGE_STYLE = [
  'body{font-family:Segoe UI,Arial,sans-serif;color:#1f2937;margin:32px;}',
  'h1{font-size:20px;margin:0 0 4px;}',
  'p{color:#6b7280;margin:0 0 20px;font-size:13px;}',
  'table{border-collapse:collapse;font-size:13px;}',
  'th,td{border:1px solid #d1d5db;padding:6px 10px;text-align:left;vertical-align:top;}',
  'th{background:#f3f4f6;font-weight:600;}',
  'tbody tr:nth-child(even) td{background:#fafafa;}'
].join('');

export const toHtmlPage = (report, { title, subtitle, numberTitle }) =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escape(title)}</title><style>${PAGE_STYLE}</style></head>`
  + `<body><h1>${escape(title)}</h1><p>${escape(subtitle)}</p>${toHtmlTable(report, numberTitle)}</body></html>`;

// Puts the table on the clipboard both ways, so it pastes as a table wherever it lands.
export const copyReport = async (report, numberTitle) => {
  const text = toTsv(report, numberTitle);
  const html = toHtmlTable(report, numberTitle);
  if (window.ClipboardItem && navigator.clipboard?.write) {
    await navigator.clipboard.write([
      new window.ClipboardItem({ 'text/plain': new Blob([text], { type: 'text/plain' }), 'text/html': new Blob([html], { type: 'text/html' }) })
    ]);
  } else {
    await navigator.clipboard.writeText(text);
  }
};

export const saveAsFile = (name, content, type) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
