import { test, expect } from '@playwright/test';
import {
  assertE2EApiReady,
  seedTwoMemberSharedSpace,
  type TwoMemberSharedSeed,
} from './helpers/api';
import { loginThroughUi } from './helpers/ui';

let seed: TwoMemberSharedSeed | undefined;

test.describe('Phase 8: P-02 and P-07 personal cash links', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    try {
      await assertE2EApiReady();
      seed = await seedTwoMemberSharedSpace();
    } catch (error) {
      seed = undefined;
      console.warn('[e2e] Skipping phase 8 flow — API seed failed:', error);
    }
  });

  test.beforeEach(({ page: _page }, testInfo) => {
    if (!seed) {
      testInfo.skip(true, 'API seed unavailable');
    }
  });

  test('payer links shared expense to personal account on create', async ({ page }) => {
    const ctx = seed!;
    await loginThroughUi(page, ctx.owner.email, ctx.owner.password);
    await page.goto(`/spaces/${ctx.spaceId}/expenses/new`);
    await page.locator('#shared-amount').fill('100');
    await page.locator('#shared-personal-account').selectOption(ctx.owner.personalAccountId);
    await page.getByRole('button', { name: 'Registrar gasto compartido' }).click();
    await expect(page).toHaveURL(new RegExp(`/spaces/${ctx.spaceId}/expenses/[\\w-]+$`), {
      timeout: 15_000,
    });
  });

  test('personal transactions show cross-space summary link', async ({ page }) => {
    const ctx = seed!;
    await loginThroughUi(page, ctx.owner.email, ctx.owner.password);
    await page.goto(`/spaces/${ctx.owner.personalSpaceId}/transactions`);
    await expect(
      page.getByRole('link', { name: /Relacionado con un gasto compartido/i }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('debtor settlement with personal note and creditor annotates income', async ({ page }) => {
    const ctx = seed!;

    await loginThroughUi(page, ctx.member.email, ctx.member.password);
    await page.goto(`/spaces/${ctx.spaceId}/balances`);
    await page.getByRole('link', { name: 'Registrar pago' }).first().click();
    await page.locator('#settlement-amount').fill('25');
    await page.locator('#settlement-annotate-personal').check();
    await page.getByRole('button', { name: 'Registrar pago' }).click();
    await expect(page).toHaveURL(new RegExp(`/spaces/${ctx.spaceId}/settlements`), {
      timeout: 15_000,
    });

    await loginThroughUi(page, ctx.owner.email, ctx.owner.password);
    await page.goto(`/spaces/${ctx.spaceId}/balances`);
    await expect(page.getByText(/Anotar cobros en tu cuenta personal/i)).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole('button', { name: 'Anotar en mi cuenta' }).first().click();
    await expect(page.getByText(/Tu movimiento personal está vinculado/i)).toBeVisible({
      timeout: 15_000,
    });
  });
});