import 'server-only';
import { lookup } from 'node:dns/promises';
import { isIP, type LookupFunction } from 'node:net';
import ipaddr from 'ipaddr.js';
import { Agent, fetch as secureFetch } from 'undici';
import { ProviderError } from './http';
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
export async function fetchImage(urlString: string, report = false, deferReport?: ReportScheduler) {
  const release = await acquireImage();
  try {
    return await retrieveImage(urlString, report, deferReport);
  } finally {
    release();
  }
}
async function retrieveImage(urlString: string, report = false, deferReport?: ReportScheduler) {
  const url = validateBaseUrl(urlString);
  if (imageCooldown > Date.now())
    throw new ProviderError(
      'Image server is rate limited. Try again later.',
      429,
      Math.ceil((imageCooldown - Date.now()) / 1000),
    );
  // Validate every DNS answer, then pin the chosen public address to the actual connection.
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host)
    ? [{ address: host, family: isIP(host) }]
    : await lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
    throw new ProviderError('Image server did not resolve to a public address.');
  const chosen = addresses.find((a) => a.family === 4) || addresses[0];
  const dispatcher = new Agent({ connect: { lookup: pinnedLookup(chosen) } });
  const start = performance.now();
  let bytes = 0;
  let success = false;
  let cached = false;
  try {
    const response = await secureFetch(urlString, {
      dispatcher,
      redirect: 'manual',
      headers: {
        'User-Agent': 'BeesReader/1.0 (private local reader)',
        Accept: 'image/avif,image/webp,image/*',
      },
      signal: AbortSignal.timeout(30000),
    });
    if (response.status === 429) {
      await response.body?.cancel();
      const value = Number(response.headers.get('Retry-After'));
      const seconds = Number.isFinite(value) && value > 0 ? value : 60;
      imageCooldown = Date.now() + seconds * 1000;
      throw new ProviderError('Image server is rate limited.', 429, seconds);
    }
    if (!response.ok || response.status >= 300) {
      await response.body?.cancel();
      throw new ProviderError(
        `Image server returned ${response.status}. Retry this page.`,
        response.status === 403 ? 403 : 502,
      );
    }
    const type = response.headers.get('content-type')?.split(';')[0] || '';
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(type)) {
      await response.body?.cancel();
      throw new ProviderError('Image server returned an unsupported file.');
    }
    cached = (response.headers.get('x-cache') || '').startsWith('HIT');
    const reader = response.body?.getReader();
    if (!reader) throw new ProviderError('Image server returned no image.');
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 25 * 1024 * 1024) {
        await reader.cancel();
        throw new ProviderError('This page exceeds the 25 MB safety limit.');
      }
      chunks.push(value);
    }
    const buffer = Buffer.concat(chunks);
    success = buffer.length > 0;
    if (!success) throw new ProviderError('Image server returned an empty page.');
    return { buffer, type };
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    throw new ProviderError('Image server could not be reached. Retry this page.', 503);
  } finally {
    const duration = Math.round(performance.now() - start);
    await dispatcher.close();
    if (report && !(url.hostname === 'mangadex.org' || url.hostname.endsWith('.mangadex.org'))) {
      // Report complete retrieval duration and bytes, including failures, as required by MangaDex@Home.
      const sendReport = async () => {
        try {
          await fetch('https://api.mangadex.network/report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'BeesReader/1.0' },
            body: JSON.stringify({
              url: urlString,
              success,
              cached,
              bytes,
              duration,
            }),
            redirect: 'error',
            signal: AbortSignal.timeout(5000),
          });
        } catch {
          console.warn('MangaDex@Home health report could not be delivered.');
        }
      };
      if (deferReport) deferReport(sendReport);
      else await sendReport();
    }
  }
}
