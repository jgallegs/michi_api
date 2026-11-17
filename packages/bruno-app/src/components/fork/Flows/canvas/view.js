import { useSyncExternalStore } from 'react';

// How the canvas is looked at, which is a taste of each person and not part of a flow: it is kept on
// this computer. For now, whether the cables that carry values are always drawn or only the ones of the
// step under the pointer or selected. Each input already says where its value comes from, so the second
// way, the usual one, leaves in sight just the order of the steps.
const STORAGE_KEY = 'michi.flows.view';
export const VALUE_CABLES = { POINTED: 'pointed', ALWAYS: 'always' };

const listeners = new Set();
let view = null;

const read = () => {
  if (!view) {
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
      view = { valueCables: stored?.valueCables === VALUE_CABLES.ALWAYS ? VALUE_CABLES.ALWAYS : VALUE_CABLES.POINTED };
    } catch (err) {
      view = { valueCables: VALUE_CABLES.POINTED };
    }
  }
  return view;
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const setValueCables = (valueCables) => {
  view = { ...read(), valueCables };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(view));
  } catch (err) {
    // Without storage the choice lasts until the app closes.
  }
  listeners.forEach((listener) => listener());
};

export const useValueCables = () => useSyncExternalStore(subscribe, () => read().valueCables);

// Only for tests.
export const resetView = () => {
  view = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    // Storage is not there in every test environment.
  }
  listeners.forEach((listener) => listener());
};
