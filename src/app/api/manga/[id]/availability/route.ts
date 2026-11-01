import { z } from 'zod';
import { api } from '@/lib/api';
import { getFeed } from '@/lib/providers/mangadex';
import { language, uuid } from '@/lib/schemas';

const query = z.strictObject({ language: language.default('en') });

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const { language: selectedLanguage } = query.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const feed = await getFeed(uuid.parse((await params).id), selectedLanguage, 0, 100);
    const readableChapters = feed.data.length;
    const status = readableChapters ? 'readable' : feed.total <= 100 ? 'unavailable' : 'unknown';
    return { status, readableChapters };
  });
}
