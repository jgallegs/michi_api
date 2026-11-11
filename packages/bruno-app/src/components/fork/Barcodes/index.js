import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import get from 'lodash/get';
import { IconBarcode, IconChevronLeft, IconChevronRight, IconCopy, IconDownload } from '@tabler/icons';
import Modal from 'components/Modal';
import Button from 'ui/Button';
import { findCollectionByItemUid, getTreePathFromCollectionToItem } from 'utils/collections';
import { FORK_SETTINGS, useForkSetting } from 'components/fork/settings/store';
import BarcodeImage from './BarcodeImage';
import { barcodeFieldsFor, collectBarcodes } from './fields';
import { barcodePng } from './png';
import StyledWrapper from './StyledWrapper';

// Barcodes of the values a response carries (a shipment number, the numbers of its parcels), to scan
// them straight from the screen. A folder asks for them with the variable "michi.barcodes", whose value
// lists the response fields to draw; see fields.js. Everything is drawn on this machine.

const NO_FIELDS = [];

const copyText = (text, done) =>
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success(done))
    .catch(() => toast.error('Could not copy'));

// Saves through the same dialog as "Download response", so the file goes where the user picks.
const saveBarcode = (item, barcode) => {
  const png = barcodePng(barcode.value);
  if (!png) {
    toast.error('The barcode could not be drawn');
    return Promise.resolve();
  }
  const name = barcode.value.replace(/[^A-Za-z0-9_-]/g, '_');
  const response = {
    headers: { 'content-type': 'image/png', 'content-disposition': `attachment; filename="barcode-${name}.png"` },
    dataBuffer: png
  };
  return window.ipcRenderer
    .invoke('renderer:save-response-to-file', response, get(item, 'requestSent.url', ''), item.pathname)
    .then((result) => {
      if (result && result.success) {
        toast.success('Barcode saved');
      }
    })
    .catch((err) => toast.error(get(err, 'error.message') || 'Could not save the barcode'));
};

// The collection of the request on screen: its tab knows it; a request shown without a tab is looked up.
const useCollectionOf = (item) => {
  const collectionUid = useSelector((state) => (state.tabs?.tabs || []).find((tab) => tab.uid === item?.uid)?.collectionUid);
  return useSelector((state) => {
    const collections = state.collections?.collections || [];
    return collections.find((collection) => collection.uid === collectionUid) || findCollectionByItemUid(collections, item?.uid) || null;
  });
};

const BarcodeCard = ({ barcode, item, large }) => (
  <section className="barcode" data-testid="barcode-card">
    <div className="barcode-header">
      <span className="field">{barcode.field}</span>
      {barcode.of > 1 ? <span className="position">{`${barcode.position} of ${barcode.of}`}</span> : null}
      <span className="path">{barcode.path === barcode.field ? '' : barcode.path}</span>
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

const BarcodeModal = ({ barcodes, item, onClose }) => {
  const [oneAtATime, setOneAtATime] = useState(false);
  const [index, setIndex] = useState(0);
  const current = Math.min(index, barcodes.length - 1);

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
    <Modal size="lg" title="Barcodes in the response" hideFooter={true} handleCancel={onClose} closeModalFadeTimeout={0}>
      <StyledWrapper>
        <div className="barcode-tools">
          {barcodes.length > 1 ? (
            <div className="barcode-views">
              <button type="button" aria-pressed={!oneAtATime} onClick={() => setOneAtATime(false)} data-testid="barcode-view-all">
                All
              </button>
              <button type="button" aria-pressed={oneAtATime} onClick={() => setOneAtATime(true)} data-testid="barcode-view-one">
                One at a time
              </button>
            </div>
          ) : null}
          {oneAtATime ? (
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
          {barcodes.length > 1 ? (
            <Button
              size="sm"
              variant="ghost"
              className="barcode-all"
              onClick={() => copyText(barcodes.map((barcode) => barcode.value).join('\n'), 'Numbers copied')}
              data-testid="barcode-copy-all"
            >
              <IconCopy size={14} strokeWidth={1.5} className="mr-1" />
              Copy all the numbers
            </Button>
          ) : null}
        </div>
        <div className="barcode-list">
          {oneAtATime ? (
            <BarcodeCard barcode={barcodes[current]} item={item} large={true} />
          ) : (
            barcodes.map((barcode) => <BarcodeCard key={barcode.id} barcode={barcode} item={item} />)
          )}
        </div>
      </StyledWrapper>
    </Modal>
  );
};

const BarcodeBar = ({ data, item }) => {
  const enabled = useForkSetting(FORK_SETTINGS.BARCODES);
  const collection = useCollectionOf(item);
  const fields = useMemo(
    () => (enabled && collection && item ? barcodeFieldsFor(collection, getTreePathFromCollectionToItem(collection, item)) : NO_FIELDS),
    [enabled, collection, item]
  );
  // The fields as text, so a change in the collection that leaves them alone does not read the body again.
  const asked = fields.join(',');
  const barcodes = useMemo(() => (asked ? collectBarcodes(data, asked.split(',')) : []), [asked, data]);
  const [open, setOpen] = useState(false);

  if (!barcodes.length) {
    return null;
  }

  const names = [...new Set(barcodes.map((barcode) => barcode.field))].join(', ');

  return (
    <StyledWrapper>
      <div className="bar" data-testid="barcode-bar">
        <IconBarcode size={14} strokeWidth={1.5} />
        <span>{`${barcodes.length === 1 ? '1 barcode' : `${barcodes.length} barcodes`} in this response (${names})`}</span>
        <button type="button" className="link" onClick={() => setOpen(true)} data-testid="barcode-open">
          Show
        </button>
      </div>
      {open ? <BarcodeModal barcodes={barcodes} item={item} onClose={() => setOpen(false)} /> : null}
    </StyledWrapper>
  );
};

export default BarcodeBar;
