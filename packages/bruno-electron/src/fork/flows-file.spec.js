const fs = require('fs');
const os = require('os');
const path = require('path');

jest.mock('electron', () => ({ ipcMain: { handle: jest.fn() } }));

const { SETTINGS_FILE } = require('./collection-settings-file');
const { FLOW_VERSION, listFlows, saveFlow, deleteFlow } = require('./flows-file');

const makeCollection = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flows-file-'));
  fs.writeFileSync(path.join(dir, 'bruno.json'), '{}');
  return dir;
};

const readFile = (dir) => JSON.parse(fs.readFileSync(path.join(dir, SETTINGS_FILE), 'utf8'));

const makeFlow = (id, name, extra = {}) => ({ id, name, version: FLOW_VERSION, folder: '', nodes: [], edges: [], ...extra });

describe('flows file', () => {
  it('returns an empty list when there is no settings file', () => {
    expect(listFlows(makeCollection())).toEqual([]);
  });

  it('saves flows with sorted keys and lists them back', () => {
    const dir = makeCollection();
    saveFlow(dir, makeFlow('b-flow', 'Second'));
    saveFlow(dir, makeFlow('a-flow', 'First', { nodes: [{ id: 'n1', type: 'request' }] }));

    expect(Object.keys(readFile(dir).flows)).toEqual(['a-flow', 'b-flow']);
    expect(listFlows(dir).map((flow) => flow.name)).toEqual(['First', 'Second']);
  });

  it('replaces a flow with the same id', () => {
    const dir = makeCollection();
    saveFlow(dir, makeFlow('f1', 'Before'));
    saveFlow(dir, makeFlow('f1', 'After'));
    expect(listFlows(dir)).toEqual([makeFlow('f1', 'After')]);
  });

  it('deletes flows and removes the key when none is left, keeping other settings', () => {
    const dir = makeCollection();
    fs.writeFileSync(path.join(dir, SETTINGS_FILE), JSON.stringify({ sensitiveEnvironments: ['PROD'] }));
    saveFlow(dir, makeFlow('f1', 'One'));
    saveFlow(dir, makeFlow('f2', 'Two'));

    deleteFlow(dir, 'f1');
    expect(listFlows(dir).map((flow) => flow.id)).toEqual(['f2']);

    deleteFlow(dir, 'f2');
    expect(readFile(dir)).toEqual({ sensitiveEnvironments: ['PROD'] });
  });

  it('removes the file when deleting the last flow of an otherwise empty settings file', () => {
    const dir = makeCollection();
    saveFlow(dir, makeFlow('f1', 'One'));
    deleteFlow(dir, 'f1');
    expect(fs.existsSync(path.join(dir, SETTINGS_FILE))).toBe(false);
  });

  it('rejects malformed flows without touching the file', () => {
    const dir = makeCollection();
    expect(() => saveFlow(dir, null)).toThrow('Invalid flow');
    expect(() => saveFlow(dir, makeFlow('bad id', 'Name'))).toThrow('Invalid flow id');
    expect(() => saveFlow(dir, makeFlow('f1', '  '))).toThrow('Invalid flow name');
    expect(() => saveFlow(dir, makeFlow('f1', 'Name', { version: 99 }))).toThrow('Unsupported flow version');
    expect(() => saveFlow(dir, makeFlow('f1', 'Name', { nodes: 'x' }))).toThrow('Invalid flow graph');
    expect(() => deleteFlow(dir, '../x')).toThrow('Invalid flow id');
    expect(fs.existsSync(path.join(dir, SETTINGS_FILE))).toBe(false);
  });

  it('ignores entries whose key does not match the flow id', () => {
    const dir = makeCollection();
    fs.writeFileSync(path.join(dir, SETTINGS_FILE), JSON.stringify({ flows: { f1: makeFlow('other', 'X'), f2: 'junk' } }));
    expect(listFlows(dir)).toEqual([]);
  });

  it('keeps a file with git conflict markers intact and reports it', () => {
    const dir = makeCollection();
    const damaged = '{\n  "sensitiveEnvironments": ["PROD"],\n  "flows": {\n<<<<<<< HEAD\n    "a": {}\n=======\n    "b": {}\n>>>>>>> main\n  }\n}\n';
    fs.writeFileSync(path.join(dir, SETTINGS_FILE), damaged);

    expect(() => listFlows(dir)).toThrow('git conflict');
    expect(() => saveFlow(dir, makeFlow('f1', 'One'))).toThrow('git conflict');
    expect(() => deleteFlow(dir, 'a')).toThrow('git conflict');
    expect(fs.readFileSync(path.join(dir, SETTINGS_FILE), 'utf8')).toBe(damaged);
  });

  it('does not replace a flows value that is not an object', () => {
    const dir = makeCollection();
    const content = JSON.stringify({ flows: 'junk', sensitiveEnvironments: ['PROD'] });
    fs.writeFileSync(path.join(dir, SETTINGS_FILE), content);

    expect(() => saveFlow(dir, makeFlow('f1', 'One'))).toThrow('not valid');
    expect(fs.readFileSync(path.join(dir, SETTINGS_FILE), 'utf8')).toBe(content);
  });

  it('refuses folders that are not collections', () => {
    const notCollection = fs.mkdtempSync(path.join(os.tmpdir(), 'not-a-collection-'));
    expect(listFlows(notCollection)).toEqual([]);
    expect(() => saveFlow(notCollection, makeFlow('f1', 'One'))).toThrow('Not a collection folder');
    expect(() => deleteFlow(notCollection, 'f1')).toThrow('Not a collection folder');
  });
});
