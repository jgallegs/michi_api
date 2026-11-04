import React, { useMemo } from 'react';
import styled from 'styled-components';
import { toSideBySideRows } from './diffRows';

const Table = styled.div`
  font-family: monospace;
  font-size: 0.75rem;
  line-height: 1.5;
  border: 1px solid ${(props) => props.theme.border.border1};
  border-radius: 0.4rem;
  overflow: hidden;

  .labels, .row {
    display: grid;
    grid-template-columns: 3rem 1fr 3rem 1fr;
  }

  .labels {
    font-family: inherit;
    font-weight: 600;
    background: ${(props) => props.theme.background.surface1 || props.theme.bg};
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
    span { padding: 0.375rem 0.5rem; }
  }

  .hunk {
    padding: 0.25rem 0.75rem;
    color: ${(props) => props.theme.colors.text.muted};
    background: ${(props) => props.theme.status.info.background};
  }

  .num {
    text-align: right;
    padding: 0 0.5rem;
    color: ${(props) => props.theme.colors.text.muted};
    user-select: none;
  }

  .code {
    padding: 0 0.5rem;
    white-space: pre-wrap;
    word-break: break-all;
    border-right: 1px solid ${(props) => props.theme.border.border1};
  }

  .delete { background: ${(props) => props.theme.status.danger.background}; }
  .insert { background: ${(props) => props.theme.status.success.background}; }
  .empty { background: ${(props) => props.theme.background?.surface0 || 'transparent'}; opacity: 0.6; }
  .marker { display: inline-block; width: 1rem; user-select: none; }
`;

const MARK = { delete: '-', insert: '+', context: ' ', empty: ' ' };

const Cell = ({ side }) => (
  <>
    <span className={`num ${side.type}`}>{side.number ?? ''}</span>
    <span className={`code ${side.type}`}>
      <span className="marker">{MARK[side.type]}</span>
      {side.text}
    </span>
  </>
);

const SideBySideDiff = ({ diff, leftLabel, rightLabel }) => {
  const rows = useMemo(() => toSideBySideRows(diff), [diff]);

  if (!rows.length) {
    return <p>No differences.</p>;
  }

  return (
    <Table data-testid="git-side-by-side">
      <div className="labels">
        <span />
        <span>{leftLabel}</span>
        <span />
        <span>{rightLabel}</span>
      </div>
      {rows.map((row, index) =>
        row.hunk ? (
          <div key={index} className="hunk">{row.hunk}</div>
        ) : (
          <div key={index} className="row">
            <Cell side={row.left} />
            <Cell side={row.right} />
          </div>
        )
      )}
    </Table>
  );
};

export default SideBySideDiff;
