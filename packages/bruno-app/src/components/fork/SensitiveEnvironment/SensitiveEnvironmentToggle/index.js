import React, { useState } from 'react';
import toast from 'react-hot-toast';
import ToggleSwitch from 'components/ToggleSwitch';
import { useTheme } from 'providers/Theme';
import { UNREADABLE_SETTINGS_MESSAGE, isSharedSettingsUnreadable, setSensitiveEnvironment, useIsSensitiveEnvironment } from '../store';
import StyledWrapper from './StyledWrapper';

const SensitiveEnvironmentToggle = ({ collection, environment }) => {
  const { theme } = useTheme();
  const isSensitive = useIsSensitiveEnvironment(collection, environment);
  const [saving, setSaving] = useState(false);

  const handleToggle = async () => {
    if (saving) {
      return;
    }
    setSaving(true);
    const savedInCollection = await setSensitiveEnvironment(collection, environment, !isSensitive);
    setSaving(false);
    if (isSharedSettingsUnreadable(collection)) {
      toast.error(UNREADABLE_SETTINGS_MESSAGE);
      return;
    }
    if (!savedInCollection && !isSensitive) {
      toast.error('Could not write .michi.json in the collection folder. Marked as sensitive on this computer only.');
    }
  };

  return (
    <StyledWrapper
      className={isSensitive ? 'is-sensitive' : ''}
      title="Ask for confirmation before sending requests with this environment. Saved in .michi.json in the collection folder, so it is shared through git; upstream Bruno ignores that file."
      data-testid="sensitive-env-toggle"
    >
      <ToggleSwitch
        size="2xs"
        isOn={isSensitive}
        handleToggle={handleToggle}
        activeColor={theme.status.danger.text}
        aria-label="Sensitive environment"
      />
      <span className="label">Sensitive</span>
    </StyledWrapper>
  );
};

export default SensitiveEnvironmentToggle;
