import { test, expect } from '@playwright/test';
import { readProfile, fixtures, chapterId, mangaId } from './fixtures';
test('progress reaches history immediately through client navigation', async ({ page }) => {
  await fixtures(page);
  await page.goto(`/read/${chapterId}`);
  await expect(page.getByAltText('Page 1')).toBeVisible();
  await page.getByRole('link', { name: 'Back to title' }).click();
  await page
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'History', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Fixture Adventure' })).toBeVisible();
});
test('settings hydrates without changing its initial theme controls', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await fixtures(page);
  await page.goto('/settings');
  await expect(page.getByRole('button', { name: 'System', exact: true })).toBeEnabled();
  expect(errors).toEqual([]);
});

test('clamps progress when a chapter has fewer pages than the saved history', async ({ page }) => {
  await fixtures(page, {
    history: [
      {
        mangaId,
        chapterId,
        pageIndex: 5,
        scrollFraction: 0.4,
        completed: false,
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ],
  });
  await page.goto(`/read/${chapterId}`);
  await expect(page.getByAltText('Page 3')).toBeVisible();
  await expect.poll(async () => (await readProfile(page)).history[0].pageIndex).toBe(2);
});
