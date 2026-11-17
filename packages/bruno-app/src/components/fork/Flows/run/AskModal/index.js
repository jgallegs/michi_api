import React, { useState } from 'react';
import Modal from 'components/Modal';

// What a flow asks before it runs: one box per question of its Start step, filled in with what was
// answered last time or, the first time, with the usual answer.
const AskModal = ({ questions, answers, onCancel, onSubmit }) => {
  const [values, setValues] = useState(() => Object.fromEntries(questions.map((question) => [question.id, answers?.[question.id] ?? question.value ?? ''])));

  return (
    <Modal size="sm" title="Before running" confirmText="Run" handleConfirm={() => onSubmit(values)} handleCancel={onCancel} dataTestId="flow-ask">
      {questions.map((question, index) => (
        <div key={question.id} className={index ? 'mt-3' : ''}>
          <label className="block font-medium fork-no-translate" htmlFor={`flow-ask-${question.id}`}>{question.name || `#${index + 1}`}</label>
          <input
            id={`flow-ask-${question.id}`}
            className="block textbox mt-2 w-full"
            autoFocus={index === 0}
            value={values[question.id]}
            placeholder={question.value || 'As usual'}
            onChange={(event) => setValues({ ...values, [question.id]: event.target.value })}
            onKeyDown={(event) => event.key === 'Enter' && onSubmit(values)}
            data-testid={`flow-ask-${index + 1}`}
          />
        </div>
      ))}
    </Modal>
  );
};

export default AskModal;
