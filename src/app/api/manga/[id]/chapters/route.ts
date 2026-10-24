import { z } from 'zod';
import { api } from '@/lib/api';
import { getFeed } from '@/lib/providers/mangadex';
import { language, uuid } from '@/lib/schemas';
const query = z.strictObject({
  language: language.default('en'),
  offset: z.coerce.number().int().min(0).max(9900).default(0),
});
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const q = query.parse(Object.fromEntries(new URL(request.url).searchParams));
    return getFeed(uuid.parse((await params).id), q.language, q.offset);
  });
}
