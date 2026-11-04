import { expect, test } from '@playwright/test';
import { chapter, fixtures, mangaId } from './fixtures';

test('Home and Discover browse in English by default without per-title check buttons', async ({
  page,
}) => {
  await fixtures(page);
  await page.goto('/settings');
  await page.getByLabel('Default reading language').selectOption('ja');

  for (const path of ['/', '/discover']) {
    const request = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return url.pathname === '/api/manga' && url.searchParams.get('language') === 'en';
    });
    await page.goto(path);
    await request;
    await expect(page.getByRole('heading', { name: 'Fixture Adventure' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /check .* availability/i })).toHaveCount(0);
  }

  await page.getByRole('button', { name: 'Filters' }).click();
  const spanishRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname === '/api/manga' && url.searchParams.get('language') === 'es';
  });
  await page.getByLabel('Reading language').selectOption('es');
  await spanishRequest;
});

test('a filtered-out chapter page does not claim the entire language is unavailable', async ({
  page,
}) => {
  await fixtures(page);
  await page.route(/\/api\/manga\/[^/]+\/chapters\?/, async (route) => {
    const offset = new URL(route.request().url()).searchParams.get('offset');
    await route.fulfill({
      json: offset === '100' ? { data: [chapter], total: 101 } : { data: [], total: 101 },
    });
  });
  await page.goto(`/manga/${mangaId}`);
  await expect(
    page.getByText('No readable chapters on this page.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('link', { name: /The test chapter/ })).toBeVisible();
});

test('detail language selector supports languages available in reading preferences', async ({
  page,
}) => {
  await fixtures(page);
  await page.goto('/settings');
  await page.getByLabel('Default reading language').selectOption('ja');
  await page.goto(`/manga/${mangaId}`);
  await expect(page.getByLabel('Chapter language')).toHaveValue('ja');
  await page.getByLabel('Chapter language').selectOption('ko');
  await expect(page.getByLabel('Chapter language')).toHaveValue('ko');
});

test('a reader can verify an English title, open a chapter, and resume from Home', async ({
  page,
}) => {
  await fixtures(page);
  await page.goto('/discover');
  const confirmed = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname === '/api/manga' && url.searchParams.get('hosted') === '1';
  });
  await page.getByRole('button', { name: 'Readable chapters only' }).click();
  await confirmed;
  await expect(page.getByText('1 confirmed in this selection')).toBeVisible();
  await page.getByRole('link', { name: /Fixture Adventure/ }).click();
  await expect(page.getByLabel('Chapter language')).toHaveValue('en');
  await page.getByRole('link', { name: 'Start reading' }).click();
  await expect(page.getByRole('heading', { name: 'Chapter 1', exact: true })).toBeVisible();
  await expect(page.getByAltText('Page 1')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => Object.keys(localStorage).some((key) => key.includes(':progress:'))),
    )
    .toBe(true);
  await page.goto('/');
  const resume = page.locator('.continue-card').first();
  await expect(resume).toContainText('Chapter 1');
  await resume.click();
  await expect(page.getByRole('heading', { name: 'Chapter 1', exact: true })).toBeVisible();
});
