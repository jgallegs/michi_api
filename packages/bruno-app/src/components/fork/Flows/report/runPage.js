import { MASK, isSensitiveName, maskText } from 'components/fork/RequestHistory/store';
import { RUN_STATUS } from '../engine/run';
import { escape, toHtmlTable } from './export';
import { buildReport } from './table';

// The report of a whole run as one page that stands on its own: no scripts, nothing fetched from the
// network. What the run was (flow, collection, environment, when, how it ended), a summary on top, every
// list as a table and every step of the output, with the response of each one folded underneath.
// Anything that looks like a credential is masked the way the request history does it.

const SEPARATOR = ' · ';

const OUTCOMES = {
  [RUN_STATUS.COMPLETED]: { text: 'Finished', tone: 'ok' },
  [RUN_STATUS.STOPPED]: { text: 'Stopped by a Stop step', tone: 'ok' },
  [RUN_STATUS.CANCELLED]: { text: 'Stopped', tone: 'warning' },
  [RUN_STATUS.PAUSED]: { text: 'Paused', tone: 'plain' },
  [RUN_STATUS.FAILED]: { text: 'Run failed', tone: 'bad' },
  [RUN_STATUS.INVALID]: { text: 'Run failed', tone: 'bad' }
};

const STATES = { ok: 'Good', bad: 'Wrong', warning: 'Warning' };

export const outcomeOf = (status) => OUTCOMES[status] || { text: 'Not finished yet', tone: 'plain' };

const partText = (part, say) => {
  const item = typeof part === 'string' ? { text: part } : part || { text: '' };
  return item.translate ? say(item.text) : String(item.text ?? '');
};

// "token = abc" (a Start answer) and "token =" followed by its value (a Set variable) hide the value
// when the name looks like a credential; then the text itself goes through the history masking.
export const maskParts = (texts) => {
  let hideNext = false;
  return texts.map((text) => {
    if (hideNext) {
      hideNext = false;
      return MASK;
    }
    const named = text.match(/^(.+) =$/);
    if (named && isSensitiveName(named[1])) {
      hideNext = true;
      return text;
    }
    const pair = text.match(/^([^=]+?) = (.*)$/s);
    if (pair && isSensitiveName(pair[1])) {
      return `${pair[1]} = ${MASK}`;
    }
    return maskText(text);
  });
};

const isGood = (result) => !result.error && result.status >= 200 && result.status < 300 && !result.tests?.failed;

// How many requests went out in the run and how they went, and how many items each list ended with.
export const summarizeRun = (record, entries) => {
  const requests = entries.filter((entry) => entry.result);
  const good = requests.filter((entry) => isGood(entry.result)).length;
  return {
    requests: requests.length,
    good,
    bad: requests.length - good,
    lists: (record.lists || []).map((list) => ({ name: list.name, count: Array.isArray(list.items) ? list.items.length : 0 }))
  };
};

export const formatDuration = (ms, lang = 'en') => {
  const value = Math.max(0, Math.round(Number(ms) || 0));
  if (value < 1000) {
    return `${value} ms`;
  }
  if (value < 60000) {
    return `${(value / 1000).toLocaleString(lang, { maximumFractionDigits: 1 })} s`;
  }
  const minutes = Math.floor(value / 60000);
  const seconds = Math.round((value % 60000) / 1000);
  return `${minutes} min ${String(seconds).padStart(2, '0')} s`;
};

// The table of a list with its credentials hidden: by the name of the column, or inside the text.
const maskReport = (report) => ({
  ...report,
  rows: report.rows.map((row) => ({
    ...row,
    cells: Object.fromEntries(
      Object.entries(row.cells).map(([column, cell]) => [column, { ...cell, text: cell.text && isSensitiveName(column.split(SEPARATOR).pop()) ? MASK : maskText(cell.text) }])
    )
  }))
});

const listTitle = (list, index, say) => list.name || `${say('List')} ${index + 1}`;

const countText = (count, say) => `${count} ${say(count === 1 ? 'item' : 'items')}`;

const testsText = (tests, say) =>
  tests && tests.passed + tests.failed > 0 ? `${tests.passed} ${say('pass')}${SEPARATOR}${tests.failed} ${say('fail')}` : say('No tests');

const STYLE = [
  '*{box-sizing:border-box;}',
  'body{font-family:Segoe UI,Arial,sans-serif;color:#1f2937;background:#fff;margin:0;padding:32px;font-size:14px;line-height:1.45;}',
  'main{max-width:1200px;margin:0 auto;}',
  'h1{font-size:22px;margin:0;}',
  'h2{font-size:16px;margin:32px 0 12px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;}',
  'h3{font-size:14px;margin:20px 0 8px;}',
  'h3 small{font-weight:400;color:#6b7280;}',
  '.title{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px;}',
  '.badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;}',
  '.tone-ok{background:#dcfce7;color:#166534;}',
  '.tone-bad{background:#fee2e2;color:#991b1b;}',
  '.tone-warning{background:#fef3c7;color:#92400e;}',
  '.tone-plain{background:#e5e7eb;color:#374151;}',
  'dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:0;font-size:13px;}',
  'dt{color:#6b7280;}',
  'dd{margin:0;}',
  '.tiles{display:flex;flex-wrap:wrap;gap:10px;}',
  '.tile{display:block;min-width:140px;padding:10px 14px;border:1px solid #e5e7eb;border-radius:8px;color:inherit;text-decoration:none;}',
  'a.tile:hover{border-color:#9ca3af;}',
  '.tile b{display:block;font-size:22px;}',
  '.tile span{color:#6b7280;font-size:12px;}',
  '.tile.good b{color:#166534;}',
  '.tile.bad b{color:#991b1b;}',
  '.scroll{overflow-x:auto;}',
  'table{border-collapse:collapse;font-size:13px;}',
  'th,td{border:1px solid #d1d5db;padding:5px 9px;text-align:left;vertical-align:top;}',
  'th{background:#f3f4f6;font-weight:600;white-space:nowrap;}',
  'tbody tr:nth-child(even) td{background:#fafafa;}',
  '.steps td.state{font-weight:600;white-space:nowrap;}',
  '.steps tr.tone-ok td.state{color:#166534;background:none;}',
  '.steps tr.tone-bad td.state{color:#991b1b;background:none;}',
  '.steps tr.tone-warning td.state{color:#92400e;background:none;}',
  '.steps tr.tone-bad td{background:#fef2f2;}',
  '.steps td.nowrap{white-space:nowrap;}',
  'details{margin-top:4px;}',
  'summary{cursor:pointer;color:#4b5563;font-size:12px;}',
  'pre{margin:6px 0 0;padding:8px;max-height:420px;overflow:auto;background:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;',
  'font-family:Consolas,monospace;font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere;}',
  '.empty{color:#6b7280;}',
  'footer{margin-top:32px;color:#9ca3af;font-size:12px;}',
  '@media print{body{padding:0;}pre{max-height:none;}}'
].join('');

const metaRow = (name, value) => `<dt>${escape(name)}</dt><dd>${escape(value)}</dd>`;

const tile = (value, label, className = '', href = '') =>
  `<${href ? `a href="${href}"` : 'div'} class="tile ${className}"><b>${escape(value)}</b><span>${escape(label)}</span></${href ? 'a' : 'div'}>`;

const stepRow = (entry, index, say) => {
  const tone = entry.tone && STATES[entry.tone] ? entry.tone : 'plain';
  const result = entry.result || {};
  const texts = maskParts((entry.parts || []).map((part) => partText(part, say)));
  const detail = entry.detail ? maskText(String(entry.detail)) : '';
  const unfold = detail ? `<details><summary>${escape(say('Show the details'))}</summary><pre>${escape(detail)}</pre></details>` : '';
  return [
    `<tr class="tone-${tone}">`,
    `<td>${index + 1}</td>`,
    `<td class="nowrap">${escape(new Date(entry.time).toLocaleTimeString([], { hour12: false }))}</td>`,
    `<td>${escape(entry.label ? partText(entry.label, say) : '')}</td>`,
    `<td class="state">${escape(STATES[tone] ? say(STATES[tone]) : '')}</td>`,
    `<td>${escape(result.status ?? '')}</td>`,
    `<td class="nowrap">${result.duration !== undefined ? escape(`${result.duration} ms`) : ''}</td>`,
    `<td>${escape(texts.join(' '))}${unfold}</td>`,
    '</tr>'
  ].join('');
};

// record: what the controller kept of the run (run/session.js). entries: its lines of the output, the
// header left out. say: the translation of interface words. lang: the language of the page.
export const buildRunPage = ({ record, entries, say = (text) => text, lang = 'en', generatedAt = Date.now() }) => {
  const steps = entries.filter((entry) => entry.kind !== 'header' && entry.kind !== 'end');
  const summary = summarizeRun(record, steps);
  const outcome = outcomeOf(record.outcome);
  const lists = record.lists || [];
  const title = `${say('Run report')}${SEPARATOR}${record.flowName || ''}`;

  const meta = [
    metaRow(say('Collection'), record.collectionName || ''),
    metaRow(say('Environment'), record.environmentName || say('No environment')),
    ...(record.scope ? [metaRow(say('Part run'), record.scope)] : []),
    metaRow(say('Started at'), record.startedAt ? new Date(record.startedAt).toLocaleString(lang) : ''),
    metaRow(say('Total time'), record.startedAt && record.endedAt ? formatDuration(record.endedAt - record.startedAt, lang) : ''),
    metaRow(say('Tests'), testsText(record.tests, say))
  ].join('');

  const tiles = [
    tile(summary.requests, say('Requests')),
    tile(summary.good, say('Went well'), 'good'),
    tile(summary.bad, say('Went wrong'), summary.bad ? 'bad' : ''),
    ...summary.lists.map((list, index) => tile(list.count, listTitle(lists[index], index, say), '', `#list-${index + 1}`))
  ].join('');

  const listSections = lists
    .map((list, index) => {
      const report = buildReport(list.items);
      const body = report.rows.length ? `<div class="scroll">${toHtmlTable(maskReport(report), '#')}</div>` : `<p class="empty">${escape(say('The list is empty'))}</p>`;
      return `<h3 id="list-${index + 1}">${escape(listTitle(list, index, say))} <small>${escape(countText(report.count, say))}</small></h3>${body}`;
    })
    .join('');

  const head = ['#', say('Time'), say('Step'), say('State'), say('Status'), say('Took'), say('Result')].map((name) => `<th>${escape(name)}</th>`).join('');
  const stepTable = steps.length
    ? `<div class="scroll"><table class="steps"><thead><tr>${head}</tr></thead><tbody>${steps.map((entry, index) => stepRow(entry, index, say)).join('')}</tbody></table></div>`
    : `<p class="empty">${escape(say('No steps ran'))}</p>`;

  return [
    `<!DOCTYPE html><html lang="${escape(lang)}"><head><meta charset="utf-8">`,
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'">',
    `<title>${escape(title)}</title><style>${STYLE}</style></head><body><main>`,
    `<div class="title"><h1>${escape(record.flowName || '')}</h1><span class="badge tone-${outcome.tone}">${escape(say(outcome.text))}</span></div>`,
    `<dl>${meta}</dl>`,
    `<h2>${escape(say('Summary'))}</h2><div class="tiles">${tiles}</div>`,
    lists.length ? `<h2>${escape(say('Lists'))}</h2>${listSections}` : '',
    `<h2>${escape(say('Steps'))}</h2>${stepTable}`,
    `<footer>${escape(say('Run report'))}${SEPARATOR}${escape(new Date(generatedAt).toLocaleString(lang))}</footer>`,
    '</main></body></html>'
  ].join('');
};

const pad = (value) => String(value).padStart(2, '0');

export const runReportFileName = (record) => {
  const date = new Date(record.startedAt || Date.now());
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
  const name = String(record.flowName || '').replace(/[^\p{L}\p{N} _-]+/gu, ' ').trim().replace(/\s+/g, '-') || 'run';
  return `${name}-${stamp}.html`;
};
