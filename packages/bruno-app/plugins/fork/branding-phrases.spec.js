const fs = require('fs');
const path = require('path');
const { APP_NAME, PHRASES, applyPhrases } = require('./branding-phrases');
const { APP_NAME: RENDERER_APP_NAME } = require('../../src/components/fork/branding');

const SRC = path.join(__dirname, '../../src');

const listSourceFiles = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listSourceFiles(full);
    }
    return /\.(js|jsx)$/.test(entry.name) && !/\.(spec|test)\./.test(entry.name) ? [full] : [];
  });

const sources = listSourceFiles(SRC).map((file) => ({ file, code: fs.readFileSync(file, 'utf8') }));

describe('fork branding phrases', () => {
  it('uses the same app name as the renderer', () => {
    expect(APP_NAME).toBe(RENDERER_APP_NAME);
  });

  it.each(PHRASES.map(([from]) => [from]))('"%s" still exists in the upstream sources', (from) => {
    expect(sources.some(({ code }) => code.includes(from))).toBe(true);
  });

  it('never rewrites values written into collection files', () => {
    const exportCode = sources.find(({ file }) => file.endsWith(path.join('utils', 'collections', 'export.js'))).code;
    expect(applyPhrases(exportCode)).toContain('`Bruno/${version}`');
  });

  it('rewrites a user-facing phrase', () => {
    expect(applyPhrases('<p>Bruno saves each request as a file</p>')).toBe(`<p>${APP_NAME} saves each request as a file</p>`);
  });
});
