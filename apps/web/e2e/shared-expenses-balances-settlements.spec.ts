import { test, expect } from '@playwright/test';
import {
  assertE2EApiReady,
  seedTwoMemberSharedSpace,
  type TwoMemberSharedSeed,
} from './helpers/api';
import { loginThroughUi } from './helpers/ui';

let seed: TwoMemberSharedSeed | undefined;

test.describe('SHARED: expense, balances, partial settlement, void', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    try {
      await assertE2EApiReady();
      seed = await seedTwoMemberSharedSpace();
    } catch (error) {
      seed = undefined;
      console.warn('[e2e] Skipping shared flow — API seed failed:', error);
    }
  });

  test.beforeEach(({ page: _page }, testInfo) => {
    if (!seed) {
      testInfo.skip(true, 'API seed unavailable');
    }
  });

  test('owner registers equal shared expense (120 EUR)', async ({ page }) => {
    const ctx = seed!;
    await loginThroughUi(page, ctx.owner.email, ctx.owner.password);
    await page.goto(`/spaces/${ctx.spaceId}/expenses/new`);
    await page.locator('#shared-description').fill('E2E cena compartida');
    await page.locator('#shared-amount').fill('120');
    await page.getByRole('button', { name: 'Registrar gasto compartido' }).click();
    await expect(page).toHaveURL(new RegExp(`/spaces/${ctx.spaceId}/expenses/[\\w-]+$`), {
      timeout: 15_000,
    });
  });

  test('debtor views balances, settles partially, voids, balances restore', async ({ page }) => {
    const ctx = seed!;

    await loginThroughUi(page, ctx.member.email, ctx.member.password);
    await page.goto(`/spaces/${ctx.spaceId}/balances`);

    await expect(page.locator('#balances-page-title')).toBeVisible();
    await expect(
      page.getByText(new RegExp(`${ctx.member.displayName} debe .*60.* a ${ctx.owner.displayName}`)),
    ).toBeVisible();

    await page
      .getByRole('listitem')
      .filter({
        hasText: new RegExp(
          `${ctx.member.displayName} debe .*60.* a ${ctx.owner.displayName}`,
        ),
      })
      .getByRole('link', { name: 'Registrar pago' })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/spaces/${ctx.spaceId}/settlements/new\\?.*fromUserId=`),
    );

    await page.locator('#settlement-amount').fill('15');
    await page.getByRole('button', { name: 'Registrar pago' }).click();
    await expect(page).toHaveURL(new RegExp(`/spaces/${ctx.spaceId}/settlements`), {
      timeout: 15_000,
    });

    await page.goto(`/spaces/${ctx.spaceId}/balances`);
    await expect(
      page.getByText(new RegExp(`${ctx.member.displayName} debe .*45.* a ${ctx.owner.displayName}`)),
    ).toBeVisible();

    await page.goto(`/spaces/${ctx.spaceId}/settlements`);
    page.once('dialog', (dialog) => void dialog.accept());
    await page.getByRole('button', { name: 'Anular liquidación' }).click();
    await expect(page.getByText('Anulada')).toBeVisible({ timeout: 10_000 });

    await page.goto(`/spaces/${ctx.spaceId}/balances`);
    await expect(
      page.getByText(new RegExp(`${ctx.member.displayName} debe .*60.* a ${ctx.owner.displayName}`)),
    ).toBeVisible();
  });
});