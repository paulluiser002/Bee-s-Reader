import 'server-only';
import type { z } from 'zod';
import { createHash } from 'node:crypto';
import { platformProviderCache, type SharedProviderCache } from './shared-cache';
export type { SharedProviderCache } from './shared-cache';
export class ProviderError extends Error {
  constructor(
    message: string,
    public status = 502,
    public retryAfter?: number,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
export function retryDelay(headers: Pick<Headers, 'get'>, now = Date.now()): number {
  const value = headers.get('Retry-After');
  if (value) {
    const seconds = Number(value);
    return Math.max(
      1,
      Math.ceil(Number.isFinite(seconds) ? seconds : (Date.parse(value) - now) / 1000) || 60,
    );
  }
  const reset = Number(headers.get('X-RateLimit-Retry-After') || headers.get('X-RateLimit-Reset'));
  return reset ? Math.max(1, Math.ceil(reset - now / 1000)) : 60;
}
/** Per-process pacing, deduplication and bounded memory within each server process. */
export class ProviderClient {
  private cache = new Map<string, { expires: number; data: unknown }>();
  private pending = new Map<string, Promise<unknown>>();
  private queue: Promise<void> = Promise.resolve();
  private nextAt = 0;
  private cooldown = 0;
  constructor(
    private name: string,
    private interval: number,
    private shared: SharedProviderCache | undefined = platformProviderCache(),
  ) {}
  private sharedKey(key: string) {
    return createHash('sha256')
      .update(this.name + '|' + key)
      .digest('hex');
  }
  private async sharedGet(key: string) {
    try {
      return await this.shared?.get(this.sharedKey(key));
    } catch {
      return undefined;
    }
  }
  private async sharedSet(key: string, value: unknown, ttl: number) {
    try {
      await this.shared?.set(this.sharedKey(key), value, ttl);
    } catch {
      /* Platform cache outages fall back to bounded local state. */
    }
  }
  async invalidate(url: string) {
    for (const key of this.cache.keys()) if (key.startsWith(url + '|')) this.cache.delete(key);
    try {
      await this.shared?.delete(this.sharedKey(url + '|'));
    } catch {}
  }
  async json<T>(
    url: string,
    schema: z.ZodType<T>,
    options: { ttl?: number; init?: RequestInit } = {},
  ): Promise<T> {
    const key = url + '|' + (options.init?.body || '');
    const hit = this.cache.get(key);
    if (hit && hit.expires > Date.now()) return schema.parse(hit.data);
    if (this.pending.has(key)) return this.pending.get(key) as Promise<T>;
    if (this.pending.size >= 128)
      throw new ProviderError(`${this.name} request queue is full. Try again shortly.`, 503, 5);
    const task = this.load(url, schema, options)
      .then(async (data) => {
        if (this.cache.size >= 256) this.cache.delete(this.cache.keys().next().value!);
        this.cache.set(key, { data, expires: Date.now() + (options.ttl ?? 30000) });
        return data;
      })
      .finally(() => this.pending.delete(key));
    this.pending.set(key, task);
    return task;
  }
  private async load<T>(
    url: string,
    schema: z.ZodType<T>,
    options: { ttl?: number; init?: RequestInit },
  ): Promise<T> {
    const key = url + '|' + (options.init?.body || '');
    const shared = await this.sharedGet(key);
    if (
      shared &&
      typeof shared === 'object' &&
      'expires' in shared &&
      typeof shared.expires === 'number' &&
      shared.expires > Date.now() &&
      'data' in shared
    ) {
      const parsed = schema.safeParse(shared.data);
      if (parsed.success) return parsed.data;
    }
    let response: Response;
    const turn = this.queue.then(async () => {
      const sharedCooldown = await this.sharedGet('cooldown');
      if (typeof sharedCooldown === 'number')
        this.cooldown = Math.max(this.cooldown, sharedCooldown);
      if (this.cooldown > Date.now())
        throw new ProviderError(
          `${this.name} is rate limited. Try again later.`,
          429,
          Math.ceil((this.cooldown - Date.now()) / 1000),
        );
      const wait = Math.max(0, this.nextAt - Date.now());
      if (wait) await new Promise((r) => setTimeout(r, wait));
      this.nextAt = Date.now() + this.interval;
      try {
        response = await fetch(url, {
          ...options.init,
          headers: {
            Accept: 'application/json',
            'User-Agent': 'BeesReader/1.0 (browser-profile reader)',
            ...options.init?.headers,
          },
          redirect: 'error',
          cache: 'no-store',
          signal: AbortSignal.timeout(15000),
        });
      } catch {
        throw new ProviderError(
          `${this.name} could not be reached. Check your connection and try again.`,
          503,
        );
      }
      if (response.status === 429) {
        const delay = retryDelay(response.headers);
        this.cooldown = Date.now() + delay * 1000;
        await this.sharedSet('cooldown', this.cooldown, delay);
        throw new ProviderError(
          `${this.name} is rate limited. Try again in ${delay} seconds.`,
          429,
          delay,
        );
      }
      if (response.headers.get('X-RateLimit-Remaining') === '0') {
        const delay = retryDelay(response.headers);
        this.cooldown = Date.now() + delay * 1000;
        await this.sharedSet('cooldown', this.cooldown, delay);
      }
      if (!response.ok)
        throw new ProviderError(
          response.status === 404
            ? `${this.name}: this item is unavailable.`
            : `${this.name} returned an error (${response.status}). Try again later.`,
          response.status === 404 ? 404 : 502,
        );
      return response;
    });
    this.queue = turn.then(
      () => {},
      () => {},
    );
    const res = await turn;
    try {
      const data = schema.parse(await res.json());
      await this.sharedSet(
        key,
        { data, expires: Date.now() + (options.ttl ?? 30000) },
        Math.max(1, Math.ceil((options.ttl ?? 30000) / 1000)),
      );
      return data;
    } catch {
      throw new ProviderError(
        `${this.name} returned an unexpected response. Please try again later.`,
      );
    }
  }
}
