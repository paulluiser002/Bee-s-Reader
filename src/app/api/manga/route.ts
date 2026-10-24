import { api } from '@/lib/api';
import { searchSchema } from '@/lib/schemas';
import { searchManga } from '@/lib/providers/mangadex';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  return api(() =>
    searchManga(searchSchema.parse(Object.fromEntries(new URL(request.url).searchParams))),
  );
}
