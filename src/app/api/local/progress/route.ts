import { api, requireSameOrigin, jsonBody } from '@/lib/api';
import { db } from '@/lib/database';
import { progressSchema } from '@/lib/schemas';
import { getChapter, getAtHome } from '@/lib/providers/mangadex';
import { ProviderError } from '@/lib/providers/http';
import { mergeProgress } from '@/lib/progress';
export async function PUT(request: Request) {
  return api(async () => {
    requireSameOrigin(request);
    const p = progressSchema.parse(await jsonBody(request));
    const c = await getChapter(p.chapterId);
    if (c.mangaId !== p.mangaId)
      throw new ProviderError('Chapter does not belong to this title.', 400);
    const pages = (await getAtHome(p.chapterId)).chapter.dataSaver.length;
    if (p.pageIndex >= pages || (p.completed && p.pageIndex !== pages - 1))
      throw new ProviderError('Invalid page progress.', 400);
    const where = { provider_chapterId: { provider: 'mangadex', chapterId: p.chapterId } };
    const saved = await db.$transaction(async (tx) => {
      const previous = await tx.readingProgress.findUnique({ where });
      const recordedAt = p.recordedAt ?? Date.now();
      if (previous && previous.recordedAt > recordedAt) {
        return p.completed && !previous.completed
          ? tx.readingProgress.update({ where, data: { completed: true } })
          : previous;
      }
      const merged = { ...mergeProgress(previous, p), recordedAt };
      return tx.readingProgress.upsert({ where, create: merged, update: merged });
    });
    return saved;
  });
}
