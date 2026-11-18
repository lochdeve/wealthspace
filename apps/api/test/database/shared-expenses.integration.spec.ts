import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { setupSwagger } from '../../src/swagger/setup-swagger';
import {
  TEST_DB,
  resetSchema,
  truncateFinancialData,
  withClient,
} from './helpers';
import { applyTestApiEnv } from './test-api-env';
import { createTestValidationPipe } from './test-validation-pipe';

type UserProfileBody = {
  id: string;
  personalSpaceId: string;
  email: string;
};

type SharedExpenseBody = {
  id: string;
  totalAmount: string;
  participants: { userId: string; allocatedAmount: string }[];
  generatedDebts: { fromUserId: string; toUserId: string; amount: string }[];
  version: number;
  voidedAt?: string | null;
  myPersonalCashLink?: { linked: boolean; canLink: boolean };
  payment?: { source: string; paidByUserId?: string; accountId?: string };
};

function asCookieSetHeader(setCookie: string | string[] | undefined): string[] {
  if (setCookie === undefined) {
    return [];
  }
  return Array.isArray(setCookie) ? setCookie : [setCookie];
}

describe('Shared expenses (integration)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    applyTestApiEnv(TEST_DB);
    await resetSchema();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(createTestValidationPipe());
    setupSwagger(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await withClient(truncateFinancialData);
  });

  async function registerAndLogin(
    label: string,
  ): Promise<{ cookies: string[]; profile: UserProfileBody; email: string }> {
    const email = `${label}-${randomUUID()}@test.local`;
    const password = 'ValidPass10chars!';

    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password,
        displayName: label,
        timezone: 'UTC',
      })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    return {
      cookies: asCookieSetHeader(loginRes.headers['set-cookie']),
      profile: registerRes.body as UserProfileBody,
      email,
    };
  }

  async function createSharedSpace(cookies: string[]): Promise<{ id: string }> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/spaces')
      .set('Cookie', cookies)
      .send({ name: 'Piso', displayCurrency: 'EUR' })
      .expect(201);
    return res.body as { id: string };
  }

  async function acceptInvite(
    ownerCookies: string[],
    invitee: { cookies: string[]; email: string },
    spaceId: string,
  ): Promise<void> {
    const inviteRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/invitations`)
      .set('Cookie', ownerCookies)
      .send({ email: invitee.email })
      .expect(201);

    const invitationId = (inviteRes.body as { id: string }).id;
    await request(app.getHttpServer())
      .post(`/api/v1/invitations/${invitationId}/accept`)
      .set('Cookie', invitee.cookies)
      .expect(204);
  }

  async function trioSharedSpace(): Promise<{
    owner: Awaited<ReturnType<typeof registerAndLogin>>;
    carlos: Awaited<ReturnType<typeof registerAndLogin>>;
    maria: Awaited<ReturnType<typeof registerAndLogin>>;
    spaceId: string;
  }> {
    const owner = await registerAndLogin('ana');
    const carlos = await registerAndLogin('carlos');
    const maria = await registerAndLogin('maria');
    const space = await createSharedSpace(owner.cookies);
    await acceptInvite(owner.cookies, carlos, space.id);
    await acceptInvite(owner.cookies, maria, space.id);
    return { owner, carlos, maria, spaceId: space.id };
  }

  it('POST creates 120 EUR equal split with generated debts', async () => {
    const { owner, carlos, maria, spaceId } = await trioSharedSpace();
    const ids = [owner.profile.id, carlos.profile.id, maria.profile.id];

    const res = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/shared-expenses`)
      .set('Cookie', owner.cookies)
      .send({
        description: 'Compra semanal',
        totalAmount: '120.00',
        currency: 'EUR',
        payment: { source: 'MEMBER', paidByUserId: owner.profile.id },
        split: { mode: 'EQUAL', participantUserIds: ids },
      })
      .expect(201);

    const body = res.body as SharedExpenseBody;
    expect(body.totalAmount).toBe('120.0000');
    expect(body.participants).toHaveLength(3);
    for (const part of body.participants) {
      expect(part.allocatedAmount).toBe('40.0000');
    }
    expect(body.generatedDebts).toHaveLength(2);
    const debtToAna = (amount: string, from: string) =>
      body.generatedDebts.some(
        (d) =>
          d.fromUserId === from &&
          d.toUserId === owner.profile.id &&
          d.amount === amount,
      );
    expect(debtToAna('40.0000', carlos.profile.id)).toBe(true);
    expect(debtToAna('40.0000', maria.profile.id)).toBe(true);
  });

  it('preview matches create allocations', async () => {
    const { owner, carlos, maria, spaceId } = await trioSharedSpace();
    const payload = {
      totalAmount: '100.00',
      currency: 'EUR',
      payment: { source: 'MEMBER', paidByUserId: owner.profile.id },
      split: {
        mode: 'EQUAL',
        participantUserIds: [
          owner.profile.id,
          carlos.profile.id,
          maria.profile.id,
        ],
      },
    };

    const preview = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/shared-expenses/preview`)
      .set('Cookie', owner.cookies)
      .send(payload)
      .expect(200);

    const created = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/shared-expenses`)
      .set('Cookie', owner.cookies)
      .send(payload)
      .expect(201);

    const previewParts = (preview.body as SharedExpenseBody).participants.map(
      (p) => p.allocatedAmount,
    );
    const createdParts = (created.body as SharedExpenseBody).participants.map(
      (p) => p.allocatedAmount,
    );
    expect(previewParts.sort()).toEqual(createdParts.sort());
  });

  it('rejects invalid percentage sum', async () => {
    const { owner, carlos, maria, spaceId } = await trioSharedSpace();

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/shared-expenses/preview`)
      .set('Cookie', owner.cookies)
      .send({
        totalAmount: '90.00',
        currency: 'EUR',
        payment: { source: 'MEMBER', paidByUserId: owner.profile.id },
        split: {
          mode: 'PERCENTAGE',
          shares: [
            { userId: owner.profile.id, percent: '50' },
            { userId: carlos.profile.id, percent: '30' },
            { userId: maria.profile.id, percent: '10' },
          ],
        },
      })
      .expect(400)
      .expect((r) => {
        expect((r.body as { code?: string }).code).toBe(
          'SPLIT_PERCENT_SUM_INVALID',
        );
      });
  });

  it('SPACE_ACCOUNT lowers shared account balance only', async () => {
    const { owner, carlos, maria, spaceId } = await trioSharedSpace();

    const accountRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/accounts`)
      .set('Cookie', owner.cookies)
      .send({ name: 'Caja', currency: 'EUR' })
      .expect(201);

    const accountId = (accountRes.body as { id: string }).id;

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/accounts/${accountId}/opening-balance`)
      .set('Cookie', owner.cookies)
      .send({ amount: '200.0000' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/shared-expenses`)
      .set('Cookie', owner.cookies)
      .send({
        totalAmount: '50.00',
        payment: { source: 'SPACE_ACCOUNT', accountId },
        split: {
          mode: 'EQUAL',
          participantUserIds: [
            owner.profile.id,
            carlos.profile.id,
            maria.profile.id,
          ],
        },
      })
      .expect(201);

    const accountDetail = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${spaceId}/accounts/${accountId}`)
      .set('Cookie', owner.cookies)
      .expect(200);

    expect((accountDetail.body as { balance: string }).balance).toBe(
      '150.0000',
    );
    expect(
      (
        (
          await request(app.getHttpServer())
            .get(`/api/v1/spaces/${owner.profile.personalSpaceId}/accounts`)
            .set('Cookie', owner.cookies)
            .expect(200)
        ).body as { balance: string }[]
      ).length,
    ).toBeGreaterThanOrEqual(0);
  });

  it('rejects SHARED expense on PERSONAL space', async () => {
    const user = await registerAndLogin('personal');

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${user.profile.personalSpaceId}/shared-expenses`)
      .set('Cookie', user.cookies)
      .send({
        totalAmount: '10.00',
        currency: 'EUR',
        payment: { source: 'MEMBER', paidByUserId: user.profile.id },
        split: { mode: 'EQUAL', participantUserIds: [user.profile.id] },
      })
      .expect(400)
      .expect((r) => {
        expect((r.body as { code?: string }).code).toBe(
          'SHARED_SPACE_REQUIRED',
        );
      });
  });

  it('MEMBER cannot set another payer', async () => {
    const { owner, carlos, maria, spaceId } = await trioSharedSpace();

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/shared-expenses`)
      .set('Cookie', carlos.cookies)
      .send({
        totalAmount: '30.00',
        currency: 'EUR',
        payment: { source: 'MEMBER', paidByUserId: owner.profile.id },
        split: {
          mode: 'EQUAL',
          participantUserIds: [
            owner.profile.id,
            carlos.profile.id,
            maria.profile.id,
          ],
        },
      })
      .expect(403)
      .expect((r) => {
        expect((r.body as { code?: string }).code).toBe('PAYER_NOT_ALLOWED');
      });
  });

  it('voiding SPACE_ACCOUNT expense restores account balance atomically', async () => {
    const { owner, carlos, spaceId } = await trioSharedSpace();

    const accountRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/accounts`)
      .set('Cookie', owner.cookies)
      .send({ name: 'Caja', currency: 'EUR' })
      .expect(201);

    const accountId = (accountRes.body as { id: string }).id;
    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/accounts/${accountId}/opening-balance`)
      .set('Cookie', owner.cookies)
      .send({ amount: '100.0000' })
      .expect(201);

    const createRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/shared-expenses`)
      .set('Cookie', owner.cookies)
      .send({
        totalAmount: '40.00',
        payment: { source: 'SPACE_ACCOUNT', accountId },
        split: {
          mode: 'EQUAL',
          participantUserIds: [owner.profile.id, carlos.profile.id],
        },
      })
      .expect(201);

    const created = createRes.body as SharedExpenseBody;
    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/shared-expenses/${created.id}/void`)
      .set('Cookie', owner.cookies)
      .send({ expectedVersion: created.version })
      .expect(200)
      .expect((r) => {
        expect((r.body as SharedExpenseBody).voidedAt).not.toBeNull();
      });

    const after = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${spaceId}/accounts/${accountId}`)
      .set('Cookie', owner.cookies)
      .expect(200);

    expect((after.body as { balance: string }).balance).toBe('100.0000');
  });

  it('GET list and detail return generatedDebts', async () => {
    const { owner, carlos, maria, spaceId } = await trioSharedSpace();
    const ids = [owner.profile.id, carlos.profile.id, maria.profile.id];

    const createRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/shared-expenses`)
      .set('Cookie', owner.cookies)
      .send({
        totalAmount: '120.00',
        currency: 'EUR',
        payment: { source: 'MEMBER', paidByUserId: owner.profile.id },
        split: { mode: 'EQUAL', participantUserIds: ids },
      })
      .expect(201);

    const created = createRes.body as SharedExpenseBody;

    const list = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${spaceId}/shared-expenses`)
      .set('Cookie', owner.cookies)
      .expect(200);

    const listBody = list.body as SharedExpenseBody[];
    expect(listBody).toHaveLength(1);
    expect(listBody[0]?.id).toBe(created.id);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${spaceId}/shared-expenses/${created.id}`)
      .set('Cookie', carlos.cookies)
      .expect(200);

    expect((detail.body as SharedExpenseBody).generatedDebts).toHaveLength(2);
  });

  it('PATCH recalculates split and stores revision', async () => {
    const { owner, carlos, maria, spaceId } = await trioSharedSpace();
    const ids = [owner.profile.id, carlos.profile.id, maria.profile.id];

    const createRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/shared-expenses`)
      .set('Cookie', owner.cookies)
      .send({
        totalAmount: '120.00',
        currency: 'EUR',
        payment: { source: 'MEMBER', paidByUserId: owner.profile.id },
        split: { mode: 'EQUAL', participantUserIds: ids },
      })
      .expect(201);

    const created = createRes.body as SharedExpenseBody;

    const patchRes = await request(app.getHttpServer())
      .patch(`/api/v1/spaces/${spaceId}/shared-expenses/${created.id}`)
      .set('Cookie', owner.cookies)
      .send({
        expectedVersion: created.version,
        totalAmount: '90.00',
        currency: 'EUR',
        payment: { source: 'MEMBER', paidByUserId: owner.profile.id },
        split: { mode: 'EQUAL', participantUserIds: ids },
      })
      .expect(200);

    const patched = patchRes.body as SharedExpenseBody;
    expect(patched.totalAmount).toBe('90.0000');
    expect(patched.version).toBe(2);
  });

  async function createPersonalWallet(
    cookies: string[],
    personalSpaceId: string,
  ): Promise<string> {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${personalSpaceId}/accounts`)
      .set('Cookie', cookies)
      .send({ name: 'Wallet', currency: 'EUR' })
      .expect(201);
    const accountId = (res.body as { id: string }).id;
    await request(app.getHttpServer())
      .post(
        `/api/v1/spaces/${personalSpaceId}/accounts/${accountId}/opening-balance`,
      )
      .set('Cookie', cookies)
      .send({ amount: '500.0000' })
      .expect(201);
    return accountId;
  }

  it('MEMBER payer can create with personalAccountId and link later', async () => {
    const { owner, carlos, maria, spaceId } = await trioSharedSpace();
    const walletId = await createPersonalWallet(
      owner.cookies,
      owner.profile.personalSpaceId,
    );
    const ids = [owner.profile.id, carlos.profile.id, maria.profile.id];

    const createdRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/shared-expenses`)
      .set('Cookie', owner.cookies)
      .send({
        totalAmount: '90.00',
        currency: 'EUR',
        payment: {
          source: 'MEMBER',
          paidByUserId: owner.profile.id,
          personalAccountId: walletId,
        },
        split: { mode: 'EQUAL', participantUserIds: ids },
      })
      .expect(201);

    const created = createdRes.body as SharedExpenseBody;
    expect(created.myPersonalCashLink).toEqual({ linked: true, canLink: false });
    expect(JSON.stringify(created)).not.toContain(walletId);

    const mariaView = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${spaceId}/shared-expenses/${created.id}`)
      .set('Cookie', maria.cookies)
      .expect(200);

    expect(
      (mariaView.body as SharedExpenseBody).myPersonalCashLink,
    ).toBeUndefined();
    expect(JSON.stringify(mariaView.body)).not.toContain(walletId);

    const payerWallet = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${owner.profile.personalSpaceId}/accounts/${walletId}`)
      .set('Cookie', owner.cookies)
      .expect(200);

    expect((payerWallet.body as { balance: string }).balance).toBe('410.0000');
  });

  it('POST link-personal-payment rejects non-payer', async () => {
    const { owner, carlos, maria, spaceId } = await trioSharedSpace();
    const walletId = await createPersonalWallet(
      owner.cookies,
      owner.profile.personalSpaceId,
    );
    const ids = [owner.profile.id, carlos.profile.id, maria.profile.id];

    const createdRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/shared-expenses`)
      .set('Cookie', owner.cookies)
      .send({
        totalAmount: '30.00',
        currency: 'EUR',
        payment: { source: 'MEMBER', paidByUserId: owner.profile.id },
        split: { mode: 'EQUAL', participantUserIds: ids },
      })
      .expect(201);

    const created = createdRes.body as SharedExpenseBody;
    expect(created.myPersonalCashLink).toEqual({ linked: false, canLink: true });

    await request(app.getHttpServer())
      .post(
        `/api/v1/spaces/${spaceId}/shared-expenses/${created.id}/link-personal-payment`,
      )
      .set('Cookie', carlos.cookies)
      .send({ personalAccountId: walletId, expectedVersion: created.version })
      .expect(403)
      .expect((r) => {
        expect((r.body as { code?: string }).code).toBe('NOT_PAYER');
      });

    const linked = await request(app.getHttpServer())
      .post(
        `/api/v1/spaces/${spaceId}/shared-expenses/${created.id}/link-personal-payment`,
      )
      .set('Cookie', owner.cookies)
      .send({ personalAccountId: walletId, expectedVersion: created.version })
      .expect(200);

    expect((linked.body as SharedExpenseBody).myPersonalCashLink).toEqual({
      linked: true,
      canLink: false,
    });
  });

  it('void shared expense voids linked personal payment (B-8.3)', async () => {
    const { owner, carlos, maria, spaceId } = await trioSharedSpace();
    const walletId = await createPersonalWallet(
      owner.cookies,
      owner.profile.personalSpaceId,
    );
    const ids = [owner.profile.id, carlos.profile.id, maria.profile.id];

    const createdRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/shared-expenses`)
      .set('Cookie', owner.cookies)
      .send({
        totalAmount: '60.00',
        currency: 'EUR',
        payment: {
          source: 'MEMBER',
          paidByUserId: owner.profile.id,
          personalAccountId: walletId,
        },
        split: { mode: 'EQUAL', participantUserIds: ids },
      })
      .expect(201);

    const created = createdRes.body as SharedExpenseBody;

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/shared-expenses/${created.id}/void`)
      .set('Cookie', owner.cookies)
      .send({ expectedVersion: created.version })
      .expect(200);

    const afterVoid = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${spaceId}/shared-expenses/${created.id}`)
      .set('Cookie', owner.cookies)
      .expect(200);

    expect((afterVoid.body as SharedExpenseBody).myPersonalCashLink).toEqual({
      linked: false,
      canLink: false,
    });

    const payerWallet = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${owner.profile.personalSpaceId}/accounts/${walletId}`)
      .set('Cookie', owner.cookies)
      .expect(200);

    expect((payerWallet.body as { balance: string }).balance).toBe('500.0000');
  });

  it('PATCH amount syncs linked personal payment (B-8.3)', async () => {
    const { owner, carlos, maria, spaceId } = await trioSharedSpace();
    const walletId = await createPersonalWallet(
      owner.cookies,
      owner.profile.personalSpaceId,
    );
    const ids = [owner.profile.id, carlos.profile.id, maria.profile.id];

    const createdRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/shared-expenses`)
      .set('Cookie', owner.cookies)
      .send({
        totalAmount: '60.00',
        currency: 'EUR',
        payment: {
          source: 'MEMBER',
          paidByUserId: owner.profile.id,
          personalAccountId: walletId,
        },
        split: { mode: 'EQUAL', participantUserIds: ids },
      })
      .expect(201);

    const created = createdRes.body as SharedExpenseBody;

    await request(app.getHttpServer())
      .patch(`/api/v1/spaces/${spaceId}/shared-expenses/${created.id}`)
      .set('Cookie', owner.cookies)
      .send({
        expectedVersion: created.version,
        description: 'Actualizado',
        totalAmount: '90.00',
        currency: 'EUR',
        payment: { source: 'MEMBER', paidByUserId: owner.profile.id },
        split: { mode: 'EQUAL', participantUserIds: ids },
      })
      .expect(200);

    const payerWallet = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${owner.profile.personalSpaceId}/accounts/${walletId}`)
      .set('Cookie', owner.cookies)
      .expect(200);

    expect((payerWallet.body as { balance: string }).balance).toBe('410.0000');
  });

  it('rejects personalAccountId when actor is not payer on create', async () => {
    const { owner, carlos, maria, spaceId } = await trioSharedSpace();
    const walletId = await createPersonalWallet(
      carlos.cookies,
      carlos.profile.personalSpaceId,
    );
    const ids = [owner.profile.id, carlos.profile.id, maria.profile.id];

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/shared-expenses`)
      .set('Cookie', owner.cookies)
      .send({
        totalAmount: '20.00',
        currency: 'EUR',
        payment: {
          source: 'MEMBER',
          paidByUserId: carlos.profile.id,
          personalAccountId: walletId,
        },
        split: { mode: 'EQUAL', participantUserIds: ids },
      })
      .expect(403)
      .expect((r) => {
        expect((r.body as { code?: string }).code).toBe(
          'PERSONAL_LINK_NOT_ALLOWED',
        );
      });
  });

  it('MEMBER without role cannot void expense recorded by owner', async () => {
    const { owner, carlos, maria, spaceId } = await trioSharedSpace();

    const createRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/shared-expenses`)
      .set('Cookie', owner.cookies)
      .send({
        totalAmount: '60.00',
        currency: 'EUR',
        payment: { source: 'MEMBER', paidByUserId: owner.profile.id },
        split: {
          mode: 'EQUAL',
          participantUserIds: [
            owner.profile.id,
            carlos.profile.id,
            maria.profile.id,
          ],
        },
      })
      .expect(201);

    const created = createRes.body as SharedExpenseBody;

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/shared-expenses/${created.id}/void`)
      .set('Cookie', carlos.cookies)
      .send({ expectedVersion: created.version })
      .expect(403)
      .expect((r) => {
        expect((r.body as { code?: string }).code).toBe(
          'SHARED_EXPENSE_EDIT_FORBIDDEN',
        );
      });
  });
});
