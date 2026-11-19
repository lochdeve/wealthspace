import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function loginThroughUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/spaces');
  const logout = page.getByRole('button', { name: 'Cerrar sesión' });
  if (await logout.isVisible().catch(() => false)) {
    await logout.click();
    await expect(page).toHaveURL(/\/(login)?$/, { timeout: 15_000 });
  }
  await page.goto('/login');
  await expect(page.locator('#email')).toBeVisible({ timeout: 15_000 });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/spaces/, { timeout: 15_000 });
}
