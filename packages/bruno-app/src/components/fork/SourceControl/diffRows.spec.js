import { toSideBySideRows } from './diffRows';

describe('toSideBySideRows', () => {
  it('pairs a changed line on the same row and keeps context on both sides', () => {
    const diff = [
      'diff --git a/orders.bru b/orders.bru',
      '--- a/orders.bru',
      '+++ b/orders.bru',
      '@@ -5,3 +5,3 @@ info:',
      ' http:',
      '-  url: "{{url}}/:type/random"',
      '+  url: "{{url}}/jokes/:type/random"',
      '   params:'
    ].join('\n');

    const rows = toSideBySideRows(diff);

    expect(rows[0]).toEqual({ hunk: '@@ -5,3 +5,3 @@ info:' });
    expect(rows[1].left).toEqual({ number: 5, text: 'http:', type: 'context' });
    expect(rows[1].right).toEqual({ number: 5, text: 'http:', type: 'context' });
    expect(rows[2].left).toEqual({ number: 6, text: '  url: "{{url}}/:type/random"', type: 'delete' });
    expect(rows[2].right).toEqual({ number: 6, text: '  url: "{{url}}/jokes/:type/random"', type: 'insert' });
    expect(rows[3].left.number).toBe(7);
    expect(rows[3].right.number).toBe(7);
  });

  it('fills the other side with empty cells when only one side changes', () => {
    const rows = toSideBySideRows('@@ -1,1 +1,3 @@\n a\n+b\n+c\n');
    expect(rows.slice(2).map((row) => [row.left.type, row.right.type])).toEqual([
      ['empty', 'insert'],
      ['empty', 'insert']
    ]);
  });

  it('handles new files and ignores the no-newline marker', () => {
    const rows = toSideBySideRows('@@ -0,0 +1,2 @@\n+one\n+two\n\\ No newline at end of file\n');
    expect(rows).toHaveLength(3);
    expect(rows[2].right).toEqual({ number: 2, text: 'two', type: 'insert' });
  });

  it('returns no rows for an empty diff', () => {
    expect(toSideBySideRows('')).toEqual([]);
  });
});
