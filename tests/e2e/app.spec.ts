import { test, expect } from '@playwright/test';
import { readProfile, fixtures, mangaId, chapterId, nextId } from './fixtures';
for (const width of [320, 375, 390, 430, 768, 1280])
  test(`all screens fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await fixtures(page);
    for (const path of [
      '/',
      '/discover',
      '/library',
      '/history',
      '/settings',
      '/about',
      `/manga/${mangaId}`,
      `/read/${chapterId}`,
    ]) {
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    }
  });
test('theme persists across reload and supports system mode', async ({ page }) => {
  await fixtures(page);
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/light/);
  await page.getByRole('button', { name: 'System', exact: true }).click();
  await expect(page.getByRole('button', { name: 'System', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
test('search, filters, empty and error states work', async ({ page }) => {
  await fixtures(page);
  await page.goto('/discover');
  await page.getByRole('searchbox').fill('empty');
  await expect(page.getByText('No stories found.')).toBeVisible();
  await page.getByRole('searchbox').fill('error');
  await expect(page.getByRole('alert').filter({ hasText: 'rate limited' })).toContainText(
    'rate limited',
  );
  await page.getByRole('searchbox').fill('Fixture');
  await expect(page.getByRole('heading', { name: 'Fixture Adventure' })).toBeVisible();
  await page.getByRole('button', { name: 'Manhwa', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Manhwa', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Filters' }).click();
  await expect(page.getByLabel('Reading language', { exact: true })).toBeVisible();
});
test('bookmarks survive refresh and appear in the library', async ({ page }) => {
  await fixtures(page);
  await page.goto(`/manga/${mangaId}`);
  await page.getByRole('button', { name: 'Save to library' }).click();
  await expect(page.getByRole('button', { name: 'Remove from library' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Remove from library' })).toBeVisible();
  await page.goto('/library');
  await expect(page.getByRole('heading', { name: 'Fixture Adventure' })).toBeVisible();
});
test('reader uses ordered data-saver pages without distortion or gaps and switches quality', async ({
  page,
}) => {
  const { imageRequests } = await fixtures(page);
  await page.goto(`/read/${chapterId}`);
  await expect(page.getByAltText('Page 1')).toBeVisible();
  await expect.poll(() => imageRequests.length).toBeGreaterThan(0);
  expect(imageRequests[0]).toContain('quality=data-saver');
  await expect
    .poll(() => page.getByAltText('Page 1').evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBe(800);
  const dimensions = await page.getByAltText('Page 1').evaluate((el: HTMLImageElement) => ({
    width: el.clientWidth,
    height: el.clientHeight,
    column: el.parentElement!.parentElement!.clientWidth,
  }));
  expect(dimensions.width).toBe(dimensions.column);
  expect(dimensions.height / dimensions.width).toBeCloseTo(1.5, 1);
  await page.getByAltText('Page 2').scrollIntoViewIfNeeded();
  await expect
    .poll(() => page.getByAltText('Page 2').evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBe(800);
  const gap = await page.evaluate(
    () =>
      document.querySelector('[alt="Page 2"]')!.getBoundingClientRect().top -
      document.querySelector('[alt="Page 1"]')!.getBoundingClientRect().bottom,
  );
  expect(Math.abs(gap)).toBeLessThan(1);
  await page.getByRole('button', { name: 'Show reader controls' }).click();
  await page.getByRole('button', { name: 'Reader appearance' }).click();
  await page.getByLabel('Image quality', { exact: true }).selectOption('original');
  await expect.poll(() => imageRequests.some((url) => url.includes('quality=original'))).toBe(true);
});
test('failed images require retry and cannot auto-complete a chapter', async ({ page }) => {
  await fixtures(page, { failedPage: 1 });
  await page.goto(`/read/${chapterId}`);
  await expect(page.getByText('Page 2 couldn’t load.')).toBeVisible();
  await page.mouse.wheel(0, 4000);
  await expect.poll(async () => (await readProfile(page)).history.length).toBeGreaterThan(0);
  expect((await readProfile(page)).history.some((p) => p.completed)).toBe(false);
  expect(page.url()).toContain(chapterId);
  await page.getByRole('button', { name: 'Retry page', exact: true }).click();
  await expect(page.getByAltText('Page 2')).toBeVisible();
});
test('auto-next waits for intentional scrolling, supports cancel and saves completion', async ({
  page,
}) => {
  await fixtures(page);
  await page.goto(`/read/${chapterId}`);
  await expect(page.getByAltText('Page 1')).toBeVisible();
  expect(page.url()).toContain(chapterId);
  await page.mouse.wheel(0, 5000);
  await expect
    .poll(() => page.getByAltText('Page 3').evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBe(800);
  await page.mouse.wheel(0, 5000);
  await expect(page.getByRole('button', { name: 'Cancel auto-next' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel auto-next' }).click();
  await expect(page.getByRole('button', { name: 'Cancel auto-next' })).toBeHidden();
  await expect
    .poll(async () => (await readProfile(page)).history.some((p) => p.completed))
    .toBe(true);
  expect(page.url()).toContain(chapterId);
});
test('auto-next advances to the confirmed next chapter once', async ({ page }) => {
  await fixtures(page);
  await page.goto(`/read/${chapterId}`);
  await expect(page.getByAltText('Page 1')).toBeVisible();
  await page.mouse.wheel(0, 5000);
  await expect
    .poll(() => page.getByAltText('Page 3').evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBe(800);
  await page.mouse.wheel(0, 5000);
  await expect(page).toHaveURL(new RegExp(nextId), { timeout: 12000 });
  await expect(page.getByRole('heading', { name: 'Chapter 2', exact: true })).toBeVisible();
});
test('restores the saved page after reload', async ({ page }) => {
  await fixtures(page, {
    history: [
      {
        mangaId,
        chapterId,
        pageIndex: 1,
        scrollFraction: 0.4,
        completed: false,
        updatedAt: new Date().toISOString(),
      },
    ],
  });
  await page.goto(`/read/${chapterId}`);
  await expect(page.getByAltText('Page 2')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);
  await expect.poll(async () => (await readProfile(page)).history[0]?.pageIndex).toBe(1);
  await page.reload();
  await expect(page.getByAltText('Page 2')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);
});
test('clearing history requires confirmation and keeps bookmarks', async ({ page }) => {
  await fixtures(page);
  await page.goto(`/manga/${mangaId}`);
  await page.getByRole('button', { name: 'Save to library' }).click();
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Clear reading history' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep history' }).click();
  await expect(page.getByRole('group', { name: 'Clear reading history' })).toBeHidden();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await page.getByRole('button', { name: 'Clear history', exact: true }).click();
  expect((await readProfile(page)).bookmarks).toHaveLength(1);
});
test('image route rejects arbitrary URLs before contacting upstream', async ({ request }) => {
  const response = await request.get(`/api/reader/${chapterId}/images/0?url=http://127.0.0.1`);
  expect(response.status()).toBe(400);
  const bad = await request.get('/api/reader/not-a-uuid/images/0');
  expect(bad.status()).toBe(400);
});
