import { FORK_SIDEBAR_SECTIONS, forkSpecialTabTypes, isForkTab } from './index';

jest.mock('nanoid', () => ({ customAlphabet: () => () => 'generated-uid', nanoid: () => 'generated-uid' }));

describe('fork registry', () => {
  it('lists the sections of the fork', () => {
    expect(FORK_SIDEBAR_SECTIONS.map((section) => section.id)).toEqual(['git', 'flows']);
  });

  it('recognises the Git tab and flow tabs only', () => {
    expect(isForkTab('fork-git')).toBe(true);
    expect(isForkTab('fork-flow:abc')).toBe(true);
    expect(isForkTab('collection-settings')).toBe(false);
    expect(isForkTab(undefined)).toBe(false);
  });

  it('adds the current tab type to the special tabs only when it belongs to the fork', () => {
    expect(forkSpecialTabTypes('fork-flow:abc')).toEqual(['fork-flow:abc']);
    expect(forkSpecialTabTypes('http-request')).toEqual([]);
  });
});
