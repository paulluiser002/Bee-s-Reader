// @vitest-environment node
import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const ids = vi.hoisted(() => ({
  manga: '00000000-0000-4000-8000-000000000001',
  chapter: '00000000-0000-4000-8000-000000000002',
}));
let prisma: PrismaClient;
let dir: string;
vi.mock('@/lib/database', () => ({
  get db() {
    return prisma;
  },
}));
vi.mock('@/lib/providers/mangadex', () => ({
  getChapter: async () => ({ mangaId: ids.manga }),
  getAtHome: async () => ({ chapter: { dataSaver: ['one', 'two', 'three'] } }),
}));
import { GET } from '@/app/api/local/route';
import { POST as bookmark } from '@/app/api/local/bookmarks/route';
import { PUT as preferences } from '@/app/api/local/preferences/route';
import { PUT as progress } from '@/app/api/local/progress/route';
import { DELETE as clear } from '@/app/api/local/history/route';
import { defaults } from '@/lib/schemas';
const req = (path: string, method: string, body: unknown) =>
  new Request('http://localhost:3000/api/local/' + path, {
    method,
    headers: { origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'bees-reader-'));
  prisma = new PrismaClient({ datasourceUrl: `file:${dir}/test.db` });
  const sql = await readFile('prisma/migrations/20261024122752_init/migration.sql', 'utf8');
  for (const statement of sql.split(';').filter((s) => s.trim()))
    await prisma.$executeRawUnsafe(statement);
  await prisma.$executeRawUnsafe(
    'ALTER TABLE ReadingProgress ADD COLUMN recordedAt REAL NOT NULL DEFAULT 0',
  );
});
afterAll(async () => {
  await prisma.$disconnect();
  await rm(dir, { recursive: true, force: true });
});
describe('real SQLite route integration (upstream chapter lookup mocked)', () => {
  it('persists bookmarks and preferences across a new Prisma connection', async () => {
    expect(
      (await bookmark(req('bookmarks', 'POST', { mangaId: ids.manga, saved: true }))).status,
    ).toBe(200);
    expect(
      (
        await preferences(
          req('preferences', 'PUT', { ...defaults, theme: 'dark', quality: 'original' }),
        )
      ).status,
    ).toBe(200);
    const fresh = new PrismaClient({ datasourceUrl: `file:${dir}/test.db` });
    expect(await fresh.bookmark.count()).toBe(1);
    expect((await fresh.readerPreference.findUnique({ where: { id: 'local' } }))?.quality).toBe(
      'original',
    );
    await fresh.$disconnect();
    const state = await (await GET()).json();
    expect(state.bookmarks[0].mangaId).toBe(ids.manga);
    expect(state.preferences.theme).toBe('dark');
  });
  it('saves per-chapter progress and rejects mismatched titles or nonexistent pages', async () => {
    const p = {
      mangaId: ids.manga,
      chapterId: ids.chapter,
      pageIndex: 2,
      scrollFraction: 0.7,
      completed: true,
    };
    expect((await progress(req('progress', 'PUT', p))).status).toBe(200);
    expect((await progress(req('progress', 'PUT', { ...p, pageIndex: 3 }))).status).toBe(400);
    expect((await progress(req('progress', 'PUT', { ...p, mangaId: ids.chapter }))).status).toBe(
      400,
    );
    expect(
      (await progress(req('progress', 'PUT', { ...p, pageIndex: 0, completed: false }))).status,
    ).toBe(200);
    const saved = await prisma.readingProgress.findFirst();
    expect(saved?.completed).toBe(true);
    expect(saved?.pageIndex).toBe(0);
  });
  it('requires explicit clear confirmation and keeps bookmarks/settings', async () => {
    expect((await clear(req('history', 'DELETE', { confirm: false }))).status).toBe(400);
    expect(await prisma.readingProgress.count()).toBe(1);
    expect((await clear(req('history', 'DELETE', { confirm: true }))).status).toBe(200);
    expect(await prisma.readingProgress.count()).toBe(0);
    expect(await prisma.bookmark.count()).toBe(1);
  });
  it('rejects cross-site mutations before changing data', async () => {
    const request = new Request('http://localhost:3000/api/local/bookmarks', {
      method: 'POST',
      headers: { origin: 'https://evil.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ mangaId: ids.manga, saved: false }),
    });
    expect((await bookmark(request)).status).toBe(403);
    expect(await prisma.bookmark.count()).toBe(1);
  });
});
it('rejects delayed older positions after a newer lifecycle save', async () => {
  const p = {
    mangaId: ids.manga,
    chapterId: ids.chapter,
    pageIndex: 2,
    scrollFraction: 0.8,
    completed: false,
    recordedAt: Date.now() + 10,
  };
  expect((await progress(req('progress', 'PUT', p))).status).toBe(200);
  expect(
    (
      await progress(
        req('progress', 'PUT', {
          ...p,
          pageIndex: 1,
          scrollFraction: 0.1,
          recordedAt: p.recordedAt - 1,
        }),
      )
    ).status,
  ).toBe(200);
  expect((await prisma.readingProgress.findFirst())?.pageIndex).toBe(2);
});
