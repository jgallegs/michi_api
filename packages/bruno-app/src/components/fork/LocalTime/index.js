import { FORK_SETTINGS, getForkSetting, subscribeToForkSettings } from 'components/fork/settings/store';

const CodeMirror = require('codemirror');

// Only timestamps that carry a zone are converted: without one they are already local time.
const ISO_WITH_ZONE = /\b(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2}))(?![\d:])/g;
const MAX_MARKS = 500;
const MARK_CLASS = 'fork-local-time';

const RELATIVE_UNITS = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1]
];

export const describeLocalTime = (iso, now = Date.now(), locale = undefined) => {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) {
    return null;
  }
  const absolute = new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'medium' }).format(time);
  const seconds = Math.round((time - now) / 1000);
  const [unit, size] = RELATIVE_UNITS.find(([, length]) => Math.abs(seconds) >= length) || RELATIVE_UNITS[RELATIVE_UNITS.length - 1];
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(Math.round(seconds / size), unit);
  return `${absolute} · ${relative}`;
};

export const findIsoTimestamps = (text) => {
  const found = [];
  ISO_WITH_ZONE.lastIndex = 0;
  let match;
  while ((match = ISO_WITH_ZONE.exec(text)) !== null) {
    found.push({ value: match[1], end: match.index + match[1].length });
  }
  return found;
};

const buildWidget = (label) => {
  const widget = document.createElement('span');
  widget.className = MARK_CLASS;
  widget.textContent = `🕑 ${label}`;
  widget.title = 'Local time';
  widget.style.cssText = 'margin-left:6px;font-size:0.85em;opacity:0.6;font-style:italic;user-select:none;pointer-events:none;';
  return widget;
};

const decorate = (cm) => {
  (cm.state.forkLocalTimeMarks || []).forEach((mark) => mark.clear());
  cm.state.forkLocalTimeMarks = [];
  if (!cm.getOption('readOnly') || !getForkSetting(FORK_SETTINGS.LOCAL_TIME)) {
    return;
  }

  const now = Date.now();
  const marks = cm.state.forkLocalTimeMarks;
  cm.operation(() => {
    cm.eachLine((handle) => {
      if (marks.length >= MAX_MARKS) {
        return true;
      }
      const stamps = findIsoTimestamps(handle.text);
      if (!stamps.length) {
        return false;
      }
      const line = cm.getLineNumber(handle);
      for (const stamp of stamps) {
        const label = describeLocalTime(stamp.value, now);
        if (label && marks.length < MAX_MARKS) {
          marks.push(cm.setBookmark({ line, ch: stamp.end }, { widget: buildWidget(label), insertLeft: true }));
        }
      }
      return false;
    });
  });
};

let installed = false;

export const installLocalTimeAddon = () => {
  if (installed || typeof CodeMirror.defineInitHook !== 'function') {
    return;
  }
  installed = true;
  CodeMirror.defineInitHook((cm) => {
    let timer = null;
    let seen = false;
    let unsubscribe = () => {};
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        // CodeMirror has no destroy event: drop the subscription once the editor leaves the page.
        const connected = cm.getWrapperElement().isConnected;
        if (seen && !connected) {
          unsubscribe();
          return;
        }
        seen = seen || connected;
        decorate(cm);
      }, 150);
    };
    cm.on('change', schedule);
    cm.on('optionChange', (instance, option) => option === 'readOnly' && schedule());
    unsubscribe = subscribeToForkSettings(schedule);
    schedule();
  });
};
