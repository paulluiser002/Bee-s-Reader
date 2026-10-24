import { z } from 'zod';
import { api, requireSameOrigin, jsonBody } from '@/lib/api';
import { db } from '@/lib/database';
import { uuid } from '@/lib/schemas';
const body = z.strictObject({ mangaId: uuid, saved: z.boolean() });
export async function POST(request: Request) {
  return api(async () => {
    requireSameOrigin(request);
    const { mangaId, saved } = body.parse(await jsonBody(request));
    if (saved)
      await db.bookmark.upsert({
        where: { provider_mangaId: { provider: 'mangadex', mangaId } },
        create: { mangaId },
        update: {},
      });
    else await db.bookmark.deleteMany({ where: { provider: 'mangadex', mangaId } });
    return { saved };
  });
}
