import { describe, it, expect } from 'vitest';
import { chapterSequence, adjacentChapters, canAutoAdvance, positionInPage } from '@/lib/reader';
import type { Chapter } from '@/lib/providers/mangadex';
const make = (
  id: string,
  number: string | null,
  group = 'a',
  language = 'en',
  volume: string | null = '1',
): Chapter => ({
  id,
  number,
  volume,
  language,
  title: null,
  pages: 2,
  publishedAt: '2024-01-01',
  mangaId: 'm',
  groups: [{ id: group, name: group }],
});
describe('chapter navigation', () => {
  it('sorts numerically and prefers the current translation group without repeating duplicate numbers', () => {
    const current = make('2a', '2');
    const sequence = chapterSequence(
      [
        make('10', '10'),
        make('3b', '3', 'b'),
        make('1', '1'),
        current,
        make('2b', '2', 'b'),
        make('3a', '3'),
      ],
      current,
      false,
    );
    expect(sequence.map((c) => c.id)).toEqual(['1', '2a', '3a', '10']);
    expect(adjacentChapters(sequence, current.id).next?.id).toBe('3a');
  });
  it('keeps volumes distinct when chapter numbering resets, and excludes other languages/manga', () => {
    const current = make('1v1', '1');
    const other = { ...make('other', '2'), mangaId: 'other' };
    expect(
      chapterSequence(
        [make('1v2', '1', 'a', 'en', '2'), other, make('fr', '2', 'a', 'fr'), current],
        current,
        true,
      ).map((c) => c.id),
    ).toEqual(['1v1', '1v2']);
  });
  it('retains unnumbered specials deterministically and never loops from the end', () => {
    const last = make('special', null);
    const sequence = chapterSequence([last, make('1', '1')], last, false);
    expect(adjacentChapters(sequence, 'special').next).toBeNull();
    expect(adjacentChapters(sequence, 'absent').next).toBeNull();
  });
});
describe('intentional end guard', () => {
  const safe = {
    enabled: true,
    intentional: true,
    restored: true,
    allLoaded: true,
    atEnd: true,
    currentId: 'a',
    nextId: 'b',
    visited: new Set<string>(),
  };
  it('advances only when images are loaded, restoration finished and end was intentionally reached', () => {
    expect(canAutoAdvance(safe)).toBe(true);
    for (const field of ['enabled', 'intentional', 'restored', 'allLoaded', 'atEnd'])
      expect(canAutoAdvance({ ...safe, [field]: false })).toBe(false);
    expect(canAutoAdvance({ ...safe, nextId: 'a' })).toBe(false);
    expect(canAutoAdvance({ ...safe, nextId: null })).toBe(false);
    expect(canAutoAdvance({ ...safe, visited: new Set(['b']) })).toBe(false);
  });
  it('clamps exact per-page resume fractions', () => {
    expect(positionInPage(-10, 100)).toBe(0);
    expect(positionInPage(70, 100)).toBe(0.7);
    expect(positionInPage(500, 100)).toBe(1);
    expect(positionInPage(10, 0)).toBe(0);
  });
});
