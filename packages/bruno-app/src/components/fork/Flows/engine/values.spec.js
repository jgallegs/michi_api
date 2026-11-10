import { compareValues, getByPath, interpolate } from './values';

describe('flow values', () => {
  describe('getByPath', () => {
    const body = { shipments: [{ info: { id: 7 } }, { info: { id: 8 } }], total: 2 };

    it('reads nested fields and explicit indexes', () => {
      expect(getByPath(body, 'total')).toBe(2);
      expect(getByPath(body, 'shipments.1.info.id')).toBe(8);
    });

    it('reads the first element when a named field is inside a list', () => {
      expect(getByPath(body, 'shipments.info.id')).toBe(7);
    });

    it('returns the whole value without a path and undefined for missing fields', () => {
      expect(getByPath(body, '')).toBe(body);
      expect(getByPath(body, 'nope.deep')).toBeUndefined();
      expect(getByPath(null, 'a')).toBeUndefined();
    });

    it('does not reach inherited properties', () => {
      expect(getByPath({}, 'constructor')).toBeUndefined();
    });
  });

  describe('interpolate', () => {
    it('replaces known names and leaves unknown ones visible', () => {
      expect(interpolate('a {{x}} b {{ y }} {{z}}', { x: 1, y: 'two' })).toBe('a 1 b two {{z}}');
    });

    it('keeps the type when the text is only a placeholder', () => {
      expect(interpolate('{{list}}', { list: [1, 2] })).toEqual([1, 2]);
    });

    it('never evaluates what it receives', () => {
      expect(interpolate('{{1 + 1}}', {})).toBe('{{1 + 1}}');
    });
  });

  describe('compareValues', () => {
    it.each([
      [1, 'equals', '1', true],
      ['a', 'notEquals', 'a', false],
      ['10', 'greater', 9, true],
      [2, 'lessEqual', 2, true],
      ['hello', 'contains', 'ell', true],
      ['hello', 'startsWith', 'x', false],
      [[], 'isEmpty', undefined, true],
      ['x', 'isNotEmpty', undefined, true],
      ['true', 'isTrue', undefined, true],
      [true, 'isFalse', undefined, false]
    ])('%p %s %p is %p', (left, operator, right, expected) => {
      expect(compareValues(left, operator, right)).toBe(expected);
    });

    it('rejects an unknown comparison', () => {
      expect(() => compareValues(1, 'constructor', 1)).toThrow('Unknown comparison');
    });
  });
});
