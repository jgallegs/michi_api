import { classifyString, findLabels } from './detect';

const toBase64 = (text) => btoa(text);
const pdf = toBase64('%PDF-1.4\n' + 'x'.repeat(120));
const png = toBase64('\x89PNG\r\n\x1a\n' + 'x'.repeat(120));
const jpeg = toBase64('\xFF\xD8\xFF\xE0' + 'x'.repeat(120));
const zpl = '^XA\n^FO50,50^ADN,36,20^FDSample label^FS\n^FO50,120^BCN,100,Y,N,N^FD3230007581000210350026^FS\n^XZ';

describe('label detection', () => {
  it('recognises base64 PDF, PNG and JPEG files', () => {
    expect(classifyString(pdf).kind).toBe('pdf');
    expect(classifyString(png).kind).toBe('png');
    expect(classifyString(jpeg).kind).toBe('jpeg');
  });

  it('accepts data URIs and line breaks inside the base64', () => {
    expect(classifyString(`data:application/pdf;base64,${pdf}`).base64).toBe(pdf);
    expect(classifyString(pdf.replace(/(.{40})/g, '$1\r\n')).base64).toBe(pdf);
  });

  it('recognises ZPL as plain text and as base64', () => {
    expect(classifyString(zpl)).toEqual({ kind: 'zpl', text: zpl });
    const encoded = classifyString(toBase64(zpl));
    expect(encoded.kind).toBe('zpl');
    expect(encoded.text).toBe(zpl);
  });

  it('ignores ordinary strings', () => {
    expect(classifyString('3230007581000210350026')).toBeNull();
    expect(classifyString('a'.repeat(200))).toBeNull();
    expect(classifyString(toBase64('just some text that happens to be long enough to look like base64....'))).toBeNull();
  });

  it('finds labels anywhere in a JSON response, with their path', () => {
    const response = {
      codigoRetorno: 0,
      datosResultado: '3230007581000210350026',
      labels: [{ front: pdf }, { back: zpl }],
      listaBultos: [{ codUnico: '3230007581000210350026001' }]
    };
    expect(findLabels(response).map(({ path, kind }) => ({ path, kind }))).toEqual([
      { path: 'labels[0].front', kind: 'pdf' },
      { path: 'labels[1].back', kind: 'zpl' }
    ]);
  });

  it('parses JSON sent as text and handles a raw ZPL body', () => {
    expect(findLabels(JSON.stringify({ label: png }))[0].path).toBe('label');
    expect(findLabels(zpl)).toEqual([{ path: '(body)', kind: 'zpl', text: zpl }]);
  });

  it('returns nothing for empty responses', () => {
    expect(findLabels(undefined)).toEqual([]);
    expect(findLabels({})).toEqual([]);
  });
});
