import React, { useState } from 'react';
import Modal from 'components/Modal';
import { MAX_FLOW_NAME_LENGTH, isValidFlowName } from '../../model';

// Asks the name under which the selected steps are kept as a block.
const SaveBlockModal = ({ count, onCancel, onSubmit }) => {
  const [name, setName] = useState('');
  const valid = isValidFlowName(name);

  return (
    <Modal
      size="sm"
      title="Save as block"
      confirmText="Save"
      confirmDisabled={!valid}
      handleConfirm={() => valid && onSubmit(name)}
      handleCancel={onCancel}
      dataTestId="flow-block-form"
    >
      <label className="block font-medium" htmlFor="flow-block-name">Name</label>
      <input
        id="flow-block-name"
        className="block textbox mt-2 w-full"
        autoFocus
        maxLength={MAX_FLOW_NAME_LENGTH}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <p className="mt-3 text-muted">
        <span className="fork-no-translate">{count} </span>
        <span>{count === 1 ? 'step is kept as it is now, with its request and settings.' : 'steps are kept as they are now, with their requests, settings and the cables between them.'}</span>
      </p>
      <p className="mt-1 text-muted">The block is saved in the collection, so the whole team gets it.</p>
    </Modal>
  );
};

export default SaveBlockModal;
