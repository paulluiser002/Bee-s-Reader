import 'server-only';
import { getCache } from '@vercel/functions';
export type SharedProviderCache = {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown, ttl: number) => Promise<unknown>;
  delete: (key: string) => Promise<unknown>;
};
export function platformProviderCache(): SharedProviderCache | undefined {
  if (process.env.VERCEL !== '1') return;
  const cache = () => getCache({ namespace: 'bees-reader-public-v3' });
  return {
    get: (key) => cache().get(key),
    set: (key, value, ttl) => cache().set(key, value, { ttl }),
    delete: (key) => cache().delete(key),
  };
}
