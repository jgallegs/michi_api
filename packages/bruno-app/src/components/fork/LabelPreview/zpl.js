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

// Cuts the white around the drawing, keeping a quiet zone so the code still scans.
const cropToContent = async (base64, margin = 24) => {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
  const source = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = source.getContext('2d');
  context.drawImage(bitmap, 0, 0);
  const { data, width, height } = context.getImageData(0, 0, bitmap.width, bitmap.height);
  let [minX, minY, maxX, maxY] = [width, height, -1, -1];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4] < 128) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < 0) {
    return base64;
  }
  const target = new OffscreenCanvas(maxX - minX + 1 + margin * 2, maxY - minY + 1 + margin * 2);
  const out = target.getContext('2d');
  out.fillStyle = '#fff';
  out.fillRect(0, 0, target.width, target.height);
  out.drawImage(source, minX, minY, maxX - minX + 1, maxY - minY + 1, margin, margin, maxX - minX + 1, maxY - minY + 1);
  const blob = await target.convertToBlob({ type: 'image/png' });
  return toBase64(new Uint8Array(await blob.arrayBuffer()));
};

export const renderQr = async (text) => {
  const [png] = await renderZpl(buildQrZpl(text));
  return cropToContent(png);
};
