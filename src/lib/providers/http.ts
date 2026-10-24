import 'server-only';
import type { z } from 'zod';
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
export function retryDelay(headers: Headers, now = Date.now()): number {
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
/** Per-process pacing, deduplication and bounded memory for the local single-user app. */
export class ProviderClient {
  private cache = new Map<string, { expires: number; data: unknown }>();
  private pending = new Map<string, Promise<unknown>>();
  private queue: Promise<void> = Promise.resolve();
  private nextAt = 0;
  private cooldown = 0;
  constructor(
    private name: string,
    private interval: number,
  ) {}
  invalidate(url: string) {
    for (const key of this.cache.keys()) if (key.startsWith(url + '|')) this.cache.delete(key);
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
      .then((data) => {
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
    options: { init?: RequestInit },
  ): Promise<T> {
    let response: Response;
    const turn = this.queue.then(async () => {
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
            'User-Agent': 'BeesReader/1.0 (private local reader)',
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
        throw new ProviderError(
          `${this.name} is rate limited. Try again in ${delay} seconds.`,
          429,
          delay,
        );
      }
      if (response.headers.get('X-RateLimit-Remaining') === '0')
        this.cooldown = Date.now() + retryDelay(response.headers) * 1000;
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
      return schema.parse(await res.json());
    } catch {
      throw new ProviderError(
        `${this.name} returned an unexpected response. Please try again later.`,
      );
    }
  }
}
