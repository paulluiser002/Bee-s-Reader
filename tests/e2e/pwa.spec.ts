import { test, expect } from '@playwright/test';
test('production PWA exposes valid manifest, icons, safe cache and offline fallback', async ({
  page,
  context,
  request,
}) => {
  const manifestResponse = await request.get('/manifest.webmanifest');
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('/');
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');
  }
  const worker = await request.get('/sw.js');
  expect(worker.headers()['cache-control']).toContain('no-store');
  await page.goto('/settings');
  await expect(page.getByRole('button', { name: 'Install Bee’s Reader' })).toBeVisible();
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const cached = await page.evaluate(async () => {
    const keys = await caches.keys();
    const urls = [];
    for (const key of keys) {
      const cache = await caches.open(key);
      urls.push(...(await cache.keys()).map((r) => new URL(r.url).pathname));
    }
    return urls;
  });
  expect(cached.sort()).toEqual(
    [
      '/icons/apple-touch-icon.png',
      '/icons/icon-192.png',
      '/icons/icon-512.png',
      '/offline.html',
    ].sort(),
  );
  await context.setOffline(true);
  await page.goto('/library');
  await expect(page.getByRole('heading', { name: 'Your nook is still here.' })).toBeVisible();
  await expect
    .poll(() => page.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBe(192);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('bees-reader:v2:preferences')!).theme,
    ),
  ).toBe('dark');
  await context.setOffline(false);
  await page.goto('/settings');
  await expect(page.locator('html')).toHaveClass(/dark/);
});
