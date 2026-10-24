import { z } from 'zod';
export const uuid = z.uuid();
export const language = z.enum([
  'en',
  'ja',
  'ko',
  'zh',
  'zh-hk',
  'es',
  'es-la',
  'fr',
  'de',
  'pt-br',
  'id',
  'vi',
  'ru',
  'it',
  'uk',
]);
export const quality = z.enum(['data-saver', 'original']);
export const searchSchema = z
  .strictObject({
    title: z.string().trim().max(150).default(''),
    language: language.default('en'),
    origin: z.enum(['all', 'manga', 'manhwa', 'manhua']).default('all'),
    status: z.enum(['all', 'ongoing', 'completed', 'hiatus', 'cancelled']).default('all'),
    sort: z.enum(['recent', 'popular', 'title']).default('popular'),
    offset: z.coerce.number().int().min(0).max(9900).default(0),
    limit: z.coerce.number().int().min(1).max(100).default(18),
    tag: uuid.optional(),
    ids: z
      .string()
      .transform((v) => v.split(','))
      .pipe(z.array(uuid).min(1).max(100))
      .optional(),
  })
  .refine((v) => v.offset + v.limit <= 10000, {
    message: 'MangaDex pagination is limited to 10,000 items.',
  });
export const preferencesSchema = z.strictObject({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: language.default('en'),
  mode: z.literal('long').default('long'),
  pageWidthPercent: z.number().int().min(50).max(100).default(100),
  quality: quality.default('data-saver'),
  autoNext: z.boolean().default(true),
});
export type Preferences = z.infer<typeof preferencesSchema>;
export const defaults: Preferences = preferencesSchema.parse({});
export const progressSchema = z.strictObject({
  mangaId: uuid,
  chapterId: uuid,
  pageIndex: z.number().int().min(0).max(1999),
  scrollFraction: z.number().min(0).max(1),
  completed: z.boolean(),
  recordedAt: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
});
export type Progress = z.infer<typeof progressSchema> & { updatedAt: string };
export type Bookmark = { mangaId: string; createdAt: string; updatedAt: string };
export type LocalState = { preferences: Preferences; bookmarks: Bookmark[]; history: Progress[] };
