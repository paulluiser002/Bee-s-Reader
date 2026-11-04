import { api } from '@/lib/api';
import { searchSchema } from '@/lib/schemas';
import { searchHostedManga, searchManga } from '@/lib/providers/mangadex';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  return api(() => {
    const query = searchSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return query.hosted ? searchHostedManga(query) : searchManga(query);
  });
}
