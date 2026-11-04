import React from 'react';
import { IconAlertTriangle } from '@tabler/icons';
import { findEnvironmentInCollection } from 'utils/collections';
import { useIsSensitiveEnvironment } from '../store';
import StyledWrapper from './StyledWrapper';

const SensitiveEnvironmentBadge = ({ collection }) => {
  const environment = collection ? findEnvironmentInCollection(collection, collection.activeEnvironmentUid) : null;
  const isSensitive = useIsSensitiveEnvironment(collection, environment);

  if (!isSensitive) {
    return null;
  }

  return (
    <StyledWrapper
      role="status"
      title={`"${environment.name}" is a sensitive environment. Requests ask for confirmation before being sent.`}
      data-testid="sensitive-env-badge"
    >
      <IconAlertTriangle size={14} strokeWidth={2} />
      <span>Sensitive</span>
    </StyledWrapper>
  );
};

export default SensitiveEnvironmentBadge;
