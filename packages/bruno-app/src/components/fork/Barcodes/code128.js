// Code 128, worked out on this machine: nothing leaves the app to draw a barcode.
// Every symbol is six widths (bar, space, bar, space, bar, space) that add up to eleven modules; the
// stop has a seventh. Index = value of the symbol.
const PATTERNS = (
  '212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 '
  + '122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 '
  + '322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 '
  + '112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 '
  + '331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 '
  + '112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 '
  + '124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 '
  + '411311 113141 114131 311141 411131 211412 211214 211232'
).split(' ');
const STOP_PATTERN = '2331112';

const CODE_C = 99;
const CODE_B = 100;
const START_B = 104;
const START_C = 105;

export const MAX_BARCODE_LENGTH = 80;
// Blank modules a reader needs on each side of the bars.
export const QUIET_ZONE = 10;

const isDigit = (char) => char >= '0' && char <= '9';

// Set B holds the printable ASCII characters, which covers shipment and parcel numbers with letters.
export const canEncodeCode128 = (text) =>
  typeof text === 'string' && text.length > 0 && text.length <= MAX_BARCODE_LENGTH && /^[\x20-\x7e]+$/.test(text);

const digitsFrom = (text, from) => {
  let count = 0;
  while (from + count < text.length && isDigit(text[from + count])) {
    count += 1;
  }
  return count;
};

// Set C packs two digits in one symbol, so it is worth entering for a run of digits: four at either
// end of the text, six in the middle, or a text that is just two digits.
const worthSetC = (set, run, index, length) => {
  if (set === 'C') {
    return run >= 2;
  }
  if (set === null) {
    return run >= 4 || (run === 2 && length === 2);
  }
  return run >= 6 || (run >= 4 && index + run === length);
};

// The values of the symbols: start, data, check. The stop is added when the modules are drawn.
export const code128Symbols = (text) => {
  if (!canEncodeCode128(text)) {
    return null;
  }
  const symbols = [];
  let set = null;
  let index = 0;

  const enter = (next) => {
    if (set !== next) {
      const start = next === 'C' ? START_C : START_B;
      const change = next === 'C' ? CODE_C : CODE_B;
      symbols.push(set === null ? start : change);
      set = next;
    }
  };

  while (index < text.length) {
    let run = digitsFrom(text, index);
    // An odd run met from set B gives its first digit to B, so the rest goes in pairs.
    if (set === 'B' && run % 2 === 1 && worthSetC(set, run, index, text.length)) {
      symbols.push(text.charCodeAt(index) - 32);
      index += 1;
      run -= 1;
    }
    if (worthSetC(set, run, index, text.length)) {
      enter('C');
      symbols.push(Number(text.slice(index, index + 2)));
      index += 2;
    } else {
      enter('B');
      symbols.push(text.charCodeAt(index) - 32);
      index += 1;
    }
  }

  const check = symbols.reduce((sum, value, position) => sum + value * Math.max(position, 1), 0) % 103;
  return [...symbols, check];
};

const toModules = (pattern) =>
  [...pattern].map((width, position) => (position % 2 === 0 ? '1' : '0').repeat(Number(width))).join('');

// One character per module: "1" is a bar and "0" a space. Null when the text cannot be drawn.
export const encodeCode128 = (text) => {
  const symbols = code128Symbols(text);
  if (!symbols) {
    return null;
  }
  return symbols.map((value) => toModules(PATTERNS[value])).join('') + toModules(STOP_PATTERN);
};

// The bars as rectangles, in modules: runs of "1" joined together.
export const barsOf = (modules) => {
  const bars = [];
  let start = -1;
  [...`${modules}0`].forEach((module, position) => {
    if (module === '1' && start < 0) {
      start = position;
    }
    if (module === '0' && start >= 0) {
      bars.push({ x: start, width: position - start });
      start = -1;
    }
  });
  return bars;
};
