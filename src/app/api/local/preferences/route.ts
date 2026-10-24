import { api, requireSameOrigin, jsonBody } from '@/lib/api';
import { db } from '@/lib/database';
import { preferencesSchema } from '@/lib/schemas';
export async function PUT(request: Request) {
  return api(async () => {
    requireSameOrigin(request);
    const prefs = preferencesSchema.parse(await jsonBody(request));
    await db.readerPreference.upsert({
      where: { id: 'local' },
      create: { id: 'local', ...prefs },
      update: prefs,
    });
    return prefs;
  });
}
