// Read-only, bounded research probes. This does not enable a provider in Bee's Reader.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { fetchImage } from '../src/lib/providers/media';

type Observation = {
  name: string;
  url: string;
  checkedAt: string;
  status?: number;
  contentType?: string | null;
  elapsedMs: number;
  headers?: Record<string, string>;
  outcome: 'pass' | 'unavailable' | 'no-images' | 'error';
  detail: unknown;
};
const observations: Observation[] = [];
const nextAt = new Map<string, number>();
const originCooldowns = new Map<string, number>();
const userAgent = 'BeesReader/1.0 (bounded provider research)';
const catalogTitle = z.object({ hid: z.string(), slug: z.string(), title: z.string() });
const chapter = z.object({ hid: z.string(), lang: z.string(), chap: z.string().nullable() });
const image = z.object({ h: z.number().positive(), w: z.number().positive(), b2key: z.string() });
const imageList = z.array(image);
// A successful HTTP response with an empty array is not a readable chapter.
assert.equal(imageList.parse([]).length, 0);
assert.equal(imageList.safeParse([{ b2key: 'missing-dimensions.jpg' }]).success, false);

async function json<T>(
  name: string,
  url: string,
  schema: z.ZodType<T>,
  summarize: (data: T) => unknown,
  extra: Record<string, string> = {},
): Promise<T | undefined> {
  const origin = new URL(url).origin;
  const wait = Math.max(0, (nextAt.get(origin) || 0) - Date.now());
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  nextAt.set(origin, Date.now() + 1100);
  const checkedAt = new Date().toISOString();
  const started = performance.now();
  let response: Response | undefined;
  try {
    if ((originCooldowns.get(origin) || 0) > Date.now())
      throw new Error('Skipped: upstream cooldown is still active.');
    response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': userAgent, ...extra },
      redirect: 'error',
      signal: AbortSignal.timeout(12000),
    });
    const headers: Record<string, string> = {};
    for (const key of [
      'cache-control',
      'retry-after',
      'x-ratelimit-limit',
      'x-ratelimit-remaining',
      'x-ratelimit-reset',
      'cf-mitigated',
    ]) {
      const value = response.headers.get(key);
      if (value) headers[key] = value;
    }
    if (response.status === 429 || response.status >= 500) {
      const retry = response.headers.get('retry-after');
      const seconds =
        retry && Number.isFinite(Number(retry))
          ? Number(retry)
          : retry
            ? (Date.parse(retry) - Date.now()) / 1000
            : 120;
      originCooldowns.set(origin, Date.now() + Math.max(1, seconds || 120) * 1000);
    }
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
      await response.body?.cancel();
      observations.push({
        name,
        url,
        checkedAt,
        status: response.status,
        contentType: response.headers.get('content-type'),
        elapsedMs: Math.round(performance.now() - started),
        headers,
        outcome: 'unavailable',
        detail: 'No successful JSON response; no retry or challenge bypass attempted.',
      });
      return;
    }
    const reader = response.body!.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 2 * 1024 * 1024) {
        await reader.cancel();
        throw new Error('Metadata response exceeded the 2 MB research bound.');
      }
      chunks.push(part.value);
    }
    const data = schema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    const noImages = name.includes('image metadata') && Array.isArray(data) && data.length === 0;
    observations.push({
      name,
      url,
      checkedAt,
      status: response.status,
      contentType: response.headers.get('content-type'),
      elapsedMs: Math.round(performance.now() - started),
      headers,
      outcome: noImages ? 'no-images' : 'pass',
      detail: summarize(data),
    });
    return data;
  } catch (error) {
    observations.push({
      name,
      url,
      checkedAt,
      status: response?.status,
      elapsedMs: Math.round(performance.now() - started),
      outcome: 'error',
      detail: error instanceof Error ? error.message : 'Unknown request failure',
    });
  }
}

const api = 'https://api.comick.dev';
const solo = await json(
  'Comick English-title search',
  `${api}/v1.0/search/?q=Solo%20Leveling&page=1&limit=3`,
  z.array(catalogTitle),
  (rows) => rows.map(({ title, slug, hid }) => ({ title, slug, hid })),
);
const selected = solo?.find((row) => row.title.toLowerCase() === 'solo leveling');
if (selected) {
  await json(
    'Comick Solo Leveling details',
    `${api}/v1.0/comic/${encodeURIComponent(selected.slug)}/`,
    z.object({ comic: catalogTitle, firstChap: chapter.nullish() }),
    (data) => ({ comic: data.comic, firstChapter: data.firstChap }),
  );
  const feed = await json(
    'Comick Solo Leveling English releases',
    `${api}/v1.0/comic/${selected.hid}/chapters?lang=en&page=1&limit=1`,
    z.object({ chapters: z.array(chapter), total: z.number() }),
    (data) => ({ releaseEntries: data.total, sample: data.chapters }),
  );
  const samples = new Set([
    feed?.chapters[0]?.hid,
    // Discovered from the provider's legacy detail firstChap, independent of current feed ordering.
    'P_ysNE3VbnLbwN',
  ]);
  for (const hid of samples)
    if (hid)
      await json(
        'Comick Solo Leveling image metadata',
        `${api}/chapter/${hid}/get_images`,
        imageList,
        (images) => ({ pages: images.length }),
      );
}
// Second control title: an English chapter returned by the provider's own detail response.
const control = await json(
  'Comick Yotsuba details',
  `${api}/v1.0/comic/yotsuba-to/`,
  z.object({ comic: catalogTitle, firstChap: chapter.nullish() }),
  (data) => ({ comic: data.comic, firstChapter: data.firstChap }),
);
if (control)
  await json(
    'Comick Yotsuba image metadata',
    `${api}/chapter/72QoB/get_images`,
    imageList,
    (images) => ({ pages: images.length }),
  );

// This sample was discovered through Comick's English has_images feed and inspected in its public reader.
const hostedId = 'LcG1AnYc';
const hosted = await json(
  'Comick hosted English chapter details',
  `${api}/chapter/${hostedId}/`,
  z.object({ chapter, canonical: z.string() }),
  (data) => ({ chapter: data.chapter, canonical: data.canonical }),
);
const hostedImages =
  hosted?.chapter.lang === 'en'
    ? await json(
        'Comick hosted English image metadata',
        `${api}/chapter/${hostedId}/get_images`,
        imageList,
        (images) => ({ pages: images.length, dimensions: images.map(({ w, h }) => ({ w, h })) }),
      )
    : undefined;
if (hostedImages?.length) {
  const first = hostedImages[0];
  // The same host/key mapping was observed on the provider's first-page img src, not guessed from a cover.
  assert.match(first.b2key, /^[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp)$/i);
  const url = `https://meo.comick.pictures/${first.b2key}`;
  const started = performance.now();
  try {
    const page = await fetchImage(url);
    assert.ok(page.buffer.length > 0);
    const { default: sharp } = await import('sharp');
    const decoded = await sharp(page.buffer).metadata();
    assert.equal(decoded.width, first.w);
    assert.equal(decoded.height, first.h);
    observations.push({
      name: 'Comick one-page image through secure server fetcher',
      url,
      checkedAt: new Date().toISOString(),
      elapsedMs: Math.round(performance.now() - started),
      outcome: 'pass',
      contentType: page.type,
      detail: {
        bytes: page.buffer.length,
        width: decoded.width,
        height: decoded.height,
        sha256: createHash('sha256').update(page.buffer).digest('hex'),
        retainedImageFile: false,
      },
    });
  } catch (error) {
    observations.push({
      name: 'Comick one-page image through secure server fetcher',
      url,
      checkedAt: new Date().toISOString(),
      elapsedMs: Math.round(performance.now() - started),
      outcome: 'error',
      detail: error instanceof Error ? error.message : 'Image verification failed',
    });
  }
}

for (const origin of ['https://api.coffeemanga.shop', 'https://api.mangapdf.org']) {
  const health = await json(
    'MangaPDF documented host health',
    `${origin}/healthz`,
    z.object({ status: z.string() }),
    (data) => data,
    { 'X-Client': 'api-consumer' },
  );
  if (health?.status === 'ok')
    await json(
      'MangaPDF documented search',
      `${origin}/api/v1/mihon/search?q=solo%20leveling&page=1`,
      z.object({
        items: z.array(z.object({ id: z.string(), title: z.string() })),
        has_next: z.boolean(),
      }),
      (data) => ({
        matches: data.items.map(({ id, title }) => ({ id, title })),
        hasNext: data.has_next,
      }),
      { 'X-Client': 'api-consumer' },
    );
}

await mkdir('docs/research', { recursive: true });
await writeFile(
  'docs/research/provider-probes-latest.json',
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      environment: 'Local Node.js on the developer network; not a Vercel deployment test.',
      policy:
        'Anonymous public GETs only; 1.1s origin pacing, 12s request timeout, 2 MB metadata cap. One public first-page image at most, decoded and discarded. No complete chapters, credentials, private library data, protected paid pages, challenge bypass, automatic retries or enabled app integrations. Empty image arrays are availability failures, not successful reading tests.',
      observations,
    },
    null,
    2,
  ) + '\n',
);
for (const row of observations)
  console.log(
    `${row.outcome.toUpperCase()} ${row.name}: ${row.status ?? ''} ${JSON.stringify(row.detail)}`,
  );
