import { api } from '@/lib/api';
import { getChapter, getManga, getAllChapters, getAtHome } from '@/lib/providers/mangadex';
import { chapterSequence, adjacentChapters } from '@/lib/reader';
import { uuid } from '@/lib/schemas';
import { ProviderError } from '@/lib/providers/http';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return api(async () => {
    if (new URL(request.url).search)
      throw new ProviderError('Reader parameters are not supported.', 400);
    const id = uuid.parse((await params).id);
    const chapter = await getChapter(id);
    const [manga, feed, images] = await Promise.all([
      getManga(chapter.mangaId),
      getAllChapters(chapter.mangaId, chapter.language),
      getAtHome(id),
    ]);
    const sequence = chapterSequence(
      feed.data.some((c) => c.id === id) ? feed.data : [...feed.data, chapter],
      chapter,
      manga.resetsVolumes,
    );
    return {
      chapter,
      manga,
      pageCount: images.chapter.dataSaver.length,
      sequence,
      ...adjacentChapters(sequence, id),
      truncated: feed.truncated,
    };
  });
}
