import { api } from '@/lib/api';
import { db } from '@/lib/database';
import { defaults, preferencesSchema } from '@/lib/schemas';
export async function GET() {
  return api(async () => {
    const [preferences, bookmarks, history] = await Promise.all([
      db.readerPreference.findUnique({ where: { id: 'local' } }),
      db.bookmark.findMany({ orderBy: { updatedAt: 'desc' } }),
      db.readingProgress.findMany({ orderBy: { updatedAt: 'desc' }, take: 1000 }),
    ]);
    return {
      preferences: preferences
        ? preferencesSchema.parse({
            theme: preferences.theme,
            language: preferences.language,
            mode: preferences.mode,
            pageWidthPercent: preferences.pageWidthPercent,
            quality: preferences.quality,
            autoNext: preferences.autoNext,
          })
        : defaults,
      bookmarks,
      history,
    };
  });
}
