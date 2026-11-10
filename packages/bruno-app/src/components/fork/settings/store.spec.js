import { FORK_SETTINGS, getForkSetting, resetForkSettingsCache, setForkSetting } from './store';

describe('fork settings store', () => {
  beforeEach(() => {
    localStorage.clear();
    resetForkSettingsCache();
  });

  it('uses the defaults when nothing was saved', () => {
    expect(getForkSetting(FORK_SETTINGS.SENSITIVE_WRITES_ONLY)).toBe(true);
    expect(getForkSetting(FORK_SETTINGS.SPANISH_UI)).toBe(false);
    expect(getForkSetting(FORK_SETTINGS.FLOWS)).toBe(false);
  });

  it('saves a value and reads it back after a reload', () => {
    setForkSetting(FORK_SETTINGS.LOCAL_TIME, false);
    resetForkSettingsCache();
    expect(getForkSetting(FORK_SETTINGS.LOCAL_TIME)).toBe(false);
    expect(JSON.parse(localStorage.getItem('michi.settings'))).toEqual({ [FORK_SETTINGS.LOCAL_TIME]: false });
  });

  it('ignores a corrupt saved value', () => {
    localStorage.setItem('michi.settings', '{not json');
    resetForkSettingsCache();
    expect(getForkSetting(FORK_SETTINGS.REQUEST_HISTORY)).toBe(true);
  });

  it('notifies subscribers through the hook store', () => {
    setForkSetting(FORK_SETTINGS.SPANISH_UI, true);
    expect(getForkSetting(FORK_SETTINGS.SPANISH_UI)).toBe(true);
  });
});
