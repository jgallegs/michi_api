import { describeLocalTime, findIsoTimestamps, installLocalTimeAddon } from './index';
import { FORK_SETTINGS, resetForkSettingsCache, setForkSetting } from 'components/fork/settings/store';

const CodeMirror = require('codemirror');

describe('local time next to ISO dates', () => {
  beforeEach(() => {
    localStorage.clear();
    resetForkSettingsCache();
  });

  it('finds timestamps that carry a time zone', () => {
    const text = '{"created":"2026-11-06T09:00:00Z","due":"2026-11-07T10:30:00.123+01:00","day":"2026-11-06","local":"2026-11-06T09:00:00"}';
    expect(findIsoTimestamps(text).map((stamp) => stamp.value)).toEqual(['2026-11-06T09:00:00Z', '2026-11-07T10:30:00.123+01:00']);
  });

  it('describes the time in the given locale with a relative part', () => {
    const now = Date.parse('2026-11-06T11:00:00Z');
    const label = describeLocalTime('2026-11-06T09:00:00Z', now, 'en-GB');
    expect(label).toMatch(/06\/11\/2026/);
    expect(label).toMatch(/2 hours ago$/);
  });

  it('returns null for text that is not a date', () => {
    expect(describeLocalTime('not-a-date')).toBeNull();
  });

  describe('in a read-only editor', () => {
    beforeAll(() => {
      // jsdom has no layout: CodeMirror only needs the calls to exist.
      const rect = { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 };
      document.createRange = () => ({
        setStart: () => {},
        setEnd: () => {},
        getBoundingClientRect: () => rect,
        getClientRects: () => []
      });
      jest.useFakeTimers();
      installLocalTimeAddon();
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    const mount = (readOnly) => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const cm = CodeMirror(host, { value: '{\n  "created": "2026-11-06T09:00:00Z"\n}', readOnly });
      jest.advanceTimersByTime(200);
      return { cm, host };
    };

    it('adds the local time without changing the text', () => {
      const { cm, host } = mount(true);
      expect(cm.getAllMarks()).toHaveLength(1);
      expect(cm.getAllMarks()[0].widgetNode.textContent).toMatch(/^🕑 /);
      expect(cm.getValue()).toBe('{\n  "created": "2026-11-06T09:00:00Z"\n}');
      host.remove();
    });

    it('leaves editable editors alone', () => {
      const { cm, host } = mount(false);
      expect(cm.getAllMarks()).toHaveLength(0);
      host.remove();
    });

    it('removes the marks when the switch is turned off', () => {
      const { cm, host } = mount(true);
      expect(cm.getAllMarks()).toHaveLength(1);
      setForkSetting(FORK_SETTINGS.LOCAL_TIME, false);
      jest.advanceTimersByTime(200);
      expect(cm.getAllMarks()).toHaveLength(0);
      host.remove();
    });
  });
});
