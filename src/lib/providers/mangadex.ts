import 'server-only';
import { z } from 'zod';
import { uuid, searchSchema } from '@/lib/schemas';
import { ProviderClient, ProviderError } from './http';
export const md = new ProviderClient('MangaDex', 300);
export const MD = 'https://api.mangadex.org';
const homeClient = new ProviderClient('MangaDex@Home', 1600);
const coverFiles = new Map<string, { filename: string; expires: number }>();
function rememberCover(m: z.infer<typeof mangaSchema>) {
  const filename = m.relationships.find((r) => r.type === 'cover_art')?.attributes?.fileName;
  if (!filename) return;
  if (coverFiles.size >= 512) coverFiles.delete(coverFiles.keys().next().value!);
  coverFiles.set(m.id, { filename, expires: Date.now() + 300000 });
}
export async function getCoverFilename(id: string) {
  uuid.parse(id);
  const cached = coverFiles.get(id);
  if (cached && cached.expires > Date.now()) return cached.filename;
  const raw = await getRawManga(id);
  return raw.relationships.find((r) => r.type === 'cover_art')?.attributes?.fileName;
}
const localized = z.record(z.string(), z.string());
const relationship = z.object({
  id: uuid,
  type: z.string(),
  attributes: z.object({ name: z.string().optional(), fileName: z.string().optional() }).optional(),
});
const tagSchema = z.object({
  id: uuid,
  attributes: z.object({ name: localized, group: z.string() }),
});
export const mangaSchema = z.object({
  id: uuid,
  type: z.literal('manga'),
  attributes: z.object({
    title: localized,
    description: localized,
    originalLanguage: z.string(),
    status: z.string(),
    tags: z.array(tagSchema),
    links: z.record(z.string(), z.string()).nullish(),
    year: z.number().nullish(),
    chapterNumbersResetOnNewVolume: z.boolean().default(false),
  }),
  relationships: z.array(relationship),
});
export const chapterSchema = z.object({
  id: uuid,
  type: z.literal('chapter'),
  attributes: z.object({
    title: z.string().nullable(),
    volume: z.string().nullable(),
    chapter: z.string().nullable(),
    pages: z.number().int().min(0),
    translatedLanguage: z.string(),
    externalUrl: z.string().nullish(),
    publishAt: z.string(),
    readableAt: z.string().optional(),
    createdAt: z.string().optional(),
  }),
  relationships: z.array(relationship),
});
export type RawChapter = z.infer<typeof chapterSchema>;
export const atHomeSchema = z.object({
  result: z.literal('ok'),
  baseUrl: z.url(),
  chapter: z.object({
    hash: z.string().regex(/^[a-f0-9]{32,64}$/i),
    data: z.array(z.string().regex(/^[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp|gif)$/i)).max(2000),
    dataSaver: z.array(z.string().regex(/^[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp|gif)$/i)).max(2000),
  }),
});
function localText(value: Record<string, string>, lang = 'en') {
  return value[lang] || value.en || Object.values(value)[0] || '';
}
function linkedId(s: string | undefined) {
  return s && /^\d+$/.test(s) && Number.isSafeInteger(Number(s)) && Number(s) > 0
    ? Number(s)
    : null;
}
export function toManga(m: z.infer<typeof mangaSchema>, lang = 'en') {
  const a = m.attributes;
  const filename = m.relationships.find((r) => r.type === 'cover_art')?.attributes?.fileName;
  return {
    id: m.id,
    title: localText(a.title, lang) || 'Untitled',
    description: localText(a.description, lang),
    originalLanguage: a.originalLanguage,
    kind:
      a.originalLanguage === 'ko'
        ? 'Manhwa'
        : a.originalLanguage.startsWith('zh')
          ? 'Manhua'
          : 'Manga',
    status: a.status,
    year: a.year ?? null,
    tags: a.tags.map((t) => ({ id: t.id, name: localText(t.attributes.name, lang) })),
    creators: m.relationships
      .filter((r) => r.type === 'author' || r.type === 'artist')
      .map((r) => r.attributes?.name)
      .filter((s): s is string => !!s),
    cover: filename ? `/api/manga/${m.id}/cover` : null,
    anilistId: linkedId(a.links?.al),
    malId: linkedId(a.links?.mal),
    resetsVolumes: a.chapterNumbersResetOnNewVolume,
  };
}
export type Manga = ReturnType<typeof toManga>;
export function isReadable(c: RawChapter) {
  return (
    c.attributes.pages > 0 &&
    !c.attributes.externalUrl &&
    Date.parse(c.attributes.publishAt) <= Date.now() &&
    (!c.attributes.readableAt || Date.parse(c.attributes.readableAt) <= Date.now()) &&
    !c.relationships.some((r) => r.type === 'scanlation_group' && blockedGroups().has(r.id))
  );
}
function blockedGroups() {
  return new Set(
    (process.env.MANGADEX_BLOCKED_GROUPS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}
export function toChapter(c: RawChapter) {
  return {
    id: c.id,
    title: c.attributes.title,
    number: c.attributes.chapter,
    volume: c.attributes.volume,
    pages: c.attributes.pages,
    language: c.attributes.translatedLanguage,
    publishedAt: c.attributes.publishAt,
    mangaId: c.relationships.find((r) => r.type === 'manga')?.id ?? '',
    groups: c.relationships
      .filter((r) => r.type === 'scanlation_group')
      .map((r) => ({ id: r.id, name: r.attributes?.name || 'Scanlation group' })),
  };
}
export type Chapter = ReturnType<typeof toChapter>;
export function searchParams(q: z.infer<typeof searchSchema>) {
  const p = new URLSearchParams({ limit: String(q.limit), offset: String(q.offset) });
  p.append('includes[]', 'cover_art');
  p.append('contentRating[]', 'safe');
  p.append('contentRating[]', 'suggestive');
  if (q.title) p.set('title', q.title);
  if (!q.ids) p.append('availableTranslatedLanguage[]', q.language);
  if (q.ids) q.ids.forEach((id) => p.append('ids[]', id));
  const origins = { manga: ['ja'], manhwa: ['ko'], manhua: ['zh', 'zh-hk'], all: [] }[q.origin];
  origins.forEach((o) => p.append('originalLanguage[]', o));
  if (q.status !== 'all') p.append('status[]', q.status);
  if (q.tag) p.append('includedTags[]', q.tag);
  p.set(
    q.sort === 'recent'
      ? 'order[latestUploadedChapter]'
      : q.sort === 'title'
        ? 'order[title]'
        : 'order[followedCount]',
    q.sort === 'title' ? 'asc' : 'desc',
  );
  return p;
}
export async function searchManga(q: z.infer<typeof searchSchema>) {
  const raw = await md.json(
    `${MD}/manga?${searchParams(q)}`,
    z.object({
      data: z.array(mangaSchema),
      total: z.number(),
      limit: z.number(),
      offset: z.number(),
    }),
  );
  raw.data.forEach(rememberCover);
  return { ...raw, data: raw.data.map((m) => toManga(m, q.language)) };
}
export async function getRawManga(id: string) {
  uuid.parse(id);
  const raw = (
    await md.json(
      `${MD}/manga/${id}?includes[]=cover_art&includes[]=author&includes[]=artist`,
      z.object({ data: mangaSchema }),
    )
  ).data;
  rememberCover(raw);
  return raw;
}
export async function getManga(id: string, lang = 'en') {
  return toManga(await getRawManga(id), lang);
}
export async function getChapter(id: string) {
  uuid.parse(id);
  const raw = (
    await md.json(
      `${MD}/chapter/${id}?includes[]=scanlation_group`,
      z.object({ data: chapterSchema }),
      { ttl: 15000 },
    )
  ).data;
  if (!isReadable(raw))
    throw new ProviderError(
      'This chapter is external, removed, not yet published, or has no readable pages.',
      404,
    );
  return toChapter(raw);
}
export async function getFeed(id: string, lang = 'en', offset = 0, limit = 100) {
  uuid.parse(id);
  const p = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    includeExternalUrl: '0',
    includeEmptyPages: '0',
    includeFuturePublishAt: '0',
    'translatedLanguage[]': lang,
    'includes[]': 'scanlation_group',
    'order[chapter]': 'asc',
    'order[volume]': 'asc',
  });
  const raw = await md.json(
    `${MD}/manga/${id}/feed?${p}`,
    z.object({
      data: z.array(chapterSchema),
      total: z.number(),
      offset: z.number(),
      limit: z.number(),
    }),
    { ttl: 15000 },
  );
  return { ...raw, data: raw.data.filter(isReadable).map(toChapter) };
}
export async function getAllChapters(id: string, lang: string) {
  const first = await getFeed(id, lang, 0, 500);
  const data = [...first.data];
  const max = Math.min(first.total, 10000);
  for (let offset = 500; offset < max; offset += 500) {
    data.push(...(await getFeed(id, lang, offset, 500)).data);
  }
  return { data, truncated: first.total > 10000 };
}
export async function getAtHome(id: string, refresh = false) {
  uuid.parse(id);
  const url = `${MD}/at-home/server/${id}`;
  if (refresh) homeClient.invalidate(url);
  const result = await homeClient.json(url, atHomeSchema, { ttl: 60000 });
  if (
    !result.chapter.dataSaver.length ||
    result.chapter.data.length !== result.chapter.dataSaver.length
  )
    throw new ProviderError('This chapter’s image list is unavailable.');
  return result;
}
