import type { Page } from '@playwright/test';
import type { LocalState } from '../../src/lib/schemas';
export const mangaId = '00000000-0000-4000-8000-000000000001';
export const chapterId = '00000000-0000-4000-8000-000000000002';
export const nextId = '00000000-0000-4000-8000-000000000003';
export const manga = {
  id: mangaId,
  title: 'Fixture Adventure',
  description: 'A test-only story used to verify the reading experience. Not a real catalog entry.',
  originalLanguage: 'ja',
  kind: 'Manga',
  status: 'ongoing',
  year: 2024,
  tags: [{ id: '87cc87cd-a395-47af-b27a-93258283bbc6', name: 'Adventure' }],
  creators: ['Fixture Author'],
  cover: `/api/manga/${mangaId}/cover`,
  anilistId: 30002,
  malId: 2,
  resetsVolumes: false,
};
const group = { id: '00000000-0000-4000-8000-000000000004', name: 'Fixture Scanlation Group' };
export const chapter = {
  id: chapterId,
  title: 'The test chapter',
  number: '1',
  volume: '1',
  pages: 3,
  language: 'en',
  publishedAt: '2024-01-01T00:00:00Z',
  mangaId,
  groups: [group],
};
export const nextChapter = { ...chapter, id: nextId, number: '2' };
export async function fixtures(
  page: Page,
  options: { failedPage?: number; history?: LocalState['history'] } = {},
) {
  await page.addInitScript((history) => {
    if (!localStorage.getItem('bees-reader:test-seeded')) {
      for (const p of history)
        localStorage.setItem('bees-reader:v2:progress:' + p.chapterId, JSON.stringify(p));
      localStorage.setItem('bees-reader:test-seeded', 'true');
    }
  }, options.history || []);
  const imageRequests: string[] = [];
  let failImage = options.failedPage;
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const json = (value: unknown, status = 200) => route.fulfill({ status, json: value });
    if (path === '/api/manga') {
      const title = url.searchParams.get('title');
      if (title === 'error')
        return json({ error: 'MangaDex is rate limited. Try again in 5 seconds.' }, 429);
      if (title === 'empty') return json({ data: [], total: 0, offset: 0, limit: 18 });
      return json({ data: [manga], total: 1, offset: 0, limit: 18 });
    }
    if (path.endsWith('/cover'))
      return route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="384"><rect width="256" height="384" fill="#dbbd6c"/><text x="22" y="150" fill="#30291e" font-size="22">Test fixture</text></svg>',
      });
    if (path.endsWith('/chapters')) return json({ data: [chapter, nextChapter], total: 2 });
    if (path.endsWith('/metadata'))
      return json({
        sources: [
          {
            provider: 'Jikan',
            data: {
              title: 'Fixture title',
              score: '8/10',
              genres: ['Adventure'],
              status: 'Publishing',
              chapters: null,
              volumes: null,
              url: 'https://myanimelist.net/manga/2',
            },
            error: null,
          },
          { provider: 'AniList', data: null, error: 'Disabled pending permission.' },
        ],
      });
    if (path.includes('/api/reader/') && path.includes('/images/')) {
      imageRequests.push(request.url());
      const index = Number(path.split('/').at(-1));
      if (failImage === index) {
        failImage = undefined;
        return json({ error: 'Test image failure' }, 503);
      }
      return route.fulfill({
        contentType: 'image/svg+xml',
        body: `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200"><rect width="800" height="1200" fill="${index % 2 ? '#eadfca' : '#f5efe2'}"/><text x="80" y="200" fill="#30291e" font-size="48">Fixture page ${index + 1}</text></svg>`,
      });
    }
    if (path === `/api/reader/${chapterId}` || path === `/api/reader/${nextId}`) {
      const second = path.endsWith(nextId);
      return json({
        manga,
        chapter: second ? nextChapter : chapter,
        pageCount: 3,
        sequence: [chapter, nextChapter],
        previous: second ? chapter : null,
        next: second ? null : nextChapter,
        truncated: false,
      });
    }
    if (path === `/api/manga/${mangaId}`) return json(manga);
    return json({ error: 'Unknown test route' }, 404);
  });
  return { imageRequests };
}

export async function readProfile(page: Page): Promise<LocalState> {
  return page.evaluate(() => {
    const prefix = 'bees-reader:v2:';
    const bookmarks = [],
      history = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      if (key.startsWith(prefix + 'bookmark:'))
        bookmarks.push(JSON.parse(localStorage.getItem(key)!));
      if (key.startsWith(prefix + 'progress:'))
        history.push(JSON.parse(localStorage.getItem(key)!));
    }
    const merged = new Map();
    for (const row of history) {
      const old = merged.get(row.chapterId);
      const newest = !old || row.updatedAt > old.updatedAt ? row : old;
      merged.set(row.chapterId, { ...newest, completed: row.completed || !!old?.completed });
    }
    return {
      bookmarks,
      history: [...merged.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      preferences: JSON.parse(localStorage.getItem(prefix + 'preferences') || 'null'),
    };
  });
}
