import React, { useState } from 'react';
import Modal from 'components/Modal';
import { MAX_FLOW_NAME_LENGTH, isValidFlowName } from '../model';

const FOLDERS_LIST_ID = 'fork-flow-folders';

const FlowFormModal = ({ title, confirmText, initialName = '', initialFolder = '', folders, onCancel, onSubmit }) => {
  const [name, setName] = useState(initialName);
  const [folder, setFolder] = useState(initialFolder);
  const valid = isValidFlowName(name);

  return (
    <Modal
      size="sm"
      title={title}
      confirmText={confirmText}
      confirmDisabled={!valid}
      handleConfirm={() => valid && onSubmit({ name, folder })}
      handleCancel={onCancel}
      dataTestId="flow-form"
    >
      <label className="block font-medium" htmlFor="flow-name">Name</label>
      <input
        id="flow-name"
        className="block textbox mt-2 w-full"
        autoFocus
        maxLength={MAX_FLOW_NAME_LENGTH}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <label className="block font-medium mt-3" htmlFor="flow-folder">Folder (optional)</label>
      <input
        id="flow-folder"
        className="block textbox mt-2 w-full"
        list={FOLDERS_LIST_ID}
        value={folder}
        onChange={(e) => setFolder(e.target.value)}
      />
      <datalist id={FOLDERS_LIST_ID}>
        {folders.map((item) => <option key={item} value={item} />)}
      </datalist>
    </Modal>
  );
};

export default FlowFormModal;
