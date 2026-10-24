import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchSchema } from '@/lib/schemas';
import {
  mangaSchema,
  chapterSchema,
  toManga,
  isReadable,
  searchParams,
} from '@/lib/providers/mangadex';
import { anilistSchema } from '@/lib/providers/anilist';
import { jikanSchema } from '@/lib/providers/jikan';
import { ProviderClient, ProviderError, retryDelay } from '@/lib/providers/http';
const id = '00000000-0000-4000-8000-000000000001';
export const rawManga = {
  id,
  type: 'manga',
  attributes: {
    title: { en: 'A real title' },
    description: { en: 'A description' },
    originalLanguage: 'ko',
    status: 'ongoing',
    tags: [],
    links: { al: '1', mal: '2' },
    year: 2024,
  },
  relationships: [],
};
describe('provider contracts', () => {
  it('validates inputs and maps origin filters to supported MangaDex metadata', () => {
    const q = searchSchema.parse({ origin: 'manhwa', title: '  Bee  ', offset: '24' });
    const p = searchParams(q);
    expect(p.getAll('originalLanguage[]')).toEqual(['ko']);
    expect(p.get('title')).toBe('Bee');
    expect(p.get('offset')).toBe('24');
    expect(searchSchema.safeParse({ url: 'http://localhost' }).success).toBe(false);
    expect(searchSchema.safeParse({ offset: '10001' }).success).toBe(false);
  });
  it('normalizes real-shaped manga without fabricating images or availability', () => {
    const m = toManga(mangaSchema.parse(rawManga));
    expect(m.title).toBe('A real title');
    expect(m.kind).toBe('Manhwa');
    expect(m.cover).toBeNull();
    expect(m.anilistId).toBe(1);
    expect(mangaSchema.safeParse({ ...rawManga, id: 'bad' }).success).toBe(false);
  });
  it('excludes external, empty and future chapters', () => {
    const c = chapterSchema.parse({
      id,
      type: 'chapter',
      attributes: {
        chapter: '1',
        volume: null,
        title: null,
        pages: 4,
        translatedLanguage: 'en',
        externalUrl: null,
        publishAt: '2020-01-01T00:00:00Z',
      },
      relationships: [{ id, type: 'manga' }],
    });
    expect(isReadable(c)).toBe(true);
    expect(
      isReadable({ ...c, attributes: { ...c.attributes, externalUrl: 'https://example.com' } }),
    ).toBe(false);
    expect(isReadable({ ...c, attributes: { ...c.attributes, pages: 0 } })).toBe(false);
    expect(
      isReadable({ ...c, attributes: { ...c.attributes, publishAt: '2999-01-01T00:00:00Z' } }),
    ).toBe(false);
  });
  it('validates AniList and Jikan independently, including absent scores', () => {
    expect(
      anilistSchema.parse({
        data: {
          Media: {
            id: 1,
            title: { romaji: 'Title' },
            averageScore: null,
            genres: ['Adventure'],
            status: 'FINISHED',
            chapters: null,
            volumes: null,
          },
        },
      }).data.Media?.averageScore,
    ).toBeNull();
    expect(
      jikanSchema.parse({
        data: {
          mal_id: 2,
          title: 'Title',
          score: null,
          genres: [],
          status: 'Publishing',
          chapters: null,
          volumes: null,
        },
      }).data.score,
    ).toBeNull();
    expect(anilistSchema.safeParse({ errors: [{ message: 'rate limited' }] }).success).toBe(false);
  });
});
describe('bounded provider client', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('deduplicates concurrent reads, validates, and reuses short lived cache', async () => {
    const fetcher = vi.fn(async () => Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetcher);
    const client = new ProviderClient('test', 0);
    const { z } = await import('zod');
    const schema = z.object({ ok: z.boolean() });
    const [a, b] = await Promise.all([
      client.json('https://example.com', schema),
      client.json('https://example.com', schema),
    ]);
    expect(a).toEqual(b);
    await client.json('https://example.com', schema);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('honors Retry-After without hammering the upstream', async () => {
    const fetcher = vi.fn(
      async () => new Response('', { status: 429, headers: { 'Retry-After': '60' } }),
    );
    vi.stubGlobal('fetch', fetcher);
    const client = new ProviderClient('test', 0);
    const { z } = await import('zod');
    await expect(client.json('https://example.com/a', z.unknown())).rejects.toMatchObject({
      status: 429,
      retryAfter: 60,
    });
    await expect(client.json('https://example.com/b', z.unknown())).rejects.toBeInstanceOf(
      ProviderError,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('handles numeric/date retry headers and MangaDex epoch headers', () => {
    expect(retryDelay(new Headers({ 'Retry-After': '12' }), 1000)).toBe(12);
    expect(retryDelay(new Headers({ 'X-RateLimit-Retry-After': '20' }), 1000)).toBe(19);
    expect(retryDelay(new Headers({ 'Retry-After': new Date(21000).toUTCString() }), 1000)).toBe(
      20,
    );
  });
});
