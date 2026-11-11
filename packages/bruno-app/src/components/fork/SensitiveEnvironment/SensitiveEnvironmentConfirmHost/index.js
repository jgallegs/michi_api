import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { IconAlertTriangle } from '@tabler/icons';
import Modal from 'components/Modal';
import Button from 'ui/Button';
import Checkbox from 'ui/Checkbox';
import {
  getPendingConfirmation,
  registerConfirmationHost,
  resolvePendingConfirmation,
  subscribeToConfirmations
} from '../guard';
import { SNOOZE_MINUTES } from '../store';
import StyledWrapper from './StyledWrapper';

const INTRODUCTIONS = {
  request: 'You are about to send a request using ',
  runner: 'You are about to run the collection runner using ',
  flow: 'You are about to run a flow using '
};

const SensitiveEnvironmentConfirmHost = () => {
  const pending = useSyncExternalStore(subscribeToConfirmations, getPendingConfirmation);
  const [snooze, setSnooze] = useState(false);

  useEffect(() => registerConfirmationHost(), []);

  useEffect(() => {
    if (!pending) {
      setSnooze(false);
    }
  }, [pending]);

  if (!pending) {
    return null;
  }

  const { kind, environment, request } = pending;
  const isRun = kind !== 'request';
  const cancel = () => resolvePendingConfirmation({ confirmed: false });
  const confirm = () => resolvePendingConfirmation({ confirmed: true, snooze });

  // The footer is custom so that Enter never confirms: Cancel takes the initial focus instead.
  return (
    <StyledWrapper>
      <Modal
        size="md"
        title="Sensitive environment"
        hideFooter={true}
        handleCancel={cancel}
        closeModalFadeTimeout={0}
        disableCloseOnOutsideClick={true}
        dataTestId="sensitive-env-confirm"
      >
        <div className="warning">
          <IconAlertTriangle size={18} strokeWidth={2} className="warning-icon" />
          <div>
            {INTRODUCTIONS[kind]}
            <strong>{environment.name}</strong>
            , marked as a sensitive environment.
          </div>
        </div>

        {request?.url ? (
          <div className="request" data-testid="sensitive-env-confirm-request">
            {request.method ? <span className="method">{request.method}</span> : null}
            <span className="url">{request.url}</span>
          </div>
        ) : null}

        <Checkbox
          className="snooze"
          checked={snooze}
          onChange={(e) => setSnooze(e.target.checked)}
          label={`Don't ask again for this environment for ${SNOOZE_MINUTES} minutes`}
        />

        <div className="flex justify-end bruno-modal-footer actions">
          <Button type="button" color="secondary" variant="ghost" onClick={cancel} autoFocus data-testid="sensitive-env-cancel">
            Cancel
          </Button>
          <Button type="button" color="danger" onClick={confirm} data-testid="sensitive-env-confirm-btn">
            {isRun ? 'Run anyway' : 'Send anyway'}
          </Button>
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default SensitiveEnvironmentConfirmHost;
