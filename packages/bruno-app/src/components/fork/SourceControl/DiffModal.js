import React from 'react';
import styled from 'styled-components';
import Modal from 'components/Modal';

const Pre = styled.pre`
  max-height: 60vh;
  overflow: auto;
  margin: 0;
  font-family: monospace;
  font-size: 0.75rem;
  line-height: 1.4;

  .line { display: block; padding: 0 0.5rem; white-space: pre-wrap; word-break: break-all; }
  .add { background: ${(props) => props.theme.status.success.background}; }
  .del { background: ${(props) => props.theme.status.danger.background}; }
  .hunk { color: ${(props) => props.theme.colors.text.muted}; }
`;

const lineClass = (line) => {
  if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('diff ') || line.startsWith('index ')) return 'hunk';
  if (line.startsWith('@@')) return 'hunk';
  if (line.startsWith('+')) return 'add';
  if (line.startsWith('-')) return 'del';
  return '';
};

const DiffModal = ({ file, text, onClose }) => (
  <Modal size="lg" title={file} hideFooter={true} handleCancel={onClose}>
    <Pre data-testid="git-diff">
      {(text || 'No differences').split('\n').map((line, index) => (
        <span key={index} className={`line ${lineClass(line)}`}>{line || ' '}</span>
      ))}
    </Pre>
  </Modal>
);

export default DiffModal;
