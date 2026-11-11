import { useSyncExternalStore } from 'react';
import { LESSONS } from './lessons';

// How far each person has got in the guided course: the lessons done and the one they were on. It is
// theirs, not the team's, so it is kept on this computer.
const STORAGE_KEY = 'michi.flows.course';

const listeners = new Set();
let progress = null;

const read = () => {
  if (!progress) {
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
      const known = (id) => LESSONS.some((lesson) => lesson.id === id);
      progress = { done: (Array.isArray(stored?.done) ? stored.done : []).filter(known), current: known(stored?.current) ? stored.current : LESSONS[0].id };
    } catch (err) {
      progress = { done: [], current: LESSONS[0].id };
    }
  }
  return progress;
};

const change = (next) => {
  progress = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (err) {
    // Without storage the progress lasts until the app closes.
  }
  listeners.forEach((listener) => listener());
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useCourse = () => useSyncExternalStore(subscribe, read);

export const openLesson = (id) => change({ ...read(), current: id });

// Going on from a lesson marks it as done.
export const finishLesson = (id) => {
  const { done } = read();
  const at = LESSONS.findIndex((lesson) => lesson.id === id);
  const next = LESSONS[Math.min(at + 1, LESSONS.length - 1)].id;
  change({ done: done.includes(id) ? done : [...done, id], current: next });
};

// Only for tests.
export const resetCourse = () => {
  progress = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    // Storage is not there in every test environment.
  }
  listeners.forEach((listener) => listener());
};
