const ScriptRuntime = require('../runtime/script-runtime');
const { visualize } = require('./visualize');

const baseRequest = { method: 'GET', url: 'http://localhost/', headers: {}, data: undefined };
const baseResponse = { status: 200, statusText: 'OK', data: { ok: true } };

const runResponse = (runtime, script) =>
  new ScriptRuntime({ runtime }).runResponseScript(script, { ...baseRequest }, { ...baseResponse }, {}, {}, '.', () => {}, process.env, {});

describe('bru.visualize', () => {
  beforeAll(async () => {
    // The QuickJS runtime needs its WASM module loaded first.
    await require('../sandbox/quickjs').loader();
  });

  it('keeps html panels in every accepted form', () => {
    const bru = {};
    visualize(bru, 'html', { name: 'Estado', content: '<p>uno</p>' });
    visualize(bru, 'html', '<p>dos</p>');
    visualize(bru, '<b>tres</b>');
    expect(bru.visualizations).toEqual([
      { type: 'html', name: 'Estado', content: '<p>uno</p>' },
      { type: 'html', name: 'Panel', content: '<b>tres</b>' }
    ]);
  });

  it('replaces a panel with the same name and caps the list', () => {
    const bru = {};
    visualize(bru, 'html', { name: 'A', content: '<p>1</p>' });
    visualize(bru, 'html', { name: 'A', content: '<p>2</p>' });
    for (let index = 0; index < 20; index += 1) {
      visualize(bru, 'html', { name: `P${index}`, content: '<p></p>' });
    }
    expect(bru.visualizations[0].content).toBe('<p>2</p>');
    expect(bru.visualizations).toHaveLength(10);
  });

  it('rejects other types and missing content', () => {
    expect(() => visualize({}, 'table', { content: '<p></p>' })).toThrow(/only "html"/);
    expect(() => visualize({}, 'html', { name: 'x' })).toThrow(/content must be/);
  });

  it.each(['nodevm', 'quickjs'])('returns the panels from a post-response script (%s)', async (runtime) => {
    const result = await runResponse(runtime, `
      bru.visualize('html', { name: 'Babel', content: '<table><tr><td>' + res.getBody().ok + '</td></tr></table>' });
    `);
    expect(result.visualizations).toEqual([
      { type: 'html', name: 'Babel', content: '<table><tr><td>true</td></tr></table>' }
    ]);
  });

  it.each(['nodevm', 'quickjs'])('returns an empty list when the script draws nothing (%s)', async (runtime) => {
    const result = await runResponse(runtime, `const x = 1;`);
    expect(result.visualizations).toEqual([]);
  });
});
