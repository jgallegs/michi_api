import { useSyncExternalStore } from 'react';

// What is on screen about running flows, kept while the app is open: the state of the last run of each
// flow, and one output log shared by every flow until it is cleared.
export const RUN_PHASE = { IDLE: 'idle', RUNNING: 'running', PAUSED: 'paused', DONE: 'done' };

const MAX_LOG_ENTRIES = 2000;

const IDLE_SESSION = { phase: RUN_PHASE.IDLE, outcome: null, steps: {}, loops: {}, lists: {}, contents: {}, tests: null, lastState: null, hop: null, resume: null, confirmedEnvironment: undefined, runHeaderId: null };

const sessions = new Map();
const listeners = new Set();
let log = [];
let records = {};
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
// are translated, values are not) and, optionally, a longer text to unfold. Returns the id of the line.
export const appendRunLog = (entry) => {
  const id = nextId;
  log = [...log, { id, time: Date.now(), ...entry }].slice(-MAX_LOG_ENTRIES);
  nextId += 1;
  // A run whose first line has left the output leaves with it.
  if (log[0].id > 1 && Object.keys(records).some((headerId) => Number(headerId) < log[0].id)) {
    records = Object.fromEntries(Object.entries(records).filter(([headerId]) => Number(headerId) >= log[0].id));
  }
  emit();
  return id;
};

// What the report of a whole run needs and the output does not keep: the collection, when it ended,
// how and what its lists held. Kept per run, under the id of the line that opens it, while that line
// is in the output.
export const getRunRecords = () => records;

export const getRunRecord = (headerId) => records[headerId] || null;

export const patchRunRecord = (headerId, patch) => {
  records = { ...records, [headerId]: { ...records[headerId], ...patch } };
  emit();
};

export const clearRunLog = () => {
  log = [];
  records = {};
  emit();
};

export const useRunSession = (flowId) => useSyncExternalStore(subscribe, () => getRunSession(flowId));

export const useRunLog = () => useSyncExternalStore(subscribe, getRunLog);

export const useRunRecords = () => useSyncExternalStore(subscribe, getRunRecords);

// Only for tests.
export const resetRunSessions = () => {
  sessions.clear();
  log = [];
  records = {};
  nextId = 1;
  emit();
};
