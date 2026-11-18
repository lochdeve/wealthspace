import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function loginThroughUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/spaces/, { timeout: 15_000 });
}