import { describe, it, expect } from 'vitest';
import { isPublicAddress, validateBaseUrl, buildPageUrl } from '@/lib/providers/media';
describe('image trust boundary', () => {
  it.each([
    '127.0.0.1',
    '0.0.0.0',
    '10.0.0.1',
    '192.168.2.1',
    '169.254.169.254',
    '100.64.0.1',
    '224.0.0.1',
    '::1',
    'fc00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '2001:db8::1',
  ])('rejects nonpublic address %s', (ip) => expect(isPublicAddress(ip)).toBe(false));
  it('accepts globally routable IPs', () => {
    expect(isPublicAddress('1.1.1.1')).toBe(true);
    expect(isPublicAddress('2606:4700:4700::1111')).toBe(true);
  });
  it.each([
    'http://example.com',
    'https://user:pass@example.com',
    'https://127.0.0.1',
    'https://localhost',
    'https://x.invalid/?url=http://localhost',
    'https://example.com/#hash',
  ])('rejects unsafe assignment %s', (url) => expect(() => validateBaseUrl(url)).toThrow());
  it('supports dynamic HTTPS hosts, ports and path prefixes returned by MangaDex', () => {
    const url = buildPageUrl(
      'https://dynamic.example.org:443/token',
      'data-saver',
      'a'.repeat(32),
      '1-page.jpg',
    );
    expect(url).toBe(
      'https://dynamic.example.org:443/token/data-saver/' + 'a'.repeat(32) + '/1-page.jpg',
    );
  });
  it('rejects path traversal and caller-controlled image filenames', () => {
    expect(() =>
      buildPageUrl('https://example.org', 'data-saver', 'a'.repeat(32), '../private'),
    ).toThrow();
    expect(() => buildPageUrl('https://example.org', 'data-saver', '../', 'page.jpg')).toThrow();
  });
});
