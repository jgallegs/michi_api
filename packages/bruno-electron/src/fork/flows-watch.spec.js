const fs = require('fs');
const os = require('os');
const path = require('path');

const { SETTINGS_FILE } = require('./collection-settings-file');
const { watchCollection, unwatchAll, isWatched } = require('./flows-watch');

const INTERVAL = 20;

const makeCollection = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flows-watch-'));
  fs.writeFileSync(path.join(dir, 'bruno.json'), '{}');
  return dir;
};

const settingsOf = (dir) => path.join(dir, SETTINGS_FILE);

const until = async (condition, timeout = 3000) => {
  const limit = Date.now() + timeout;
  while (!condition() && Date.now() < limit) {
    await new Promise((resolve) => setTimeout(resolve, INTERVAL));
  }
  return condition();
};

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('flows watch', () => {
  afterEach(() => unwatchAll());

  it('tells when the file of the collection is written from outside', async () => {
    const dir = makeCollection();
    fs.writeFileSync(settingsOf(dir), '{"flows":{}}');
    const notify = jest.fn();

    watchCollection(dir, notify, INTERVAL);
    await pause(INTERVAL * 5);
    expect(notify).not.toHaveBeenCalled();

    fs.writeFileSync(settingsOf(dir), '{"flows":{"a":{"id":"a"}}}');

    expect(await until(() => notify.mock.calls.length > 0)).toBe(true);
    expect(notify).toHaveBeenCalledWith(dir);
  });

  it('tells when the file appears in a collection that had none', async () => {
    const dir = makeCollection();
    const notify = jest.fn();

    watchCollection(dir, notify, INTERVAL);
    await pause(INTERVAL * 5);
    expect(notify).not.toHaveBeenCalled();

    fs.writeFileSync(settingsOf(dir), '{"flows":{}}');

    expect(await until(() => notify.mock.calls.length > 0)).toBe(true);
  });

  it('tells when the file is replaced by another one, as git does', async () => {
    const dir = makeCollection();
    fs.writeFileSync(settingsOf(dir), '{"flows":{}}');
    const notify = jest.fn();

    watchCollection(dir, notify, INTERVAL);
    await pause(INTERVAL * 5);
    const incoming = path.join(dir, 'incoming.tmp');
    fs.writeFileSync(incoming, '{"flows":{"pulled":{"id":"pulled"}}}');
    fs.renameSync(incoming, settingsOf(dir));

    expect(await until(() => notify.mock.calls.length > 0)).toBe(true);
  });

  it('watches each collection once and nothing that is not a collection', () => {
    const dir = makeCollection();
    const plain = fs.mkdtempSync(path.join(os.tmpdir(), 'flows-watch-plain-'));
    const watchFile = jest.spyOn(fs, 'watchFile');

    watchCollection(dir, jest.fn(), INTERVAL);
    watchCollection(dir, jest.fn(), INTERVAL);
    watchCollection(plain, jest.fn(), INTERVAL);
    watchCollection('relative/path', jest.fn(), INTERVAL);

    expect(watchFile).toHaveBeenCalledTimes(1);
    expect(isWatched(dir)).toBe(true);
    expect(isWatched(plain)).toBe(false);
    watchFile.mockRestore();
  });

  it('stops looking at a collection that is no longer there', async () => {
    const dir = makeCollection();
    fs.writeFileSync(settingsOf(dir), '{"flows":{}}');
    const notify = jest.fn();

    watchCollection(dir, notify, INTERVAL);
    await pause(INTERVAL * 5);
    fs.rmSync(dir, { recursive: true, force: true });

    expect(await until(() => !isWatched(dir))).toBe(true);
    expect(notify).not.toHaveBeenCalled();
  });
});
