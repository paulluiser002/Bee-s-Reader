import { z } from 'zod';
import { api, requireSameOrigin, jsonBody } from '@/lib/api';
import { db } from '@/lib/database';
export async function DELETE(request: Request) {
  return api(async () => {
    requireSameOrigin(request);
    z.strictObject({ confirm: z.literal(true) }).parse(await jsonBody(request));
    await db.readingProgress.deleteMany();
    return { cleared: true };
  });
}
