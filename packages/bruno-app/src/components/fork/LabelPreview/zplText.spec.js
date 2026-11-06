import { buildQrZpl, escapeFieldData, labelSizeMm, MAX_QR_BYTES } from './zplText';

describe('ZPL text helpers', () => {
  it('takes the label size from ^PW and ^LL, or uses 4 x 6 inches', () => {
    expect(labelSizeMm('^XA^PW800^LL1200^XZ')).toEqual({ widthMm: 100, heightMm: 150, dpmm: 8 });
    expect(labelSizeMm('^XA^FO10,10^FDx^FS^XZ')).toEqual({ widthMm: 101.6, heightMm: 152.4, dpmm: 8 });
    expect(labelSizeMm('^XA^PW99999^XZ').widthMm).toBe(400);
  });

  it('escapes only the ZPL control characters', () => {
    expect(escapeFieldData('a_b^c~d ñ €')).toBe('a_5Fb_5Ec_7Ed ñ €');
  });

  it('builds a QR label that grows denser with longer texts', () => {
    expect(buildQrZpl('{"DP_ID":43}')).toBe('^XA^CI28^PW800^LL800^FO30,30^BQN,2,8^FH_^FDMA,{"DP_5FID":43}^FS^XZ');
    expect(buildQrZpl('x'.repeat(500))).toContain('^BQN,2,4^');
  });

  it('refuses empty or too long texts', () => {
    expect(() => buildQrZpl('')).toThrow('Nothing to encode');
    expect(() => buildQrZpl('x'.repeat(MAX_QR_BYTES + 1))).toThrow(/Too long for a QR code/);
  });
});
