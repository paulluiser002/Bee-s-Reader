// @vitest-environment node
import { it, expect } from 'vitest';
import { imageLimiter } from '@/lib/providers/image-slots';
it('reserves a slot before async DNS and queues excess images within a bound', async () => {
  const limiter = imageLimiter(2, 2);
  const a = await limiter();
  const b = await limiter();
  let thirdStarted = false;
  const third = limiter().then((release) => {
    thirdStarted = true;
    return release;
  });
  await Promise.resolve();
  expect(thirdStarted).toBe(false);
  const fourth = limiter();
  await expect(limiter()).rejects.toThrow('queue');
  a();
  const c = await third;
  expect(thirdStarted).toBe(true);
  b();
  const d = await fourth;
  c();
  d();
  const next = await limiter();
  next();
});
