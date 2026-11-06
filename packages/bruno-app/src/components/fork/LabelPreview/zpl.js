import { Drawer, Parser } from '@zebrash/browser';
import { buildQrZpl, labelSizeMm } from './zplText';

// Draws ZPL in the renderer with @zebrash, without any network access: the build swaps the
// library's font loader for zebrashFonts.js (see plugins/fork/zebrash-fonts.mjs).
// Loaded on demand (dynamic import) so the renderer and its fonts stay out of the main bundle.

const MAX_LABELS = 20;

const toBase64 = (bytes) => {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
};

// Returns one base64 PNG per label in the ZPL.
export const renderZpl = async (zpl) => {
  const { widthMm, heightMm, dpmm } = labelSizeMm(zpl);
  const labels = new Parser().parse(zpl).slice(0, MAX_LABELS);
  const drawer = new Drawer();
  const images = [];
  for (const label of labels) {
    const png = await drawer.drawLabelAsPng(label, { labelWidthMm: widthMm, labelHeightMm: heightMm, dpmm });
    images.push(toBase64(png));
  }
  return images;
};

export const renderQr = async (text) => {
  const [png] = await renderZpl(buildQrZpl(text));
  return png;
};
