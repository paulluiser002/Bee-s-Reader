import { api } from '@/lib/api';
import { getManga } from '@/lib/providers/mangadex';
import { language, uuid } from '@/lib/schemas';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return api(async () =>
    getManga(
      uuid.parse((await params).id),
      language.parse(new URL(request.url).searchParams.get('language') || 'en'),
    ),
  );
}
