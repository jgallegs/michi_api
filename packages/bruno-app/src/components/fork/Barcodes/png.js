import { QUIET_ZONE, barsOf, encodeCode128 } from './code128';

const MODULE = 3;
const BAR_HEIGHT = 150;
const MARGIN = 14;
const TEXT_HEIGHT = 34;

// The barcode as a PNG (base64, without the data: prefix), with its number under the bars.
// Null when the text cannot be drawn or there is no canvas to draw on.
export const barcodePng = (value) => {
  const modules = encodeCode128(value);
  if (!modules) {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = (modules.length + QUIET_ZONE * 2) * MODULE;
  canvas.height = MARGIN + BAR_HEIGHT + TEXT_HEIGHT;
  const context = canvas.getContext && canvas.getContext('2d');
  if (!context) {
    return null;
  }
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#000000';
  barsOf(modules).forEach((bar) => context.fillRect((bar.x + QUIET_ZONE) * MODULE, MARGIN, bar.width * MODULE, BAR_HEIGHT));
  context.font = '20px monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(value, canvas.width / 2, MARGIN + BAR_HEIGHT + TEXT_HEIGHT / 2, canvas.width - MARGIN * 2);
  return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
};
