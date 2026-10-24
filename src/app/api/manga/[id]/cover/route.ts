import { getCoverFilename } from '@/lib/providers/mangadex';
import { streamImage } from '@/lib/providers/media';
import { uuid } from '@/lib/schemas';
import { api } from '@/lib/api';
import { ProviderError } from '@/lib/providers/http';
export const runtime = 'nodejs';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return api(async () => {
    if (new URL(request.url).search)
      throw new ProviderError('Cover parameters are not supported.', 400);
    const id = uuid.parse((await params).id);
    const filename = await getCoverFilename(id);
    if (!filename || !/^[-a-zA-Z0-9_]+\.(jpg|jpeg|png|webp)$/i.test(filename))
      throw new ProviderError('No cover is available.', 404);
    const image = await streamImage(
      `https://uploads.mangadex.org/covers/${id}/${filename}.256.jpg`,
    );
    return new Response(image.body, {
      headers: {
        'Content-Type': image.type,
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  });
}
