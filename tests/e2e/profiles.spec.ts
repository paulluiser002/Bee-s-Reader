import { test, expect } from '@playwright/test';
import { fixtures, mangaId, chapterId, readProfile } from './fixtures';

test('different browser contexts have private profiles and reopening a tab retains the library', async ({
  browser,
  context,
  page,
}) => {
  await fixtures(page);
  await page.goto(`/manga/${mangaId}`);
  await page.getByRole('button', { name: 'Save to library' }).click();
  const other = await browser.newContext();
  const outsider = await other.newPage();
  await fixtures(outsider);
  await outsider.goto(`/manga/${mangaId}`);
  await expect(outsider.getByRole('button', { name: 'Save to library' })).toBeVisible();
  await page.close();
  const reopened = await context.newPage();
  await fixtures(reopened);
  await reopened.goto(`/manga/${mangaId}`);
  await expect(reopened.getByRole('button', { name: 'Remove from library' })).toBeVisible();
  await other.close();
});

test('two open tabs reflect bookmark changes through browser storage events', async ({
  page,
  context,
}) => {
  await fixtures(page);
  await page.goto(`/manga/${mangaId}`);
  const second = await context.newPage();
  await fixtures(second);
  await second.goto(`/manga/${mangaId}`);
  await page.getByRole('button', { name: 'Save to library' }).click();
  await expect(second.getByRole('button', { name: 'Remove from library' })).toBeVisible();
  await second.getByRole('button', { name: 'Remove from library' }).click();
  await expect(page.getByRole('button', { name: 'Save to library' })).toBeVisible();
});

test('exported profile can be imported in another browser context', async ({ page, browser }) => {
  await fixtures(page, {
    history: [
      {
        mangaId,
        chapterId,
        pageIndex: 1,
        scrollFraction: 0.4,
        completed: true,
        recordedAt: 2000,
        updatedAt: new Date(2000).toISOString(),
      },
    ],
  });
  await page.goto(`/manga/${mangaId}`);
  await page.getByRole('button', { name: 'Save to library' }).click();
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export profile' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  const other = await browser.newContext();
  const target = await other.newPage();
  await fixtures(target);
  await target.goto('/settings');
  await target.getByLabel('Import profile backup').setInputFiles(path!);
  await expect(target.getByText('Profile imported.', { exact: false })).toBeVisible();
  expect((await readProfile(target)).bookmarks).toHaveLength(1);
  expect((await readProfile(target)).history[0]).toMatchObject({
    chapterId,
    pageIndex: 1,
    completed: true,
    recordedAt: 2000,
  });
  await expect(target.locator('html')).toHaveClass(/dark/);
  await other.close();
});

test('native fullscreen has an accessible exit control', async ({ page }) => {
  await fixtures(page);
  await page.goto(`/read/${chapterId}`);
  await expect(page.getByAltText('Page 1')).toBeVisible();
  await page.getByRole('button', { name: 'Enter fullscreen', exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.getByRole('button', { name: 'Leave fullscreen', exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
});

test('unsupported fullscreen offers focus mode and installation guidance', async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(document, 'fullscreenEnabled', { value: false }),
  );
  await fixtures(page);
  await page.goto(`/read/${chapterId}`);
  await expect(page.getByAltText('Page 1')).toBeVisible();
  await page.getByRole('button', { name: 'Enter fullscreen', exact: true }).click();
  await expect(
    page.getByText('This browser does not support page fullscreen.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Leave focus mode', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Enter fullscreen', exact: true })).toBeVisible();
});
