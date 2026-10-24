import type { Chapter, Manga } from './providers/mangadex';
function numeric(value: string | null) {
  return value !== null && /^\d+(\.\d+)?$/.test(value) ? Number(value) : null;
}
function compare(a: Chapter, b: Chapter, resets: boolean) {
  const av = numeric(a.volume) ?? 0,
    bv = numeric(b.volume) ?? 0;
  const an = numeric(a.number),
    bn = numeric(b.number);
  if (resets && av !== bv) return av - bv;
  if (an !== null && bn !== null && an !== bn) return an - bn;
  if (an === null && bn !== null) return 1;
  if (an !== null && bn === null) return -1;
  return av - bv || a.publishedAt.localeCompare(b.publishedAt) || a.id.localeCompare(b.id);
}
export function chapterSequence(chapters: Chapter[], current: Chapter, resets: boolean) {
  const candidates = chapters.filter(
    (c) => c.mangaId === current.mangaId && c.language === current.language && c.pages > 0,
  );
  const groups = new Map<string, Chapter[]>();
  for (const c of candidates) {
    const n = numeric(c.number);
    const key = n === null ? c.id : `${resets ? c.volume || '0' : ''}:${n}`;
    groups.set(key, [...(groups.get(key) || []), c]);
  }
  return [...groups.values()]
    .map(
      (list) =>
        list.find((c) => c.id === current.id) ||
        list.find((c) => c.groups.some((g) => current.groups.some((cg) => cg.id === g.id))) ||
        list.sort((a, b) => compare(a, b, resets))[0],
    )
    .sort((a, b) => compare(a, b, resets));
}
export function adjacentChapters(sequence: Chapter[], id: string) {
  const index = sequence.findIndex((c) => c.id === id);
  return {
    previous: index > 0 ? sequence[index - 1] : null,
    next: index >= 0 && index < sequence.length - 1 ? sequence[index + 1] : null,
  };
}
export function canAutoAdvance(s: {
  enabled: boolean;
  intentional: boolean;
  restored: boolean;
  allLoaded: boolean;
  atEnd: boolean;
  currentId: string;
  nextId: string | null;
  visited: Set<string>;
}) {
  return (
    s.enabled &&
    s.intentional &&
    s.restored &&
    s.allLoaded &&
    s.atEnd &&
    !!s.nextId &&
    s.nextId !== s.currentId &&
    !s.visited.has(s.nextId)
  );
}
export function positionInPage(offset: number, height: number) {
  return height > 0 ? Math.max(0, Math.min(1, offset / height)) : 0;
}
export type ReaderData = {
  manga: Manga;
  chapter: Chapter;
  pageCount: number;
  sequence: Chapter[];
  previous: Chapter | null;
  next: Chapter | null;
  truncated: boolean;
};
