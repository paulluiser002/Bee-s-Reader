import { beforeEach, describe, it, expect } from 'vitest';
import { BrowserProfile, PROFILE_PREFIX, backupSchema } from '@/lib/browser-profile';
import { defaults } from '@/lib/schemas';
const mangaId = '00000000-0000-4000-8000-000000000001',
  chapterId = '00000000-0000-4000-8000-000000000002';
const position = {
  mangaId,
  chapterId,
  pageIndex: 2,
  scrollFraction: 0.5,
  completed: false,
  recordedAt: 2000,
};
beforeEach(() => localStorage.clear());
describe('browser-owned profiles', () => {
  it('keeps defaults and data across new store instances without a server', () => {
    const profile = new BrowserProfile(localStorage);
    expect(profile.read().preferences).toEqual(defaults);
    profile.bookmark(mangaId, true);
    profile.preferences({ ...defaults, quality: 'original' });
    profile.progress(position);
    const reopened = new BrowserProfile(localStorage).read();
    expect(reopened.bookmarks[0].mangaId).toBe(mangaId);
    expect(reopened.history[0].pageIndex).toBe(2);
    expect(reopened.preferences.quality).toBe('original');
  });
  it('uses separate keys so tabs saving different chapters do not lose each other', () => {
    const a = new BrowserProfile(localStorage),
      b = new BrowserProfile(localStorage);
    a.progress(position);
    b.progress({ ...position, chapterId: mangaId });
    expect(a.read().history).toHaveLength(2);
  });
  it('ignores stale progress while retaining completion', () => {
    const store = new BrowserProfile(localStorage);
    store.progress({ ...position, completed: true });
    store.progress({ ...position, pageIndex: 0, completed: false, recordedAt: 1000 });
    expect(store.read().history[0]).toMatchObject({ pageIndex: 2, completed: true });
  });
  it('clears only reading history and preserves unrelated browser data, bookmarks and preferences', () => {
    const store = new BrowserProfile(localStorage);
    localStorage.setItem('unrelated', 'keep');
    store.bookmark(mangaId, true);
    store.progress(position);
    store.preferences({ ...defaults, theme: 'dark' });
    store.clearHistory();
    expect(store.read().history).toEqual([]);
    expect(store.read().bookmarks).toHaveLength(1);
    expect(store.read().preferences.theme).toBe('dark');
    expect(localStorage.getItem('unrelated')).toBe('keep');
  });
  it('validates before importing a backup and merges rather than deleting a library', () => {
    const store = new BrowserProfile(localStorage);
    store.bookmark(mangaId, true);
    store.progress(position);
    const backup = store.export();
    store.bookmark(chapterId, true);
    store.import(backup);
    expect(store.read().bookmarks).toHaveLength(2);
    expect(() => store.import('{"version":99}')).toThrow();
    expect(store.read().bookmarks).toHaveLength(2);
    expect(backupSchema.parse(JSON.parse(backup)).version).toBe(2);
    expect(store.read().history[0]).toMatchObject(position);
    const legacy = JSON.parse(backup);
    delete legacy.history[0].recordedAt;
    localStorage.clear();
    store.import(JSON.stringify(legacy));
    expect(store.read().history[0].recordedAt).toBe(2000);
  });
  it('never silently overwrites corrupt saved entries and reports storage failures', () => {
    localStorage.setItem(PROFILE_PREFIX + 'preferences', 'not-json');
    const store = new BrowserProfile(localStorage);
    expect(() => store.read()).toThrow(/saved|read|corrupt/i);
    expect(localStorage.getItem(PROFILE_PREFIX + 'preferences')).toBe('not-json');
    const blocked = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('Full', 'QuotaExceededError');
      },
      removeItem: () => {},
      key: () => null,
      length: 0,
    };
    expect(() => new BrowserProfile(blocked).bookmark(mangaId, true)).toThrow(
      /storage|save|space/i,
    );
  });
});
it('preserves the newest position and completion when two same-chapter writes interleave', () => {
  const first = new BrowserProfile(localStorage);
  first.progress({ ...position, recordedAt: 1000 });
  let interleave: (() => void) | undefined;
  const storage = {
    get length() {
      return localStorage.length;
    },
    key: (i: number) => localStorage.key(i),
    getItem: (key: string) => {
      const value = localStorage.getItem(key);
      if (key.includes('progress:') && interleave) {
        const run = interleave;
        interleave = undefined;
        run();
      }
      return value;
    },
    setItem: (key: string, value: string) => localStorage.setItem(key, value),
    removeItem: (key: string) => localStorage.removeItem(key),
  };
  const older = new BrowserProfile(storage);
  const newer = new BrowserProfile(localStorage);
  interleave = () =>
    newer.progress({ ...position, pageIndex: 19, completed: true, recordedAt: 3000 });
  older.progress({ ...position, pageIndex: 2, completed: false, recordedAt: 2000 });
  expect(new BrowserProfile(localStorage).read().history[0]).toMatchObject({
    pageIndex: 19,
    completed: true,
    recordedAt: 3000,
  });
});
