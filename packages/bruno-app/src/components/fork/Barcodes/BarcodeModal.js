import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { IconChevronLeft, IconChevronRight, IconCopy, IconDownload, IconFileText, IconTrash } from '@tabler/icons';
import Modal from 'components/Modal';
import Button from 'ui/Button';
import BarcodeImage from './BarcodeImage';
import { saveBarcode, saveBarcodePage } from './save';
import StyledWrapper from './StyledWrapper';

const copyText = (text, done) =>
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success(done))
    .catch(() => toast.error('Could not copy'));

const BarcodeCard = ({ barcode, item, large }) => (
  <section className="barcode" data-testid="barcode-card">
    <div className="barcode-header">
      <span className="field fork-no-translate">{barcode.field}</span>
      {barcode.of > 1 ? <span className="position">{`${barcode.position} of ${barcode.of}`}</span> : null}
      <span className="path fork-no-translate">{barcode.path === barcode.field ? '' : barcode.path}</span>
      <Button size="sm" variant="ghost" onClick={() => copyText(barcode.value, 'Number copied')}>
        <IconCopy size={14} strokeWidth={1.5} className="mr-1" />
        Copy number
      </Button>
      <Button size="sm" variant="ghost" onClick={() => saveBarcode(item, barcode)}>
        <IconDownload size={14} strokeWidth={1.5} className="mr-1" />
        Save
      </Button>
    </div>
    <div className="barcode-body">
      <BarcodeImage value={barcode.value} module={large ? 3 : 2} />
    </div>
  </section>
);

const Caption = ({ text }) => (
  <div className="barcode-caption fork-no-translate" data-testid="barcode-caption">
    {text}
  </div>
);

// The window with the barcodes: of one response, of the whole session or of a list of a flow.
// columns: when the barcodes come from a list, the columns that can be drawn and which are chosen.
// onClear: shown as "Clear session" when the barcodes are the ones of the session.
const BarcodeModal = ({ title, subtitle = '', barcodes, item, onClose, onClear, columns, onToggleColumn }) => {
  const [oneAtATime, setOneAtATime] = useState(false);
  const [index, setIndex] = useState(0);
  const current = Math.max(Math.min(index, barcodes.length - 1), 0);
  const several = barcodes.length > 1;

  // A reader takes whichever barcode it sees first: one at a time, the arrow keys move through them.
  useEffect(() => {
    if (!oneAtATime) {
      return undefined;
    }
    const onKey = (event) => {
      if (event.key === 'ArrowRight') {
        setIndex((value) => Math.min(value + 1, barcodes.length - 1));
      }
      if (event.key === 'ArrowLeft') {
        setIndex((value) => Math.max(value - 1, 0));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [oneAtATime, barcodes.length]);

  return (
    <Modal size="lg" title={title} hideFooter={true} handleCancel={onClose} closeModalFadeTimeout={0} dataTestId="barcode-modal">
      <StyledWrapper>
        {columns && columns.length ? (
          <div className="barcode-columns" data-testid="barcode-columns">
            <span>Columns to draw</span>
            {columns.map((column) => (
              <button
                key={column.path}
                type="button"
                className="fork-no-translate"
                aria-pressed={column.selected}
                onClick={() => onToggleColumn(column.path)}
                data-testid={`barcode-column-${column.path}`}
              >
                {`${column.path} (${column.count})`}
              </button>
            ))}
          </div>
        ) : null}
        <div className="barcode-tools">
          {several ? (
            <div className="barcode-views">
              <button type="button" aria-pressed={!oneAtATime} onClick={() => setOneAtATime(false)} data-testid="barcode-view-all">
                All
              </button>
              <button type="button" aria-pressed={oneAtATime} onClick={() => setOneAtATime(true)} data-testid="barcode-view-one">
                One at a time
              </button>
            </div>
          ) : null}
          {oneAtATime && several ? (
            <div className="barcode-step">
              <button type="button" title="Previous barcode" disabled={current === 0} onClick={() => setIndex(current - 1)} data-testid="barcode-previous">
                <IconChevronLeft size={16} strokeWidth={1.5} />
              </button>
              <span className="barcode-count" data-testid="barcode-count">{`${current + 1} of ${barcodes.length}`}</span>
              <button type="button" title="Next barcode" disabled={current === barcodes.length - 1} onClick={() => setIndex(current + 1)} data-testid="barcode-next">
                <IconChevronRight size={16} strokeWidth={1.5} />
              </button>
            </div>
          ) : null}
          <div className="barcode-actions">
            {several ? (
              <Button size="sm" variant="ghost" onClick={() => copyText(barcodes.map((barcode) => barcode.value).join('\n'), 'Numbers copied')} data-testid="barcode-copy-all">
                <IconCopy size={14} strokeWidth={1.5} className="mr-1" />
                Copy all the numbers
              </Button>
            ) : null}
            {several ? (
              <Button size="sm" variant="ghost" onClick={() => saveBarcodePage(item, { title, subtitle, barcodes })} data-testid="barcode-save-page">
                <IconFileText size={14} strokeWidth={1.5} className="mr-1" />
                Save all as a page
              </Button>
            ) : null}
            {onClear ? (
              <Button size="sm" variant="ghost" onClick={onClear} data-testid="barcode-modal-clear">
                <IconTrash size={14} strokeWidth={1.5} className="mr-1" />
                Clear session
              </Button>
            ) : null}
          </div>
        </div>
        {barcodes.length ? (
          <div className="barcode-list">
            {oneAtATime && several ? (
              <>
                {barcodes[current].caption ? <Caption text={barcodes[current].caption} /> : null}
                <BarcodeCard barcode={barcodes[current]} item={item} large={true} />
              </>
            ) : (
              barcodes.map((barcode, position) => (
                <React.Fragment key={barcode.id}>
                  {barcode.caption && barcode.caption !== barcodes[position - 1]?.caption ? <Caption text={barcode.caption} /> : null}
                  <BarcodeCard barcode={barcode} item={item} />
                </React.Fragment>
              ))
            )}
          </div>
        ) : (
          <div className="barcode-empty" data-testid="barcode-empty">
            There is nothing to draw.
          </div>
        )}
      </StyledWrapper>
    </Modal>
  );
};

export default BarcodeModal;
