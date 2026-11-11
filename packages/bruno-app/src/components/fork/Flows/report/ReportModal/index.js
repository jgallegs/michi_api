import React, { useMemo } from 'react';
import toast from 'react-hot-toast';
import { IconCopy, IconDownload } from '@tabler/icons';
import Modal from 'components/Modal';
import { say } from '../../language';
import { copyReport, saveAsFile, toHtmlPage } from '../export';
import { buildReport } from '../table';
import StyledWrapper from './StyledWrapper';

const fileNameOf = (title) => `${title.replace(/[^\p{L}\p{N} _-]+/gu, ' ').trim().replace(/\s+/g, '-') || 'report'}.html`;

// What a list holds after a run, laid out to be read, copied into a spreadsheet or a mail, or kept as
// a page of its own.
const ReportModal = ({ title, flowName, items, onClose }) => {
  const report = useMemo(() => buildReport(items), [items]);
  const numberTitle = '#';
  const subtitle = `${flowName} · ${report.count} ${say(report.count === 1 ? 'item' : 'items')} · ${new Date().toLocaleString()}`;
  const reach = {};

  const copy = () =>
    copyReport(report, numberTitle)
      .then(() => toast.success('Report copied'))
      .catch(() => toast.error('The report could not be copied'));

  const copyJson = () =>
    navigator.clipboard
      .writeText(JSON.stringify(items, null, 2))
      .then(() => toast.success('Copied'))
      .catch(() => toast.error('The report could not be copied'));

  return (
    <Modal size="xl" title="Report" hideFooter handleCancel={onClose} dataTestId="flow-report">
      <StyledWrapper>
        <div className="flow-report-header">
          <div className="flow-report-titles">
            <div className="flow-report-title fork-no-translate">{title}</div>
            <div className="flow-report-subtitle fork-no-translate">{subtitle}</div>
          </div>
          <button type="button" className="flow-report-action" onClick={copy} data-testid="flow-report-copy">
            <IconCopy size={15} strokeWidth={1.75} />
            <span>Copy table</span>
          </button>
          <button type="button" className="flow-report-action" onClick={copyJson} data-testid="flow-report-copy-json">
            <IconCopy size={15} strokeWidth={1.75} />
            <span>Copy as JSON</span>
          </button>
          <button
            type="button"
            className="flow-report-action"
            onClick={() => saveAsFile(fileNameOf(title), toHtmlPage(report, { title, subtitle, numberTitle }), 'text/html')}
            data-testid="flow-report-save"
          >
            <IconDownload size={15} strokeWidth={1.75} />
            <span>Save as HTML</span>
          </button>
        </div>
        {report.rows.length ? (
          <div className="flow-report-scroll">
            <table className="flow-report-table fork-no-translate" data-testid="flow-report-table">
              <thead>
                <tr>
                  <th>{numberTitle}</th>
                  {report.columns.map((column) => <th key={column}>{column}</th>)}
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row, index) => (
                  <tr key={index} className={row.item ? 'first' : ''}>
                    {row.item ? <td rowSpan={row.span} className="number">{row.item}</td> : null}
                    {report.columns.map((column) => {
                      const cell = row.cells[column];
                      if (cell) {
                        reach[column] = cell.span - 1;
                        return <td key={column} rowSpan={cell.span}>{cell.text}</td>;
                      }
                      if (reach[column] > 0) {
                        reach[column] -= 1;
                        return null;
                      }
                      return <td key={column} />;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flow-report-empty">The list is empty. Run the flow to fill it.</div>
        )}
      </StyledWrapper>
    </Modal>
  );
};

export default ReportModal;
