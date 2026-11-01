// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProviderError } from '@/lib/providers/http';

const provider = vi.hoisted(() => ({ getFeed: vi.fn() }));
vi.mock('@/lib/providers/mangadex', () => ({ getFeed: provider.getFeed }));
import { GET } from '@/app/api/manga/[id]/availability/route';

const id = '00000000-0000-4000-8000-000000000001';
const context = (value = id) => ({ params: Promise.resolve({ id: value }) });
const request = (query = '') =>
  new Request(`http://localhost/api/manga/${id}/availability${query}`);

beforeEach(() => {
  provider.getFeed.mockReset();
});

describe('chapter availability route', () => {
  it('reports readable when a permitted chapter appears in the checked language', async () => {
    provider.getFeed.mockResolvedValue({ data: [{ id: 'chapter' }], total: 40 });
    const response = await GET(request('?language=en'), context());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'readable', readableChapters: 1 });
    expect(provider.getFeed).toHaveBeenCalledWith(id, 'en', 0, 100);
  });

  it('reports unavailable after checking the complete first page', async () => {
    provider.getFeed.mockResolvedValue({ data: [], total: 100 });
    const response = await GET(request('?language=es'), context());
    expect(await response.json()).toEqual({ status: 'unavailable', readableChapters: 0 });
    expect(provider.getFeed).toHaveBeenCalledWith(id, 'es', 0, 100);
  });

  it('leaves availability unknown if unreadable releases can hide later readable chapters', async () => {
    provider.getFeed.mockResolvedValue({ data: [], total: 101 });
    const response = await GET(request(), context());
    expect(await response.json()).toEqual({ status: 'unknown', readableChapters: 0 });
  });

  it('rejects invalid identifiers, languages and unexpected query parameters', async () => {
    expect((await GET(request(), context('invalid'))).status).toBe(400);
    expect((await GET(request('?language=xx'), context())).status).toBe(400);
    expect((await GET(request('?url=https://example.com'), context())).status).toBe(400);
    expect(provider.getFeed).not.toHaveBeenCalled();
  });

  it('preserves upstream rate-limit errors rather than presenting them as missing chapters', async () => {
    provider.getFeed.mockRejectedValue(new ProviderError('Please wait.', 429, 9));
    const response = await GET(request(), context());
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('9');
    const body = await response.json();
    expect(body.error).toBe('Please wait.');
    expect(body.retryAfter).toBe(9);
  });
});
