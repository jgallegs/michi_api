import {
  STORAGE_KEY,
  SNOOZE_MINUTES,
  clearSnoozes,
  isSensitiveEnvironment,
  isSensitiveEnvironmentSnoozed,
  isSharedSettingsUnreadable,
  loadSharedSensitiveEnvironments,
  resetSharedCache,
  setSensitiveEnvironment,
  snoozeSensitiveEnvironment
} from './store';

const collection = { uid: 'c1', pathname: '/collections/orders' };
const prod = { uid: 'e1', name: 'PROD' };
const dev = { uid: 'e2', name: 'DEV' };

// In-memory stand-in for the main process handlers that own .michi.json.
const installSharedFile = ({ failWrites = false, failReads = false } = {}) => {
  const files = new Map();
  window.ipcRenderer = {
    invoke: jest.fn(async (channel, collectionPath, environmentName, sensitive) => {
      const names = new Set(files.get(collectionPath) || []);
      if (channel === 'fork:sensitive-environments:read') {
        if (failReads) {
          throw new Error('damaged');
        }
        return [...names];
      }
      if (failWrites) {
        throw new Error('read-only');
      }
      if (sensitive) {
        names.add(environmentName);
      } else {
        names.delete(environmentName);
      }
      files.set(collectionPath, [...names]);
      return [...names];
    })
  };
  return files;
};

describe('sensitive environment store', () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearSnoozes();
    resetSharedCache();
    installSharedFile();
  });

  afterEach(() => {
    delete window.ipcRenderer;
  });

  it('is not sensitive by default', () => {
    expect(isSensitiveEnvironment(collection, prod)).toBe(false);
  });

  it('marks and unmarks an environment in the collection file', async () => {
    await expect(setSensitiveEnvironment(collection, prod, true)).resolves.toBe(true);
    expect(isSensitiveEnvironment(collection, prod)).toBe(true);
    expect(isSensitiveEnvironment(collection, dev)).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();

    await setSensitiveEnvironment(collection, prod, false);
    expect(isSensitiveEnvironment(collection, prod)).toBe(false);
  });

  it('picks up marks written by someone else after a reload of the file', async () => {
    const files = installSharedFile();
    files.set(collection.pathname, ['PROD']);
    expect(isSensitiveEnvironment(collection, prod)).toBe(false);
    await loadSharedSensitiveEnvironments(collection);
    expect(isSensitiveEnvironment(collection, prod)).toBe(true);
  });

  it('keeps honoring marks made on this computer before the shared file existed', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ [collection.pathname]: { PROD: true } }));
    expect(isSensitiveEnvironment(collection, prod)).toBe(true);

    await setSensitiveEnvironment(collection, prod, false);
    expect(isSensitiveEnvironment(collection, prod)).toBe(false);
  });

  it('falls back to this computer when the collection file cannot be written', async () => {
    installSharedFile({ failWrites: true });
    await expect(setSensitiveEnvironment(collection, prod, true)).resolves.toBe(false);
    expect(isSensitiveEnvironment(collection, prod)).toBe(true);
  });

  it('treats every environment of the collection as sensitive while its file cannot be read', async () => {
    installSharedFile({ failReads: true });
    await loadSharedSensitiveEnvironments(collection);

    expect(isSharedSettingsUnreadable(collection)).toBe(true);
    expect(isSensitiveEnvironment(collection, prod)).toBe(true);
    expect(isSensitiveEnvironment(collection, dev)).toBe(true);
    expect(isSensitiveEnvironment({ uid: 'c2', pathname: '/collections/other' }, dev)).toBe(false);

    installSharedFile();
    await loadSharedSensitiveEnvironments(collection);
    expect(isSharedSettingsUnreadable(collection)).toBe(false);
    expect(isSensitiveEnvironment(collection, dev)).toBe(false);
  });

  it('changes no mark while the file cannot be read', async () => {
    const local = JSON.stringify({ [collection.pathname]: { PROD: true } });
    window.localStorage.setItem(STORAGE_KEY, local);
    installSharedFile({ failReads: true });
    await loadSharedSensitiveEnvironments(collection);

    await expect(setSensitiveEnvironment(collection, prod, false)).resolves.toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(local);
  });

  it('keys by collection path and environment name, not by uid', async () => {
    await setSensitiveEnvironment(collection, prod, true);
    expect(isSensitiveEnvironment({ ...collection, uid: 'c2' }, { uid: 'other', name: 'PROD' })).toBe(true);
    expect(isSensitiveEnvironment({ uid: 'c3', pathname: '/collections/other' }, prod)).toBe(false);
  });

  it('ignores missing collection or environment and corrupted local storage', async () => {
    await expect(setSensitiveEnvironment(collection, null, true)).resolves.toBe(false);
    expect(isSensitiveEnvironment(null, prod)).toBe(false);
    window.localStorage.setItem(STORAGE_KEY, '{not json');
    expect(isSensitiveEnvironment(collection, prod)).toBe(false);
  });

  it('snoozes only for the configured time', () => {
    const now = 1_000_000;
    snoozeSensitiveEnvironment(collection, prod, now);
    expect(isSensitiveEnvironmentSnoozed(collection, prod, now + 1000)).toBe(true);
    expect(isSensitiveEnvironmentSnoozed(collection, dev, now + 1000)).toBe(false);
    expect(isSensitiveEnvironmentSnoozed(collection, prod, now + SNOOZE_MINUTES * 60 * 1000 + 1)).toBe(false);
  });
});
