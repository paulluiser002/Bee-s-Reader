import type { z } from 'zod';
import type { progressSchema } from './schemas';
export function latestPerManga<T extends { mangaId: string; updatedAt: string }>(
  history: T[],
): T[] {
  const sorted = [...history].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return [...new Map(sorted.map((row) => [row.mangaId, null])).keys()].map((id) =>
    sorted.find((row) => row.mangaId === id)!,
  );
}
export function mergeProgress(
  existing: { completed: boolean } | null,
  incoming: z.infer<typeof progressSchema>,
) {
  return { ...incoming, completed: incoming.completed || !!existing?.completed };
}
