import React from 'react';
import ToggleSwitch from 'components/ToggleSwitch';
import { useTheme } from 'providers/Theme';
import { setSensitiveEnvironment, useIsSensitiveEnvironment } from '../store';
import StyledWrapper from './StyledWrapper';

const SensitiveEnvironmentToggle = ({ collection, environment }) => {
  const { theme } = useTheme();
  const isSensitive = useIsSensitiveEnvironment(collection, environment);

  const handleToggle = () => setSensitiveEnvironment(collection, environment, !isSensitive);

  return (
    <StyledWrapper
      className={isSensitive ? 'is-sensitive' : ''}
      title="Ask for confirmation before sending requests with this environment. Saved only on this computer."
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
