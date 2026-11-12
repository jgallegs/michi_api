// HTML panels drawn by bru.visualize, per request (itemUid), as sent by Electron after the
// post-response script. Also remembers which panel is open; null means the normal response.

export const CHANNEL = 'main:fork-visualizations';

const listeners = new Set();
let state = {};

const emit = () => listeners.forEach((listener) => listener());

export const getVisualizations = (itemUid) => state[itemUid] || null;

export const setVisualizations = ({ itemUid, requestUid, visualizations }) => {
  if (!itemUid) {
    return;
  }
  const panels = Array.isArray(visualizations) ? visualizations : [];
  // A new response opens its first panel, so the result is visible straight away.
  state = { ...state, [itemUid]: { requestUid, panels, active: panels.length ? panels[0].name : null } };
  emit();
};

export const showPanel = (itemUid, name) => {
  const current = state[itemUid];
  if (!current) {
    return;
  }
  const active = name && current.panels.some((panel) => panel.name === name) ? name : null;
  state = { ...state, [itemUid]: { ...current, active } };
  emit();
};

// Drops the panels of these requests: what a script drew from a list that has just been cleared.
export const forgetVisualizations = (itemUids) => {
  const gone = (itemUids || []).filter((itemUid) => state[itemUid]);
  if (!gone.length) {
    return;
  }
  state = Object.fromEntries(Object.entries(state).filter(([itemUid]) => !gone.includes(itemUid)));
  emit();
};

export const subscribeToVisualizations = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// Listens to Electron. Returns the cleanup.
export const installVisualizationsListener = () => {
  const ipc = typeof window !== 'undefined' ? window.ipcRenderer : null;
  if (!ipc || typeof ipc.on !== 'function') {
    return () => {};
  }
  const remove = ipc.on(CHANNEL, (payload) => setVisualizations(payload || {}));
  return typeof remove === 'function' ? remove : () => {};
};

// Only for tests.
export const resetVisualizations = () => {
  state = {};
};
