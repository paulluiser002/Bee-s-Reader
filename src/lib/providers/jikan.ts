import 'server-only';
import { z } from 'zod';
import { ProviderClient } from './http';
const client = new ProviderClient('Jikan', 1100);
export const jikanSchema = z.object({
  data: z.object({
    mal_id: z.number().int().positive(),
    title: z.string(),
    score: z.number().min(0).max(10).nullable(),
    genres: z.array(z.object({ name: z.string() })),
    status: z.string().nullable(),
    chapters: z.number().nullable(),
    volumes: z.number().nullable(),
  }),
});
export async function getJikan(id: number) {
  z.number().int().positive().max(2147483647).parse(id);
  const { data: m } = await client.json(`https://api.jikan.moe/v4/manga/${id}`, jikanSchema, {
    ttl: 300000,
  });
  return {
    provider: 'Jikan / MyAnimeList' as const,
    title: m.title,
    score: m.score === null ? null : `${m.score}/10`,
    genres: m.genres.map((g) => g.name),
    status: m.status,
    chapters: m.chapters,
    volumes: m.volumes,
    url: `https://myanimelist.net/manga/${m.mal_id}`,
  };
}
