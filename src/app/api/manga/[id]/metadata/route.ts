import { api } from '@/lib/api';
import { uuid } from '@/lib/schemas';
import { getManga } from '@/lib/providers/mangadex';
import { getAniList } from '@/lib/providers/anilist';
import { getJikan } from '@/lib/providers/jikan';
import { ProviderError } from '@/lib/providers/http';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const manga = await getManga(uuid.parse((await params).id));
    const results = await Promise.allSettled([
      process.env.ANILIST_METADATA_ENABLED === 'true' && manga.anilistId
        ? getAniList(manga.anilistId)
        : Promise.reject(
            new ProviderError(
              manga.anilistId
                ? 'AniList metadata is disabled pending terms-of-use permission.'
                : 'No AniList ID is linked by MangaDex.',
              404,
            ),
          ),
      manga.malId
        ? getJikan(manga.malId)
        : Promise.reject(new ProviderError('No MyAnimeList ID is linked by MangaDex.', 404)),
    ]);
    return {
      sources: results.map((r, i) =>
        r.status === 'fulfilled'
          ? { provider: i === 0 ? 'AniList' : 'Jikan', data: r.value, error: null }
          : {
              provider: i === 0 ? 'AniList' : 'Jikan',
              data: null,
              error: r.reason instanceof Error ? r.reason.message : 'Source unavailable.',
            },
      ),
    };
  });
}
