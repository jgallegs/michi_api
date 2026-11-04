const fs = require('fs');
const os = require('os');
const path = require('path');

jest.mock('electron', () => ({ ipcMain: { handle: jest.fn() } }));

const { SETTINGS_FILE, readSensitiveEnvironments, writeSensitiveEnvironment } = require('./sensitive-environments-file');

const makeCollection = (marker = 'bruno.json') => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sensitive-envs-'));
  fs.writeFileSync(path.join(dir, marker), '{}');
  return dir;
};

describe('sensitive environments file', () => {
  it('returns an empty list when the file does not exist', () => {
    expect(readSensitiveEnvironments(makeCollection())).toEqual([]);
  });

  it('adds and removes environments, deleting the file when nothing is left', () => {
    const dir = makeCollection();
    expect(writeSensitiveEnvironment(dir, 'PROD', true)).toEqual(['PROD']);
    expect(writeSensitiveEnvironment(dir, 'PRE', true)).toEqual(['PRE', 'PROD']);
    expect(JSON.parse(fs.readFileSync(path.join(dir, SETTINGS_FILE), 'utf8'))).toEqual({ sensitiveEnvironments: ['PRE', 'PROD'] });

    writeSensitiveEnvironment(dir, 'PRE', false);
    expect(readSensitiveEnvironments(dir)).toEqual(['PROD']);
    writeSensitiveEnvironment(dir, 'PROD', false);
    expect(fs.existsSync(path.join(dir, SETTINGS_FILE))).toBe(false);
  });

  it('keeps unrelated keys of the settings file', () => {
    const dir = makeCollection();
    fs.writeFileSync(path.join(dir, SETTINGS_FILE), JSON.stringify({ other: true }));
    writeSensitiveEnvironment(dir, 'PROD', true);
    writeSensitiveEnvironment(dir, 'PROD', false);
    expect(JSON.parse(fs.readFileSync(path.join(dir, SETTINGS_FILE), 'utf8'))).toEqual({ other: true });
  });

  it('works for yml collections', () => {
    const dir = makeCollection('opencollection.yml');
    writeSensitiveEnvironment(dir, 'PROD', true);
    expect(readSensitiveEnvironments(dir)).toEqual(['PROD']);
  });

  it('ignores malformed files and refuses folders that are not collections', () => {
    const dir = makeCollection();
    fs.writeFileSync(path.join(dir, SETTINGS_FILE), '{broken');
    expect(readSensitiveEnvironments(dir)).toEqual([]);

    const notCollection = fs.mkdtempSync(path.join(os.tmpdir(), 'not-a-collection-'));
    expect(readSensitiveEnvironments(notCollection)).toEqual([]);
    expect(() => writeSensitiveEnvironment(notCollection, 'PROD', true)).toThrow('Not a collection folder');
    expect(fs.existsSync(path.join(notCollection, SETTINGS_FILE))).toBe(false);
  });
});
