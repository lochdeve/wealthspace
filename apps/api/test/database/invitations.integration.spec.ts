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

type AuthSession = {
  cookies: string[];
  email: string;
};

type SpaceBody = {
  id: string;
  type: string;
};

type InvitationBody = {
  id: string;
  email: string;
  spaceId: string;
  spaceName?: string;
  invitedByDisplayName?: string;
};

function asCookieSetHeader(setCookie: string | string[] | undefined): string[] {
  if (setCookie === undefined) {
    return [];
  }
  return Array.isArray(setCookie) ? setCookie : [setCookie];
}

describe('Invitations (integration)', () => {
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

  async function registerAndLogin(label: string): Promise<AuthSession> {
    const email = `${label}-${randomUUID()}@test.local`;
    const password = 'ValidPass10chars!';

    await request(app.getHttpServer())
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
      email,
      cookies: asCookieSetHeader(loginRes.headers['set-cookie']),
    };
  }

  async function createSharedSpace(cookies: string[]): Promise<SpaceBody> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/spaces')
      .set('Cookie', cookies)
      .send({ name: 'Shared test' })
      .expect(201);
    return res.body as SpaceBody;
  }

  it('invite, list mine, accept and join space', async () => {
    const owner = await registerAndLogin('inv-owner');
    const invitee = await registerAndLogin('inv-invitee');
    const shared = await createSharedSpace(owner.cookies);

    const inviteRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${shared.id}/invitations`)
      .set('Cookie', owner.cookies)
      .send({ email: invitee.email })
      .expect(201);

    const invitation = inviteRes.body as InvitationBody;
    expect(invitation.email).toBe(invitee.email);

    const mine = await request(app.getHttpServer())
      .get('/api/v1/invitations')
      .set('Cookie', invitee.cookies)
      .expect(200);

    const pending = mine.body as InvitationBody[];
    expect(pending).toHaveLength(1);
    expect(pending[0]?.id).toBe(invitation.id);
    expect(pending[0]?.spaceName).toBe('Shared test');
    expect(pending[0]?.invitedByDisplayName).toBeTruthy();

    await request(app.getHttpServer())
      .post(`/api/v1/invitations/${invitation.id}/accept`)
      .set('Cookie', invitee.cookies)
      .expect(204);

    const spacesRes = await request(app.getHttpServer())
      .get('/api/v1/spaces')
      .set('Cookie', invitee.cookies)
      .expect(200);

    const spaces = spacesRes.body as SpaceBody[];
    expect(spaces.some((s) => s.id === shared.id)).toBe(true);
  });

  it('rejects invitation management on PERSONAL space', async () => {
    const user = await registerAndLogin('inv-personal');
    const other = await registerAndLogin('inv-other');

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', user.cookies)
      .expect(200);
    const personalSpaceId = (me.body as { personalSpaceId: string })
      .personalSpaceId;

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${personalSpaceId}/invitations`)
      .set('Cookie', user.cookies)
      .send({ email: other.email })
      .expect(403)
      .expect((r) => {
        expect((r.body as { code?: string }).code).toBe('SPACE_NOT_SHARED');
      });
  });

  it('member cannot create invitations', async () => {
    const owner = await registerAndLogin('inv-owner2');
    const member = await registerAndLogin('inv-member');
    const shared = await createSharedSpace(owner.cookies);

    const inviteRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${shared.id}/invitations`)
      .set('Cookie', owner.cookies)
      .send({ email: member.email })
      .expect(201);

    await request(app.getHttpServer())
      .post(
        `/api/v1/invitations/${(inviteRes.body as InvitationBody).id}/accept`,
      )
      .set('Cookie', member.cookies)
      .expect(204);

    const stranger = await registerAndLogin('inv-stranger');

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${shared.id}/invitations`)
      .set('Cookie', member.cookies)
      .send({ email: stranger.email })
      .expect(403)
      .expect((r) => {
        expect((r.body as { code?: string }).code).toBe('INSUFFICIENT_ROLE');
      });
  });

  it('owner can revoke a pending invitation', async () => {
    const owner = await registerAndLogin('inv-revoke');
    const shared = await createSharedSpace(owner.cookies);
    const targetEmail = `pending-${randomUUID()}@test.local`;

    const inviteRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${shared.id}/invitations`)
      .set('Cookie', owner.cookies)
      .send({ email: targetEmail })
      .expect(201);

    const invitationId = (inviteRes.body as InvitationBody).id;

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${shared.id}/invitations/${invitationId}/revoke`)
      .set('Cookie', owner.cookies)
      .expect(204);

    const listRes = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${shared.id}/invitations`)
      .set('Cookie', owner.cookies)
      .expect(200);

    expect(listRes.body as unknown[]).toHaveLength(0);
  });

  it('accept returns INVITATION_NOT_FOUND for unknown id', async () => {
    const user = await registerAndLogin('inv-missing');

    await request(app.getHttpServer())
      .post(`/api/v1/invitations/${randomUUID()}/accept`)
      .set('Cookie', user.cookies)
      .expect(404)
      .expect((r) => {
        expect((r.body as { code?: string }).code).toBe('INVITATION_NOT_FOUND');
      });
  });

  it('reject returns INVITATION_NOT_FOUND for unknown id', async () => {
    const user = await registerAndLogin('inv-reject-missing');

    await request(app.getHttpServer())
      .post(`/api/v1/invitations/${randomUUID()}/reject`)
      .set('Cookie', user.cookies)
      .expect(404)
      .expect((r) => {
        expect((r.body as { code?: string }).code).toBe('INVITATION_NOT_FOUND');
      });
  });
});
