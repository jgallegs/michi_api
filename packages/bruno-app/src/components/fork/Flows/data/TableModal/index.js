import React, { useMemo, useState } from 'react';
import Modal from 'components/Modal';
import { MAX_TABLE_ROWS, parseTable, tableToText } from '../parse';
import StyledWrapper from './StyledWrapper';

const PREVIEW_ROWS = 6;

// Where the data of a "Data table" step is written: pasted from a spreadsheet or typed, with the first
// line as the names of the columns. What will be kept is shown underneath as it is read.
const TableModal = ({ table, onCancel, onSubmit }) => {
  const [text, setText] = useState(() => tableToText(table));
  const read = useMemo(() => parseTable(text), [text]);

  return (
    <Modal size="lg" title="Data table" confirmText="Save" handleConfirm={() => onSubmit(read)} handleCancel={onCancel} dataTestId="flow-table-form">
      <StyledWrapper>
        <p className="flow-table-help">Paste a table copied from a spreadsheet, or type it. The first line holds the names of the columns.</p>
        <textarea
          className="flow-table-text fork-no-translate"
          autoFocus
          spellCheck={false}
          value={text}
          placeholder={'ref\tphone\nA-001\t600000001\nA-002\t600000002'}
          onChange={(event) => setText(event.target.value)}
          // A tab typed here is a new cell, not a jump to the next button.
          onKeyDown={(event) => {
            if (event.key === 'Tab' && !event.shiftKey) {
              event.preventDefault();
              const { selectionStart, selectionEnd } = event.target;
              setText(`${text.slice(0, selectionStart)}\t${text.slice(selectionEnd)}`);
            }
          }}
          data-testid="flow-table-text"
        />
        <p className="flow-table-count" data-testid="flow-table-count">
          <span className="fork-no-translate">{read.rows.length} </span>
          <span>{read.rows.length === 1 ? 'row' : 'rows'}</span>
          <span className="fork-no-translate"> · {read.columns.length} </span>
          <span>{read.columns.length === 1 ? 'column' : 'columns'}</span>
          {read.rows.length >= MAX_TABLE_ROWS ? <span> (the most a table can hold)</span> : null}
        </p>
        {read.columns.length ? (
          <div className="flow-table-preview">
            <table className="fork-no-translate" data-testid="flow-table-preview">
              <thead>
                <tr>{read.columns.map((column) => <th key={column}>{column}</th>)}</tr>
              </thead>
              <tbody>
                {read.rows.slice(0, PREVIEW_ROWS).map((row, index) => (
                  <tr key={index}>{row.map((cell, at) => <td key={read.columns[at]}>{cell}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <p className="flow-table-help">Join its rows to a For each item step: each round gets one row, with the columns as its fields.</p>
      </StyledWrapper>
    </Modal>
  );
};

export default TableModal;
