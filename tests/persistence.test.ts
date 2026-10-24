import { describe, it, expect } from 'vitest';
import { defaults, preferencesSchema, progressSchema } from '@/lib/schemas';
import { requireSameOrigin } from '@/lib/api';
import { latestPerManga, mergeProgress } from '@/lib/progress';
const id = '00000000-0000-4000-8000-000000000001';
describe('local persistence rules', () => {
  it('preserves all requested reader defaults and rejects invalid preferences', () => {
    expect(defaults).toEqual({
      theme: 'system',
      language: 'en',
      mode: 'long',
      pageWidthPercent: 100,
      quality: 'data-saver',
      autoNext: true,
    });
    expect(preferencesSchema.safeParse({ quality: 'high' }).success).toBe(false);
    expect(preferencesSchema.safeParse({ pageWidthPercent: 101 }).success).toBe(false);
  });
  it('validates bounded progress and keeps completion monotonic', () => {
    const p = { mangaId: id, chapterId: id, pageIndex: 2, scrollFraction: 0.5, completed: false };
    expect(progressSchema.parse(p)).toEqual(p);
    expect(progressSchema.safeParse({ ...p, scrollFraction: 2 }).success).toBe(false);
    expect(mergeProgress({ ...p, completed: true }, p).completed).toBe(true);
  });
  it('resumes the latest chapter per manga while preserving individual chapter history', () => {
    const rows = [
      { mangaId: 'm', chapterId: 'old', updatedAt: '2024-01-01' },
      { mangaId: 'm', chapterId: 'new', updatedAt: '2024-02-01' },
      { mangaId: 'n', chapterId: 'other', updatedAt: '2024-01-15' },
    ];
    expect(latestPerManga(rows).map((p) => p.chapterId)).toEqual(['new', 'other']);
    expect(rows).toHaveLength(3);
  });
  it('rejects cross-site and missing-origin writes', () => {
    expect(() =>
      requireSameOrigin(
        new Request('http://localhost:3000/api/local', {
          headers: { origin: 'https://evil.example', 'Content-Type': 'application/json' },
        }),
      ),
    ).toThrow();
    expect(() => requireSameOrigin(new Request('http://localhost:3000/api/local'))).toThrow();
    expect(() =>
      requireSameOrigin(
        new Request('http://localhost:3000/api/local', {
          headers: { origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
        }),
      ),
    ).not.toThrow();
  });
});
