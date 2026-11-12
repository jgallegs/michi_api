import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { IconBarcode, IconEye, IconTrash } from '@tabler/icons';
import { findCollectionByItemUid, flattenItems, getTreePathFromCollectionToItem } from 'utils/collections';
import { runtimeVariablesUpdateEvent } from 'providers/ReduxStore/slices/collections';
import { FORK_SETTINGS, useForkSetting } from 'components/fork/settings/store';
import { forgetVisualizations } from 'components/fork/Visualizations/store';
import BarcodeModal from './BarcodeModal';
import { barcodeFieldsFor, collectBarcodes, sessionVariablesFor } from './fields';
import { clearSession, useSession } from './session';
import StyledWrapper from './StyledWrapper';

// Barcodes of the values a response carries (a shipment number, the numbers of its parcels), to scan
// them straight from the screen. A folder asks for them with the variable "michi.barcodes", whose value
// lists the response fields to draw; see fields.js. Everything is drawn on this machine.
// The ones of every response received pile up in the session of the collection (session.js), to draw
// them all in one go.

const NO_FIELDS = [];
const NO_NAMES = [];

// The collection of the request on screen: its tab knows it; a request shown without a tab is looked up.
const useCollectionOf = (item) => {
  const collectionUid = useSelector((state) => (state.tabs?.tabs || []).find((tab) => tab.uid === item?.uid)?.collectionUid);
  return useSelector((state) => {
    const collections = state.collections?.collections || [];
    return collections.find((collection) => collection.uid === collectionUid) || findCollectionByItemUid(collections, item?.uid) || null;
  });
};

const BarcodeBar = ({ data, item }) => {
  const dispatch = useDispatch();
  const enabled = useForkSetting(FORK_SETTINGS.BARCODES);
  const collection = useCollectionOf(item);
  const path = useMemo(() => (enabled && collection && item ? getTreePathFromCollectionToItem(collection, item) : null), [enabled, collection, item]);
  const fields = useMemo(() => (path ? barcodeFieldsFor(collection, path) : NO_FIELDS), [collection, path]);
  // The fields as text, so a change in the collection that leaves them alone does not read the body again.
  const asked = fields.join(',');
  const barcodes = useMemo(() => (asked ? collectBarcodes(data, asked.split(',')) : []), [asked, data]);
  const session = useSession(collection?.uid);
  const [open, setOpen] = useState(null);

  if (!asked || (!barcodes.length && !session.length)) {
    return null;
  }

  const names = [...new Set(barcodes.map((barcode) => barcode.field))].join(', ');
  const count = barcodes.length === 1 ? '1 barcode' : `${barcodes.length} barcodes`;

  // Clearing also forgets the session variables the folder names in "michi.barcodes.clear", for a
  // collection whose scripts keep their own list of what was created, and the panels those scripts
  // drew from that list, which would otherwise go on showing it.
  const clear = () => {
    const forget = path ? sessionVariablesFor(collection, path) : NO_NAMES;
    const variables = collection.runtimeVariables || {};
    if (forget.some((name) => name in variables)) {
      const kept = Object.fromEntries(Object.entries(variables).filter(([name]) => !forget.includes(name)));
      dispatch(runtimeVariablesUpdateEvent({ collectionUid: collection.uid, runtimeVariables: kept }));
    }
    if (forget.length) {
      forgetVisualizations(flattenItems(collection.items || []).map((entry) => entry.uid));
    }
    clearSession(collection.uid);
    setOpen(null);
    toast.success('Session cleared');
  };

  return (
    <StyledWrapper>
      <div className="bar" data-testid="barcode-bar">
        <IconBarcode size={14} strokeWidth={1.5} />
        <span className="bar-text">{barcodes.length ? `${count} in this response (${names})` : 'No barcodes in this response'}</span>
        {barcodes.length ? (
          <button type="button" className="bar-button" onClick={() => setOpen('response')} data-testid="barcode-open">
            <IconEye size={13} strokeWidth={1.75} />
            <span>Show</span>
          </button>
        ) : null}
        {session.length ? (
          <span className="bar-session" data-testid="barcode-session">
            <span>{`In this session: ${session.length}`}</span>
            <button type="button" className="bar-button" onClick={() => setOpen('session')} data-testid="barcode-session-open">
              <IconBarcode size={13} strokeWidth={1.75} />
              <span>Show all</span>
            </button>
            <button type="button" className="bar-button" onClick={clear} data-testid="barcode-session-clear">
              <IconTrash size={13} strokeWidth={1.75} />
              <span>Clear session</span>
            </button>
          </span>
        ) : null}
      </div>
      {open === 'response' ? <BarcodeModal title="Barcodes in the response" subtitle={item?.name || ''} barcodes={barcodes} item={item} onClose={() => setOpen(null)} /> : null}
      {open === 'session' ? (
        <BarcodeModal
          title="Barcodes of the session"
          subtitle={`${collection.name || ''} · ${new Date().toLocaleString()}`}
          barcodes={session}
          item={item}
          onClose={() => setOpen(null)}
          onClear={clear}
        />
      ) : null}
    </StyledWrapper>
  );
};

export default BarcodeBar;
