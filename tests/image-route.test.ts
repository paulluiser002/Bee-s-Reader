// @vitest-environment node
import { it, expect, vi } from 'vitest';
const m = vi.hoisted(() => ({
  report: vi.fn(async () => {}),
  jobs: [] as (() => Promise<void>)[],
  urls: [] as string[],
}));
vi.mock('next/server', async (original) => ({
  ...(await original<typeof import('next/server')>()),
  after: (job: () => Promise<void>) => m.jobs.push(job),
}));
vi.mock('@/lib/providers/mangadex', () => ({
  getChapter: async () => ({}),
  getAtHome: async () => ({
    baseUrl: 'https://public.example.org',
    chapter: { hash: 'a'.repeat(32), data: ['1-original.png'], dataSaver: ['1-small.jpg'] },
  }),
}));
vi.mock('@/lib/providers/media', async (original) => ({
  ...(await original<typeof import('@/lib/providers/media')>()),
  streamImage: async (url: string, _report: boolean, defer?: (job: () => Promise<void>) => void) => {
    m.urls.push(url);
    if (defer) defer(m.report);
    else await m.report();
    return {body:new ReadableStream({start(c){c.enqueue(new Uint8Array([1,2,3]));c.close();}}),type:'image/jpeg'};
  },
}));
import { GET } from '@/app/api/reader/[id]/images/[page]/route';
it('sends image bytes before health reporting and maps both authorized quality paths', async () => {
  const id = '00000000-0000-4000-8000-000000000001';
  for (const quality of ['data-saver', 'original']) {
    const r = await GET(
      new Request(`http://localhost/api/reader/${id}/images/0?quality=${quality}`),
      { params: Promise.resolve({ id, page: '0' }) },
    );
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('image/jpeg');
  }
  expect(m.report).not.toHaveBeenCalled();
  expect(m.jobs).toHaveLength(2);
  expect(m.urls[0]).toContain('/data-saver/');
  expect(m.urls[1]).toContain('/data/');
  await m.jobs[0]();
  expect(m.report).toHaveBeenCalledOnce();
});
