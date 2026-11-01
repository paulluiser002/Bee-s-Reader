import { expect, test } from '@playwright/test';
import { chapter, fixtures, mangaId } from './fixtures';

test('discover checks the selected language on demand and distinguishes unavailable from upstream errors', async ({
  page,
}) => {
  await fixtures(page);
  let checks = 0;
  await page.route(/\/api\/manga\/[^/]+\/availability\?/, async (route) => {
    checks++;
    const language = new URL(route.request().url()).searchParams.get('language');
    if (language === 'es')
      return route.fulfill({ json: { status: 'readable', readableChapters: 1 } });
    if (checks === 1)
      return route.fulfill({ json: { status: 'unavailable', readableChapters: 0 } });
    return route.fulfill({ status: 503, json: { error: 'Temporarily unavailable' } });
  });
  await page.goto('/discover');
  await expect(page.getByRole('heading', { name: 'Fixture Adventure' })).toBeVisible();
  expect(checks).toBe(0);
  await page
    .getByRole('button', { name: 'Check English availability for Fixture Adventure' })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'No hosted English chapters found' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Check English availability for Fixture Adventure' })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Availability could not be confirmed' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Filters' }).click();
  await page.getByLabel('Reading language').selectOption('es');
  await page
    .getByRole('button', { name: 'Check Spanish availability for Fixture Adventure' })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Hosted Spanish chapters found' }),
  ).toBeVisible();
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
