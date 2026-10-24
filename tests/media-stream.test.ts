// @vitest-environment node
import { it, expect, vi } from 'vitest';
import { imageBody } from '@/lib/providers/media-stream';
it('streams a page larger than 4.5MB without collecting it, with backpressure and final metrics', async () => {
  let produced = 0;
  const chunk = new Uint8Array(1024 * 1024);
  const source = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        produced++;
        if (produced <= 6) controller.enqueue(chunk);
        else controller.close();
      },
    },
    { highWaterMark: 0 },
  );
  const cleanup = vi.fn(async () => {});
  const image = imageBody(source, cleanup, 25 * 1024 * 1024);
  expect(produced).toBe(0);
  const reader = image.body.getReader();
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
  }
  expect(bytes).toBe(6 * 1024 * 1024);
  expect(await image.finished).toMatchObject({ success: true, bytes });
  expect(cleanup).toHaveBeenCalledOnce();
});
it('cancels upstream and reports failure if the browser leaves', async () => {
  const cancel = vi.fn();
  const source = new ReadableStream<Uint8Array>({
    pull(c) {
      c.enqueue(new Uint8Array([1, 2]));
    },
    cancel,
  });
  const cleanup = vi.fn(async () => {});
  const image = imageBody(source, cleanup, 10);
  const reader = image.body.getReader();
  await reader.read();
  await reader.cancel();
  expect(cancel).toHaveBeenCalledOnce();
  expect(await image.finished).toMatchObject({ success: false, bytes: 2 });
  expect(cleanup).toHaveBeenCalledOnce();
});
it('enforces the page size limit while streaming and cleans up on failure', async () => {
  const source = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(new Uint8Array(20));
      c.close();
    },
  });
  const image = imageBody(source, async () => {}, 10);
  await expect(new Response(image.body).arrayBuffer()).rejects.toThrow(/limit/i);
  expect(await image.finished).toMatchObject({ success: false });
});
it('includes time spent connecting and waiting for upstream response headers', async () => {
  const source = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(new Uint8Array([1]));
      c.close();
    },
  });
  const image = imageBody(source, async () => {}, 10, performance.now() - 5000);
  await new Response(image.body).arrayBuffer();
  expect((await image.finished).duration).toBeGreaterThanOrEqual(5000);
});
