// Turns a unified diff into side-by-side rows: { left, right } where each side is
// { number, text, type: 'context' | 'delete' | 'insert' | 'empty' }. Consecutive deletions and
// insertions are paired line by line so a changed line shows up on the same row on both sides.
const HUNK = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/;
const EMPTY = { number: null, text: '', type: 'empty' };

export const toSideBySideRows = (diffText) => {
  const rows = [];
  let oldLine = 0;
  let newLine = 0;
  let deletes = [];
  let inserts = [];
  let inHunk = false;

  const flush = () => {
    const length = Math.max(deletes.length, inserts.length);
    for (let i = 0; i < length; i += 1) {
      rows.push({ left: deletes[i] || EMPTY, right: inserts[i] || EMPTY });
    }
    deletes = [];
    inserts = [];
  };

  for (const line of (diffText || '').split('\n')) {
    const hunk = line.match(HUNK);
    if (hunk) {
      flush();
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      inHunk = true;
      rows.push({ hunk: line });
      continue;
    }
    if (!inHunk || line.startsWith('\\')) continue;

    if (line.startsWith('-')) {
      deletes.push({ number: oldLine, text: line.slice(1), type: 'delete' });
      oldLine += 1;
    } else if (line.startsWith('+')) {
      inserts.push({ number: newLine, text: line.slice(1), type: 'insert' });
      newLine += 1;
    } else if (line.startsWith(' ')) {
      // Empty context lines start with a space too; a bare empty string is only the text's final newline.
      flush();
      const text = line.slice(1);
      rows.push({ left: { number: oldLine, text, type: 'context' }, right: { number: newLine, text, type: 'context' } });
      oldLine += 1;
      newLine += 1;
    }
  }
  flush();
  return rows;
};
