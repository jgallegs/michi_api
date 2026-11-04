import {
  confirmRunInSensitiveEnvironment,
  confirmSendInSensitiveEnvironment,
  getPendingConfirmation,
  registerConfirmationHost,
  resolvePendingConfirmation
} from './guard';
import { clearSnoozes, resetSharedCache } from './store';

const prod = { uid: 'e1', name: 'PROD' };
const dev = { uid: 'e2', name: 'DEV' };
const buildCollection = (activeEnvironmentUid) => ({
  uid: 'c1',
  pathname: '/collections/orders',
  environments: [prod, dev],
  activeEnvironmentUid
});
const item = { name: 'Create order', request: { method: 'POST', url: '{{host}}/orders' } };

// The guard re-reads .michi.json asynchronously before deciding; let that settle.
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('sensitive environment guard', () => {
  let unregisterHost;
  let sharedNames;

  beforeEach(() => {
    window.localStorage.clear();
    clearSnoozes();
    resetSharedCache();
    sharedNames = ['PROD'];
    window.ipcRenderer = { invoke: jest.fn(async () => sharedNames) };
    unregisterHost = registerConfirmationHost();
  });

  afterEach(() => {
    resolvePendingConfirmation({ confirmed: false });
    unregisterHost();
    delete window.ipcRenderer;
  });

  it('lets requests through when no environment is active', async () => {
    await expect(confirmSendInSensitiveEnvironment(buildCollection(null), item)).resolves.toBe(true);
    expect(getPendingConfirmation()).toBeNull();
  });

  it('lets requests through for environments not marked as sensitive', async () => {
    await expect(confirmSendInSensitiveEnvironment(buildCollection('e2'), item)).resolves.toBe(true);
  });

  it('reads the shared file before deciding, so a freshly pulled mark applies', async () => {
    sharedNames = [];
    await expect(confirmSendInSensitiveEnvironment(buildCollection('e1'), item)).resolves.toBe(true);

    sharedNames = ['PROD'];
    confirmSendInSensitiveEnvironment(buildCollection('e1'), item);
    await settle();
    expect(getPendingConfirmation()).not.toBeNull();
  });

  it('waits for confirmation in a sensitive environment and blocks on cancel', async () => {
    const result = confirmSendInSensitiveEnvironment(buildCollection('e1'), item);
    await settle();
    expect(getPendingConfirmation()).toMatchObject({
      kind: 'request',
      environment: prod,
      request: { method: 'POST', url: '{{host}}/orders' }
    });

    resolvePendingConfirmation({ confirmed: false });
    await expect(result).resolves.toBe(false);
    expect(getPendingConfirmation()).toBeNull();
  });

  it('shows the draft request when there are unsaved changes', async () => {
    const draftItem = { ...item, draft: { request: { method: 'DELETE', url: '{{host}}/orders/1' } } };
    confirmSendInSensitiveEnvironment(buildCollection('e1'), draftItem);
    await settle();
    expect(getPendingConfirmation().request).toMatchObject({ method: 'DELETE', url: '{{host}}/orders/1' });
  });

  it('sends after confirmation', async () => {
    const result = confirmSendInSensitiveEnvironment(buildCollection('e1'), item);
    await settle();
    resolvePendingConfirmation({ confirmed: true });
    await expect(result).resolves.toBe(true);
  });

  it('drops a second trigger while the dialog is open', async () => {
    const first = confirmSendInSensitiveEnvironment(buildCollection('e1'), item);
    await settle();
    await expect(confirmSendInSensitiveEnvironment(buildCollection('e1'), item)).resolves.toBe(false);
    resolvePendingConfirmation({ confirmed: true });
    await expect(first).resolves.toBe(true);
  });

  it('stops asking after a confirmed snooze', async () => {
    const first = confirmSendInSensitiveEnvironment(buildCollection('e1'), item);
    await settle();
    resolvePendingConfirmation({ confirmed: true, snooze: true });
    await first;

    await expect(confirmSendInSensitiveEnvironment(buildCollection('e1'), item)).resolves.toBe(true);
    expect(getPendingConfirmation()).toBeNull();
  });

  it('does not snooze when the dialog is cancelled', async () => {
    const first = confirmSendInSensitiveEnvironment(buildCollection('e1'), item);
    await settle();
    resolvePendingConfirmation({ confirmed: false, snooze: true });
    await first;

    confirmSendInSensitiveEnvironment(buildCollection('e1'), item);
    await settle();
    expect(getPendingConfirmation()).not.toBeNull();
  });

  it('asks before a collection run', async () => {
    confirmRunInSensitiveEnvironment(buildCollection('e1'));
    await settle();
    expect(getPendingConfirmation()).toMatchObject({ kind: 'runner', request: null });
  });

  it('falls back to a native confirm when no host is mounted', async () => {
    unregisterHost();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

    await expect(confirmSendInSensitiveEnvironment(buildCollection('e1'), item)).resolves.toBe(false);
    expect(confirmSpy).toHaveBeenCalledTimes(1);

    confirmSpy.mockRestore();
    unregisterHost = registerConfirmationHost();
  });
});
