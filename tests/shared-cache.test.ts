// @vitest-environment node
import { it, expect, vi } from 'vitest';
import { z } from 'zod';
import { ProviderClient, type SharedProviderCache } from '@/lib/providers/http';
it('shares validated public metadata and cooldowns across independent server instances', async () => {
  const values = new Map<string, unknown>();
  const shared: SharedProviderCache = {
    get: async (key) => values.get(key),
    set: async (key, value) => {
      values.set(key, value);
    },
    delete: async (key) => {
      values.delete(key);
    },
  };
  const fetcher = vi.fn(async () => Response.json({ value: 'real-shaped' }));
  vi.stubGlobal('fetch', fetcher);
  const schema = z.object({ value: z.string() });
  const a = new ProviderClient('same-provider', 0, shared),
    b = new ProviderClient('same-provider', 0, shared);
  expect(await a.json('https://example.org/data', schema)).toEqual({ value: 'real-shaped' });
  expect(await b.json('https://example.org/data', schema)).toEqual({ value: 'real-shaped' });
  expect(fetcher).toHaveBeenCalledTimes(1);
  await b.invalidate('https://example.org/data');
  const c = new ProviderClient('same-provider', 0, shared);
  await c.json('https://example.org/data', schema);
  expect(fetcher).toHaveBeenCalledTimes(2);
  fetcher.mockImplementation(
    async () => new Response('', { status: 429, headers: { 'Retry-After': '30' } }),
  );
  await expect(a.json('https://example.org/limit', schema)).rejects.toMatchObject({ status: 429 });
  const before = fetcher.mock.calls.length;
  await expect(c.json('https://example.org/other', schema)).rejects.toMatchObject({ status: 429 });
  expect(fetcher).toHaveBeenCalledTimes(before);
  vi.unstubAllGlobals();
});
it('continues with bounded local caching if the platform cache is unavailable', async () => {
  const unavailable: SharedProviderCache = {
    get: async () => {
      throw Error('cache unavailable');
    },
    set: async () => {
      throw Error('cache unavailable');
    },
    delete: async () => {
      throw Error('cache unavailable');
    },
  };
  vi.stubGlobal('fetch', async () => Response.json({ ok: true }));
  const c = new ProviderClient('fallback', 0, unavailable);
  expect(await c.json('https://example.org', z.object({ ok: z.boolean() }))).toEqual({ ok: true });
  vi.unstubAllGlobals();
});
it('does not renew a shared metadata entry just because another instance reads it', async () => {
  const values = new Map<string, unknown>();
  const set = vi.fn(async (key: string, value: unknown) => {
    values.set(key, value);
  });
  const shared: SharedProviderCache = {
    get: async (key) => values.get(key),
    set,
    delete: async (key) => {
      values.delete(key);
    },
  };
  vi.stubGlobal('fetch', async () => Response.json({ ok: true }));
  const schema = z.object({ ok: z.boolean() });
  await new ProviderClient('expiry', 0, shared).json('https://example.org/expiry', schema);
  await new ProviderClient('expiry', 0, shared).json('https://example.org/expiry', schema);
  expect(set).toHaveBeenCalledTimes(1);
  vi.unstubAllGlobals();
});
