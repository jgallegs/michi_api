import { QUIET_ZONE, barsOf, encodeCode128 } from './code128';

const BAR_HEIGHT = 34;
const MODULE = 2;

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' })[char]);

// The barcode as SVG text, for a page that is kept outside the app. Empty when it cannot be drawn.
export const barcodeSvgMarkup = (value) => {
  const modules = encodeCode128(value);
  if (!modules) {
    return '';
  }
  const width = modules.length + QUIET_ZONE * 2;
  const bars = barsOf(modules)
    .map((bar) => `<rect x="${bar.x + QUIET_ZONE}" y="0" width="${bar.width}" height="${BAR_HEIGHT}"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${BAR_HEIGHT}" width="${width * MODULE}" height="${BAR_HEIGHT * MODULE}" shape-rendering="crispEdges" fill="#000">${bars}</svg>`;
};

// Every barcode on one page, to print it or send it: black on white, each with its number and where
// it comes from, and never cut in two by a page break.
export const barcodePage = ({ title, subtitle, barcodes }) => {
  const blocks = barcodes
    .map((barcode, index) => {
      const svg = barcodeSvgMarkup(barcode.value);
      const caption = barcode.caption && barcode.caption !== barcodes[index - 1]?.caption ? `<h2>${escapeHtml(barcode.caption)}</h2>` : '';
      const where = barcode.of > 1 ? `${barcode.field} ${barcode.position}/${barcode.of}` : barcode.field;
      return `${caption}<div class="code"><div class="where">${escapeHtml(where)}</div>${svg || '<div class="none">—</div>'}<div class="value">${escapeHtml(barcode.value)}</div></div>`;
    })
    .join('\n');
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  body { margin: 24px; font-family: system-ui, sans-serif; color: #000; background: #fff; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .subtitle { font-size: 13px; color: #555; margin-bottom: 24px; }
  h2 { font-size: 14px; margin: 28px 0 8px; padding-top: 12px; border-top: 1px solid #ccc; }
  .code { display: inline-block; margin: 0 28px 28px 0; padding: 12px; text-align: center; vertical-align: top; break-inside: avoid; page-break-inside: avoid; }
  .where { font-size: 12px; color: #555; margin-bottom: 6px; }
  .value { font-family: monospace; font-size: 14px; margin-top: 4px; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<div class="subtitle">${escapeHtml(subtitle)}</div>
${blocks}
</body>
</html>
`;
};
