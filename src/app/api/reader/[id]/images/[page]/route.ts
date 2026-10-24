import { z } from 'zod';
import { after } from 'next/server';
import { api } from '@/lib/api';
import { uuid, quality } from '@/lib/schemas';
import { getChapter, getAtHome } from '@/lib/providers/mangadex';
import { buildPageUrl, streamImage } from '@/lib/providers/media';
import { ProviderError } from '@/lib/providers/http';
export const runtime = 'nodejs';
export const maxDuration = 60;
const query = z.strictObject({
  quality: quality.default('data-saver'),
  retry: z.coerce.number().int().min(0).max(20).optional(),
});
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; page: string }> },
) {
  return api(async () => {
    const p = await params;
    const id = uuid.parse(p.id);
    const page = z.coerce.number().int().min(0).max(1999).parse(p.page);
    const q = query.parse(Object.fromEntries(new URL(request.url).searchParams));
    await getChapter(id);
    async function retrieve(refresh = false) {
      const assignment = await getAtHome(id, refresh);
      const files =
        q.quality === 'original' ? assignment.chapter.data : assignment.chapter.dataSaver;
      const filename = files[page];
      if (!filename) throw new ProviderError('This page does not exist.', 404);
      return streamImage(
        buildPageUrl(
          assignment.baseUrl,
          q.quality === 'original' ? 'data' : 'data-saver',
          assignment.chapter.hash,
          filename,
        ),
        true,
        (job) => after(job),
      );
    }
    let image;
    try {
      image = await retrieve(!!q.retry);
    } catch (e) {
      if (e instanceof ProviderError && e.status === 403) image = await retrieve(true);
      else throw e;
    }
    return new Response(image.body, {
      headers: {
        'Content-Type': image.type,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  });
}
