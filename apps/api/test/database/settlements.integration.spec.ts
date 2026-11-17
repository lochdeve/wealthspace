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

type SettlementBody = {
  id: string;
  amount: string;
  version: number;
  voidedAt?: string | null;
  warnings?: string[];
};

function asCookieSetHeader(setCookie: string | string[] | undefined): string[] {
  if (setCookie === undefined) {
    return [];
  }
  return Array.isArray(setCookie) ? setCookie : [setCookie];
}

describe('Settlements and balances (integration)', () => {
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

  it('GET /balances after 120 EUR expense and 15 settlement (phase 7)', async () => {
    const { owner, carlos, maria, spaceId } = await trioSharedSpace();
    const ids = [owner.profile.id, carlos.profile.id, maria.profile.id];

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/shared-expenses`)
      .set('Cookie', owner.cookies)
      .send({
        totalAmount: '120.00',
        currency: 'EUR',
        payment: { source: 'MEMBER', paidByUserId: owner.profile.id },
        split: { mode: 'EQUAL', participantUserIds: ids },
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/settlements`)
      .set('Cookie', carlos.cookies)
      .send({
        fromUserId: carlos.profile.id,
        toUserId: owner.profile.id,
        amount: '15.00',
        currency: 'EUR',
      })
      .expect(201);

    const balances = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${spaceId}/balances`)
      .set('Cookie', owner.cookies)
      .expect(200);

    const eur = (
      balances.body as {
        currencies: {
          currency: string;
          debts: { fromUserId: string; toUserId: string; amount: string }[];
          members: { userId: string; net: string }[];
        }[];
      }
    ).currencies[0];

    expect(eur?.debts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fromUserId: carlos.profile.id,
          toUserId: owner.profile.id,
          amount: '25.0000',
        }),
        expect.objectContaining({
          fromUserId: maria.profile.id,
          toUserId: owner.profile.id,
          amount: '40.0000',
        }),
      ]),
    );
    const anaNet = eur?.members.find((m) => m.userId === owner.profile.id);
    expect(anaNet?.net).toBe('65.0000');
  });

  it('P-19: settlement Carlos→Ana after Carlos LEFT with occurred_at > left_at succeeds', async () => {
    const { owner, carlos, maria, spaceId } = await trioSharedSpace();
    const ids = [owner.profile.id, carlos.profile.id, maria.profile.id];

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/shared-expenses`)
      .set('Cookie', owner.cookies)
      .send({
        totalAmount: '120.00',
        currency: 'EUR',
        payment: { source: 'MEMBER', paidByUserId: owner.profile.id },
        split: { mode: 'EQUAL', participantUserIds: ids },
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/membership/leave`)
      .set('Cookie', carlos.cookies)
      .expect(204);

    const occurredAt = new Date(Date.now() + 60_000).toISOString();

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/settlements`)
      .set('Cookie', owner.cookies)
      .send({
        fromUserId: carlos.profile.id,
        toUserId: owner.profile.id,
        amount: '10.00',
        currency: 'EUR',
        occurredAt,
      })
      .expect(201);
  });

  it('P-11: warns when settlement exceeds pending debt without 400', async () => {
    const { owner, carlos, spaceId } = await trioSharedSpace();

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/shared-expenses`)
      .set('Cookie', owner.cookies)
      .send({
        totalAmount: '60.00',
        currency: 'EUR',
        payment: { source: 'MEMBER', paidByUserId: owner.profile.id },
        split: {
          mode: 'EQUAL',
          participantUserIds: [owner.profile.id, carlos.profile.id],
        },
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/settlements`)
      .set('Cookie', carlos.cookies)
      .send({
        fromUserId: carlos.profile.id,
        toUserId: owner.profile.id,
        amount: '50.00',
        currency: 'EUR',
      })
      .expect(201);

    expect((res.body as SettlementBody).warnings).toContain(
      'SETTLEMENT_EXCEEDS_PENDING_DEBT',
    );
  });

  it('void settlement restores balance', async () => {
    const { owner, carlos, spaceId } = await trioSharedSpace();

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/shared-expenses`)
      .set('Cookie', owner.cookies)
      .send({
        totalAmount: '60.00',
        currency: 'EUR',
        payment: { source: 'MEMBER', paidByUserId: owner.profile.id },
        split: {
          mode: 'EQUAL',
          participantUserIds: [owner.profile.id, carlos.profile.id],
        },
      })
      .expect(201);

    const createRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/settlements`)
      .set('Cookie', carlos.cookies)
      .send({
        fromUserId: carlos.profile.id,
        toUserId: owner.profile.id,
        amount: '15.00',
        currency: 'EUR',
      })
      .expect(201);

    const created = createRes.body as SettlementBody;

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/settlements/${created.id}/void`)
      .set('Cookie', carlos.cookies)
      .send({ expectedVersion: created.version })
      .expect(200);

    const balances = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${spaceId}/balances`)
      .set('Cookie', owner.cookies)
      .expect(200);

    const debt = (
      balances.body as {
        currencies: {
          debts: { fromUserId: string; toUserId: string; amount: string }[];
        }[];
      }
    ).currencies[0]?.debts[0];

    expect(debt?.amount).toBe('30.0000');
  });
});
