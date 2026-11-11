import { flattenItems, getTreePathFromCollectionToItem } from 'utils/collections';
import { FORK_SETTINGS, getForkSetting } from 'components/fork/settings/store';
import { barcodeFieldsFor, collectBarcodes } from './fields';
import { addToSession } from './session';

const REQUEST_TYPES = ['http-request', 'graphql-request'];
const QUIET_TIME = 400;

// Every response that arrives, from the tab of a request or from a flow, leaves its barcodes in the
// session of its collection when its folder asks for them.
export const noteBarcodes = (state, seen, now = Date.now()) => {
  (state.collections?.collections || []).forEach((collection) => {
    flattenItems(collection.items || [])
      .filter((item) => REQUEST_TYPES.includes(item.type) && item.response && !seen.has(item.response))
      .forEach((item) => {
        seen.add(item.response);
        const fields = barcodeFieldsFor(collection, getTreePathFromCollectionToItem(collection, item));
        if (!fields.length) {
          return;
        }
        const barcodes = collectBarcodes(item.response.data, fields);
        if (barcodes.length) {
          addToSession(collection.uid, `${item.name} · ${new Date(now).toLocaleTimeString()}`, barcodes);
        }
      });
  });
};

// Looks at the app once it goes quiet, the same way the fields of the responses are remembered.
export const installBarcodeSession = (store) => {
  const seen = new WeakSet();
  let last = null;
  let timer = null;

  const look = () => {
    timer = null;
    if (!getForkSetting(FORK_SETTINGS.BARCODES)) {
      return;
    }
    try {
      noteBarcodes(store.getState(), seen);
    } catch (err) {
      // Keeping the session must never get in the way of the app.
    }
  };

  const onChange = () => {
    const collections = store.getState().collections?.collections;
    if (collections === last) {
      return;
    }
    last = collections;
    if (!timer) {
      timer = setTimeout(look, QUIET_TIME);
    }
  };

  const stop = store.subscribe(onChange);
  onChange();
  return () => {
    stop();
    clearTimeout(timer);
  };
};
