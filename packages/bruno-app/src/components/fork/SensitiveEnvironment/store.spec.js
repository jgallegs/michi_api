import {
  STORAGE_KEY,
  SNOOZE_MINUTES,
  clearSnoozes,
  isSensitiveEnvironment,
  isSensitiveEnvironmentSnoozed,
  setSensitiveEnvironment,
  snoozeSensitiveEnvironment
} from './store';

const collection = { uid: 'c1', pathname: '/collections/orders' };
const prod = { uid: 'e1', name: 'PROD' };
const dev = { uid: 'e2', name: 'DEV' };

describe('sensitive environment store', () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearSnoozes();
  });

  it('is not sensitive by default', () => {
    expect(isSensitiveEnvironment(collection, prod)).toBe(false);
  });

  it('marks and unmarks an environment', () => {
    setSensitiveEnvironment(collection, prod, true);
    expect(isSensitiveEnvironment(collection, prod)).toBe(true);
    expect(isSensitiveEnvironment(collection, dev)).toBe(false);

    setSensitiveEnvironment(collection, prod, false);
    expect(isSensitiveEnvironment(collection, prod)).toBe(false);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toEqual({});
  });

  it('keys by collection path and environment name, not by uid', () => {
    setSensitiveEnvironment(collection, prod, true);
    const remounted = { uid: 'another-uid', name: 'PROD' };
    expect(isSensitiveEnvironment({ ...collection, uid: 'c2' }, remounted)).toBe(true);
    expect(isSensitiveEnvironment({ uid: 'c3', pathname: '/collections/other' }, prod)).toBe(false);
  });

  it('ignores missing collection or environment', () => {
    setSensitiveEnvironment(collection, null, true);
    expect(isSensitiveEnvironment(collection, null)).toBe(false);
    expect(isSensitiveEnvironment(null, prod)).toBe(false);
  });

  it('survives corrupted storage', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json');
    expect(isSensitiveEnvironment(collection, prod)).toBe(false);
    setSensitiveEnvironment(collection, prod, true);
    expect(isSensitiveEnvironment(collection, prod)).toBe(true);
  });

  it('snoozes only for the configured time', () => {
    const now = 1_000_000;
    snoozeSensitiveEnvironment(collection, prod, now);
    expect(isSensitiveEnvironmentSnoozed(collection, prod, now + 1000)).toBe(true);
    expect(isSensitiveEnvironmentSnoozed(collection, dev, now + 1000)).toBe(false);
    expect(isSensitiveEnvironmentSnoozed(collection, prod, now + SNOOZE_MINUTES * 60 * 1000 + 1)).toBe(false);
  });
});
