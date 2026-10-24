import 'server-only';
import { lookup } from 'node:dns/promises';
import { isIP, type LookupFunction } from 'node:net';
import ipaddr from 'ipaddr.js';
import { Agent, fetch as secureFetch } from 'undici';
import { ProviderError, retryDelay } from './http';
import { imageBody, type TransferResult } from './media-stream';
import { imageLimiter } from './image-slots';
export function isPublicAddress(ip: string) {
  try {
    const parsed = ipaddr.process(ip);
    return (
      parsed.range() === 'unicast' &&
      (parsed.kind() === 'ipv4' || parsed.match(ipaddr.parse('2000::'), 3))
    );
  } catch {
    return false;
  }
}
export function validateBaseUrl(base: string) {
  const url = new URL(base);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.hostname === 'localhost' ||
    url.hostname.endsWith('.localhost') ||
    (isIP(url.hostname.replace(/^\[|\]$/g, '')) &&
      !isPublicAddress(url.hostname.replace(/^\[|\]$/g, '')))
  )
    throw new ProviderError('Unsafe image server assignment.', 502);
  return url;
}
export function buildPageUrl(
  base: string,
  quality: 'data-saver' | 'data',
  hash: string,
  filename: string,
) {
  validateBaseUrl(base);
  if (
    !/^[a-f0-9]{32,64}$/i.test(hash) ||
    !/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/i.test(filename)
  )
    throw new ProviderError('Invalid image metadata.');
  return `${base.replace(/\/$/, '')}/${quality}/${hash}/${filename}`;
}
export function pinnedLookup(chosen: { address: string; family: number }): LookupFunction {
  return (_host, options, callback) => {
    if (options.all) callback(null, [chosen]);
    else callback(null, chosen.address, chosen.family);
  };
}
const acquireImage = imageLimiter(6, 32);
let imageCooldown = 0;
type ReportScheduler = (job: () => Promise<void>) => void;
export async function streamImage(
  urlString: string,
  report = false,
  deferReport?: ReportScheduler,
) {
  const url = validateBaseUrl(urlString);
  const release = await acquireImage();
  let dispatcher: Agent | undefined;
  let upstream: Awaited<ReturnType<typeof secureFetch>> | undefined;
  const start = performance.now();
  const close = async () => {
    try {
      await dispatcher?.close();
    } finally {
      release();
    }
  };
  const sendReport = async (result: TransferResult) => {
    if (!report || url.hostname === 'mangadex.org' || url.hostname.endsWith('.mangadex.org'))
      return;
    try {
      await fetch('https://api.mangadex.network/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'BeesReader/1.0' },
        body: JSON.stringify({
          url: urlString,
          ...result,
          cached: (upstream?.headers.get('x-cache') || '').startsWith('HIT'),
        }),
        redirect: 'error',
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      console.warn('MangaDex@Home health report could not be delivered.');
    }
  };
  try {
    if (imageCooldown > Date.now())
      throw new ProviderError(
        'Image server is rate limited. Try again later.',
        429,
        Math.ceil((imageCooldown - Date.now()) / 1000),
      );
    const host = url.hostname.replace(/^\[|\]$/g, '');
    const addresses = isIP(host)
      ? [{ address: host, family: isIP(host) }]
      : await lookup(host, { all: true, verbatim: true });
    if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
      throw new ProviderError('Image server did not resolve to a public address.');
    const chosen = addresses.find((a) => a.family === 4) || addresses[0];
    dispatcher = new Agent({ connect: { lookup: pinnedLookup(chosen) } });
    upstream = await secureFetch(urlString, {
      dispatcher,
      redirect: 'manual',
      headers: {
        'User-Agent': 'BeesReader/1.0 (browser-profile reader)',
        Accept: 'image/avif,image/webp,image/*',
      },
      signal: AbortSignal.timeout(30000),
    });
    if (upstream.status === 429) {
      const seconds = retryDelay(upstream.headers);
      imageCooldown = Date.now() + seconds * 1000;
      throw new ProviderError('Image server is rate limited.', 429, seconds);
    }
    if (!upstream.ok || upstream.status >= 300)
      throw new ProviderError(
        `Image server returned ${upstream.status}. Retry this page.`,
        upstream.status === 403 ? 403 : 502,
      );
    const type = upstream.headers.get('content-type')?.split(';')[0] || '';
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(type))
      throw new ProviderError('Image server returned an unsupported file.');
    if (!upstream.body) throw new ProviderError('Image server returned no image.');
    const transfer = imageBody(upstream.body, close, 25 * 1024 * 1024, start);
    const reportTransfer = async () => sendReport(await transfer.finished);
    if (deferReport) deferReport(reportTransfer);
    return { ...transfer, type, report: reportTransfer };
  } catch (error) {
    try {
      await upstream?.body?.cancel();
    } catch {
      /* Preserve the original error. */
    }
    await close();
    const job = () =>
      sendReport({ success: false, bytes: 0, duration: Math.round(performance.now() - start) });
    if (deferReport) deferReport(job);
    else await job();
    if (error instanceof ProviderError) throw error;
    throw new ProviderError('Image server could not be reached. Retry this page.', 503);
  }
}
// Only the explicit live-check CLI buffers a single page; web routes return the stream directly.
export async function fetchImage(url: string, report = false) {
  const image = await streamImage(url, report);
  const buffer = Buffer.from(await new Response(image.body).arrayBuffer());
  await image.report();
  return { buffer, type: image.type };
}
