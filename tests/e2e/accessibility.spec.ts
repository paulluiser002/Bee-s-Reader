import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fixtures, chapterId } from './fixtures';
for (const theme of ['light', 'dark'])
  for (const path of ['/', '/discover', '/settings', `/read/${chapterId}`])
    test(`accessible ${theme} mobile screen: ${path}`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
      await fixtures(page);
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible();
      if (path === '/settings')
        await expect(page.getByRole('button', { name: 'System', exact: true })).toBeEnabled();
      const report = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(report.violations).toEqual([]);
    });
