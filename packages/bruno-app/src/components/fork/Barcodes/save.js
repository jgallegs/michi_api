import toast from 'react-hot-toast';
import get from 'lodash/get';
import { barcodePage } from './page';
import { barcodePng } from './png';

const textToBase64 = (text) => {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const safeName = (text) => String(text).replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'barcodes';

// Saves through the same dialog as "Download response", so the file goes where the user picks.
// "item" only tells the dialog where to start: the request the barcodes come from, or any path.
const saveThroughApp = (item, { name, type, base64, done, failed }) => {
  const response = { headers: { 'content-type': type, 'content-disposition': `attachment; filename="${name}"` }, dataBuffer: base64 };
  return window.ipcRenderer
    .invoke('renderer:save-response-to-file', response, get(item, 'requestSent.url', ''), get(item, 'pathname', ''))
    .then((result) => {
      if (result && result.success) {
        toast.success(done);
      }
    })
    .catch((err) => toast.error(get(err, 'error.message') || failed));
};

export const saveBarcode = (item, barcode) => {
  const png = barcodePng(barcode.value);
  if (!png) {
    toast.error('The barcode could not be drawn');
    return Promise.resolve();
  }
  return saveThroughApp(item, { name: `barcode-${safeName(barcode.value)}.png`, type: 'image/png', base64: png, done: 'Barcode saved', failed: 'Could not save the barcode' });
};

export const saveBarcodePage = (item, { title, subtitle, barcodes }) =>
  saveThroughApp(item, {
    name: `${safeName(title)}.html`,
    type: 'text/html',
    base64: textToBase64(barcodePage({ title, subtitle, barcodes })),
    done: 'Page saved',
    failed: 'Could not save the page'
  });
