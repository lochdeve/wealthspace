import { test, expect } from '@playwright/test';

test('home page displays Wealthspace', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Wealthspace' })).toBeVisible();
});
