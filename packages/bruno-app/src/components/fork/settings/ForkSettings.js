import React from 'react';
import { IconCat } from '@tabler/icons';
import ToggleSwitch from 'components/ToggleSwitch';
import { APP_NAME } from 'components/fork/branding';
import { FORK_SETTING_ENTRIES } from './registry';
import { setForkSetting, useForkSetting } from './store';

export const FORK_SETTINGS_TAB = 'fork-settings';

const SettingRow = ({ entry }) => {
  const enabled = useForkSetting(entry.id);
  return (
    <div className="flex items-start justify-between gap-6 py-3" data-testid={`fork-setting-${entry.id}`}>
      <div>
        <div className="font-medium">{entry.label}</div>
        <div className="text-xs opacity-70 mt-1">{entry.description}</div>
        {entry.note ? <div className="text-xs opacity-60 mt-1 italic">{entry.note}</div> : null}
      </div>
      <ToggleSwitch isOn={enabled} handleToggle={() => setForkSetting(entry.id, !enabled)} size="2xs" />
    </div>
  );
};

export const ForkSettingsTabButton = ({ className, onClick }) => (
  <div className={className} role="tab" onClick={onClick}>
    <IconCat size={16} strokeWidth={1.5} />
    {APP_NAME}
  </div>
);

const ForkSettings = () => (
  <div className="flex flex-col w-full" data-testid="fork-settings">
    <div className="text-sm opacity-70 mb-2">
      {`Features added by ${APP_NAME}. Each one can be turned off to get the standard behaviour back. Settings are stored on this computer only.`}
    </div>
    <div className="divide-y divide-gray-500/20">
      {FORK_SETTING_ENTRIES.map((entry) => (
        <SettingRow key={entry.id} entry={entry} />
      ))}
    </div>
  </div>
);

export default ForkSettings;
