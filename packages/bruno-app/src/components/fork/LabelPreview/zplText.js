// Text helpers for ZPL that do not need the renderer, so they can be tested on their own.

const DOTS_PER_MM = 8; // 203 dpi, the usual for shipping labels.
const DEFAULT_WIDTH_MM = 101.6; // 4 x 6 inches
const DEFAULT_HEIGHT_MM = 152.4;
const MAX_SIDE_MM = 400;

// Largest QR payload (version 40, error correction M, byte mode).
export const MAX_QR_BYTES = 2331;

export const labelSizeMm = (zpl) => {
  const width = /\^PW(\d+)/.exec(zpl);
  const length = /\^LL(\d+)/.exec(zpl);
  const toMm = (match, fallback) => {
    const dots = match ? Number(match[1]) : 0;
    return dots > 0 ? Math.min(dots / DOTS_PER_MM, MAX_SIDE_MM) : fallback;
  };
  return { widthMm: toMm(width, DEFAULT_WIDTH_MM), heightMm: toMm(length, DEFAULT_HEIGHT_MM), dpmm: DOTS_PER_MM };
};

// ^FH lets a field carry _XX hex escapes: only the ZPL control characters need them.
export const escapeFieldData = (text) => text.replace(/[_^~]/g, (char) => `_${char.charCodeAt(0).toString(16).toUpperCase()}`);

const magnificationFor = (bytes) => {
  if (bytes <= 100) {
    return 8;
  }
  if (bytes <= 400) {
    return 6;
  }
  if (bytes <= 1000) {
    return 4;
  }
  return 3;
};

// A one-field label with a QR code (error correction M), sized to fit.
export const buildQrZpl = (text) => {
  const bytes = new TextEncoder().encode(text).length;
  if (!bytes) {
    throw new Error('Nothing to encode');
  }
  if (bytes > MAX_QR_BYTES) {
    throw new Error(`Too long for a QR code: ${bytes} bytes (at most ${MAX_QR_BYTES})`);
  }
  return `^XA^CI28^PW800^LL800^FO30,30^BQN,2,${magnificationFor(bytes)}^FH_^FDMA,${escapeFieldData(text)}^FS^XZ`;
};
