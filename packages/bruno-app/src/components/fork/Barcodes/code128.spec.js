import { MAX_BARCODE_LENGTH, barsOf, canEncodeCode128, code128Symbols, encodeCode128 } from './code128';

const START_B = '11010010000';
const START_C = '11010011100';
const STOP = '1100011101011';

describe('code 128', () => {
  it('packs digits two by two and adds the check symbol', () => {
    expect(code128Symbols('12')).toEqual([105, 12, 14]);
    expect(code128Symbols('1234')).toEqual([105, 12, 34, 82]);
    expect(code128Symbols('3230007581000210350026')).toEqual([105, 32, 30, 0, 75, 81, 0, 2, 10, 35, 0, 26, 52]);
  });

  it('writes letters one by one', () => {
    expect(code128Symbols('AB')).toEqual([104, 33, 34, 102]);
    expect(code128Symbols('AB123C')).toEqual([104, 33, 34, 17, 18, 19, 35, 15]);
  });

  it('changes set where a run of digits makes it shorter', () => {
    // Letters, then four digits up to the end.
    expect(code128Symbols('A1234')).toEqual([104, 33, 99, 12, 34, 95]);
    // An odd run at the start leaves its last digit to set B.
    expect(code128Symbols('12345')).toEqual([105, 12, 34, 100, 21, 54]);
    // An odd run after letters gives its first digit to set B.
    expect(code128Symbols('A12345').slice(0, -1)).toEqual([104, 33, 17, 99, 23, 45]);
    // Six digits in the middle are worth the change, four are not.
    expect(code128Symbols('A123456B').slice(0, -1)).toEqual([104, 33, 99, 12, 34, 56, 100, 34]);
    expect(code128Symbols('A1234B').slice(0, -1)).toEqual([104, 33, 17, 18, 19, 20, 34]);
  });

  it('draws eleven modules per symbol between the start and the stop', () => {
    const letters = encodeCode128('AB');
    expect(letters.startsWith(START_B)).toBe(true);
    expect(letters.endsWith(STOP)).toBe(true);
    expect(letters).toHaveLength(4 * 11 + 13);
    // A is 111323 and B is 131123 in the table of the standard.
    expect(letters.slice(11, 33)).toBe('10100011000' + '10001011000');

    const digits = encodeCode128('1234');
    expect(digits.startsWith(START_C)).toBe(true);
    expect(digits).toHaveLength(4 * 11 + 13);
    expect(/^[01]+$/.test(digits)).toBe(true);
  });

  it('gives the bars as runs of modules', () => {
    expect(barsOf('1101000')).toEqual([{ x: 0, width: 2 }, { x: 3, width: 1 }]);
    expect(barsOf('0011')).toEqual([{ x: 2, width: 2 }]);
    const bars = barsOf(encodeCode128('AB'));
    expect(bars).toHaveLength(4 * 3 + 4);
    expect(bars.reduce((sum, bar) => sum + bar.width, 0)).toBe([...encodeCode128('AB')].filter((module) => module === '1').length);
  });

  it('refuses what the code cannot hold', () => {
    expect(canEncodeCode128('SHIP-0001/A b')).toBe(true);
    expect(encodeCode128('')).toBeNull();
    expect(encodeCode128('envío')).toBeNull();
    expect(encodeCode128('line\nbreak')).toBeNull();
    expect(encodeCode128(12345)).toBeNull();
    expect(encodeCode128('1'.repeat(MAX_BARCODE_LENGTH + 1))).toBeNull();
    expect(encodeCode128('1'.repeat(MAX_BARCODE_LENGTH))).not.toBeNull();
  });
});
