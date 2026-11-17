import { buildRunPage, formatDuration, maskParts, outcomeOf, runReportFileName, summarizeRun } from './runPage';

const word = (text) => ({ text, translate: true });

const record = {
  flowId: 'f1',
  flowName: 'Bring services up',
  collectionName: 'Shop',
  environmentName: 'Staging',
  scope: null,
  startedAt: new Date(2026, 10, 17, 9, 30, 0).getTime(),
  endedAt: new Date(2026, 10, 17, 9, 32, 5).getTime(),
  outcome: 'completed',
  tests: { passed: 5, failed: 1 },
  lists: [
    { name: 'Already up', items: [{ service: 'orders', status: 'UP' }, { service: 'stock', status: 'UP' }] },
    { name: 'Brought up now', items: [{ service: 'labels', session: { token: 'T-123', user: 'ana' } }] },
    { name: 'Could not be brought up', items: [] }
  ]
};

const entries = [
  { id: 2, kind: 'step', label: { text: 'login' }, parts: ['200 OK', '·', '12 ms'], result: { status: 200, statusText: 'OK', duration: 12 }, detail: '{\n  "token": "secret-T1",\n  "user": "ana"\n}', time: record.startedAt },
  { id: 3, kind: 'step', label: word('Set variable'), parts: ['token =', 'abc'], time: record.startedAt },
  { id: 4, kind: 'step', tone: 'bad', label: { text: 'status <stock>' }, parts: ['503'], result: { status: 503, duration: 40 }, detail: 'Bearer abc.def', time: record.startedAt },
  { id: 5, kind: 'step', tone: 'warning', label: { text: 'check' }, parts: ['200 OK'], result: { status: 200, duration: 8, tests: { passed: 1, failed: 1 } }, time: record.startedAt },
  { id: 6, kind: 'step', tone: 'bad', label: { text: 'start labels' }, parts: [word('The request could not be sent')], result: { error: 'The request could not be sent' }, time: record.startedAt },
  { id: 7, kind: 'step', label: word('Wait'), parts: ['1 s'], time: record.startedAt },
  { id: 8, kind: 'end', tone: 'ok', parts: [word('Finished')], time: record.endedAt }
];

const SPANISH = {
  'Run report': 'Informe de ejecución',
  'Finished': 'Terminado',
  'Collection': 'Colección',
  'Steps': 'Pasos',
  'Wait': 'Esperar',
  'items': 'elementos',
  'The list is empty': 'La lista está vacía'
};
const spanish = (text) => SPANISH[text] || text;

describe('run report page', () => {
  it('counts the requests of the run, how they went and what each list ended with', () => {
    expect(summarizeRun(record, entries)).toEqual({
      requests: 4,
      good: 1,
      bad: 3,
      lists: [{ name: 'Already up', count: 2 }, { name: 'Brought up now', count: 1 }, { name: 'Could not be brought up', count: 0 }]
    });
    expect(summarizeRun({}, [])).toEqual({ requests: 0, good: 0, bad: 0, lists: [] });
  });

  it('tells how the run ended', () => {
    expect(outcomeOf('completed')).toEqual({ text: 'Finished', tone: 'ok' });
    expect(outcomeOf('cancelled')).toEqual({ text: 'Stopped', tone: 'warning' });
    expect(outcomeOf('failed').text).toBe('Run failed');
    expect(outcomeOf('invalid').text).toBe('Run failed');
    expect(outcomeOf(null).text).toBe('Not finished yet');
  });

  it('writes durations the way a person reads them', () => {
    expect(formatDuration(850)).toBe('850 ms');
    expect(formatDuration(12345)).toBe('12.3 s');
    expect(formatDuration(125000)).toBe('2 min 05 s');
    expect(formatDuration(undefined)).toBe('0 ms');
  });

  it('opens with the flow, where it ran, when, how long and how it ended', () => {
    const page = buildRunPage({ record, entries });
    expect(page.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(page).toContain('<title>Run report · Bring services up</title>');
    expect(page).toContain('<h1>Bring services up</h1><span class="badge tone-ok">Finished</span>');
    expect(page).toContain('<dt>Collection</dt><dd>Shop</dd>');
    expect(page).toContain('<dt>Environment</dt><dd>Staging</dd>');
    expect(page).toContain('<dt>Total time</dt><dd>2 min 05 s</dd>');
    expect(page).toContain('<dt>Tests</dt><dd>5 pass · 1 fail</dd>');
    expect(buildRunPage({ record: { ...record, environmentName: null, tests: null, outcome: 'cancelled' }, entries })).toContain('<dd>No environment</dd>');
    expect(buildRunPage({ record: { ...record, tests: { passed: 0, failed: 0 } }, entries })).toContain('<dt>Tests</dt><dd>No tests</dd>');
  });

  it('sums the run up on top, with a card per list that leads to its table', () => {
    const page = buildRunPage({ record, entries });
    expect(page).toContain('<div class="tile "><b>4</b><span>Requests</span></div>');
    expect(page).toContain('<div class="tile good"><b>1</b><span>Went well</span></div>');
    expect(page).toContain('<div class="tile bad"><b>3</b><span>Went wrong</span></div>');
    expect(page).toContain('<a href="#list-1" class="tile "><b>2</b><span>Already up</span></a>');
    expect(page).toContain('<a href="#list-3" class="tile "><b>0</b><span>Could not be brought up</span></a>');
  });

  it('lays every list out as a table, an empty one says so', () => {
    const page = buildRunPage({ record, entries });
    expect(page).toContain('<h3 id="list-1">Already up <small>2 items</small></h3>');
    expect(page).toContain('<th>service</th><th>status</th>');
    expect(page).toContain('<td>orders</td><td>UP</td>');
    expect(page).toContain('<h3 id="list-3">Could not be brought up <small>0 items</small></h3><p class="empty">The list is empty</p>');
    expect(buildRunPage({ record: { ...record, lists: [] }, entries })).not.toContain('<h2>Lists</h2>');
  });

  it('lists the steps with state, code and time, and folds the response of each one', () => {
    const page = buildRunPage({ record, entries });
    expect(page).toContain('<th>#</th><th>Time</th><th>Step</th><th>State</th><th>Status</th><th>Took</th><th>Result</th>');
    expect(page).toMatch(/<tr class="tone-plain"><td>1<\/td><td class="nowrap">[^<]+<\/td><td>login<\/td><td class="state"><\/td><td>200<\/td><td class="nowrap">12 ms<\/td><td>200 OK · 12 ms<details><summary>Show the details<\/summary><pre>/);
    expect(page).toContain('<td>status &lt;stock&gt;</td><td class="state">Wrong</td><td>503</td><td class="nowrap">40 ms</td>');
    expect(page).toContain('<td class="state">Warning</td>');
    // The end line is the badge of the header, not a step.
    expect(page.match(/<tr class="tone-/g)).toHaveLength(6);
    expect(buildRunPage({ record, entries: [] })).toContain('<p class="empty">No steps ran</p>');
  });

  it('masks credentials in steps, responses and lists, like the request history', () => {
    const page = buildRunPage({ record, entries });
    expect(page).not.toContain('secret-T1');
    expect(page).toContain('&quot;token&quot;: &quot;***&quot;');
    expect(page).toContain('&quot;user&quot;: &quot;ana&quot;');
    expect(page).toContain('token = ***');
    expect(page).not.toContain('abc.def');
    expect(page).toContain('Bearer ***');
    expect(page).not.toContain('T-123');
    expect(maskParts(['password = hunter2', 'name = Ana', 'apiKey =', 'k1', 'plain'])).toEqual(['password = ***', 'name = Ana', 'apiKey =', '***', 'plain']);
  });

  it('stands on its own: no scripts and nothing from the network', () => {
    const page = buildRunPage({ record: { ...record, flowName: '<script>alert(1)</script>' }, entries });
    expect(page).not.toMatch(/<script/i);
    expect(page).not.toMatch(/(src|href)="(https?:)?\/\//i);
    expect(page).toContain('default-src \'none\'');
  });

  it('speaks the language of the interface', () => {
    const page = buildRunPage({ record, entries, say: spanish, lang: 'es' });
    expect(page).toContain('<html lang="es">');
    expect(page).toContain('<title>Informe de ejecución · Bring services up</title>');
    expect(page).toContain('<span class="badge tone-ok">Terminado</span>');
    expect(page).toContain('<dt>Colección</dt>');
    expect(page).toContain('<h2>Pasos</h2>');
    expect(page).toContain('<td>Esperar</td>');
    expect(page).toContain('<small>2 elementos</small>');
  });

  it('names the file after the flow and when it started', () => {
    expect(runReportFileName(record)).toBe('Bring-services-up-2026-11-17-0930.html');
    expect(runReportFileName({ ...record, flowName: '../:*' })).toBe('run-2026-11-17-0930.html');
  });
});
