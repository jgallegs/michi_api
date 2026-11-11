import { useSyncExternalStore } from 'react';

// What is on screen about running flows, kept while the app is open: the state of the last run of each
// flow, and one output log shared by every flow until it is cleared.
export const RUN_PHASE = { IDLE: 'idle', RUNNING: 'running', PAUSED: 'paused', DONE: 'done' };

const MAX_LOG_ENTRIES = 2000;

const IDLE_SESSION = { phase: RUN_PHASE.IDLE, outcome: null, steps: {}, loops: {}, lists: {}, contents: {}, hop: null, resume: null, confirmedEnvironment: undefined };

const sessions = new Map();
const listeners = new Set();
let log = [];
let nextId = 1;

const emit = () => listeners.forEach((listener) => listener());

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getRunSession = (flowId) => sessions.get(flowId) || IDLE_SESSION;

export const patchRunSession = (flowId, patch) => {
  const current = getRunSession(flowId);
  sessions.set(flowId, { ...current, ...(typeof patch === 'function' ? patch(current) : patch) });
  emit();
};

export const resetRunSession = (flowId) => patchRunSession(flowId, { ...IDLE_SESSION });

export const getRunLog = () => log;

// An entry is a line of the output: who it is about, what happened as a list of parts (interface words
// are translated, values are not) and, optionally, a longer text to unfold.
export const appendRunLog = (entry) => {
  log = [...log, { id: nextId, time: Date.now(), ...entry }].slice(-MAX_LOG_ENTRIES);
  nextId += 1;
  emit();
};

export const clearRunLog = () => {
  log = [];
  emit();
};

export const useRunSession = (flowId) => useSyncExternalStore(subscribe, () => getRunSession(flowId));

export const useRunLog = () => useSyncExternalStore(subscribe, getRunLog);

// Only for tests.
export const resetRunSessions = () => {
  sessions.clear();
  log = [];
  nextId = 1;
  emit();
};
