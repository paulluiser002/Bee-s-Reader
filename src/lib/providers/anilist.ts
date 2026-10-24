import 'server-only';
import { z } from 'zod';
import { ProviderClient, ProviderError } from './http';
const client = new ProviderClient('AniList', 2100);
export const anilistSchema = z.object({
  data: z.object({
    Media: z
      .object({
        id: z.number().int().positive(),
        title: z.object({
          romaji: z.string().nullish(),
          english: z.string().nullish(),
          native: z.string().nullish(),
        }),
        averageScore: z.number().min(0).max(100).nullable(),
        genres: z.array(z.string()),
        status: z.string().nullable(),
        chapters: z.number().nullable(),
        volumes: z.number().nullable(),
      })
      .nullable(),
  }),
});
export async function getAniList(id: number) {
  z.number().int().positive().max(2147483647).parse(id);
  const response = await client.json('https://graphql.anilist.co', anilistSchema, {
    ttl: 300000,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query:
          'query ($id: Int!) { Media(id: $id, type: MANGA) { id title { romaji english native } averageScore genres status chapters volumes } }',
        variables: { id },
      }),
    },
  });
  const m = response.data.Media;
  if (!m) throw new ProviderError('AniList has no matching manga.', 404);
  return {
    provider: 'AniList' as const,
    title: m.title.english || m.title.romaji || m.title.native || 'Untitled',
    score: m.averageScore === null ? null : `${m.averageScore}/100`,
    genres: m.genres,
    status: m.status,
    chapters: m.chapters,
    volumes: m.volumes,
    url: `https://anilist.co/manga/${m.id}`,
  };
}
