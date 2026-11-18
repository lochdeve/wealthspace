import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { setupSwagger } from '../../src/swagger/setup-swagger';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  TEST_DB,
  resetSchema,
  truncateFinancialData,
  withClient,
} from './helpers';
import { applyTestApiEnv } from './test-api-env';

type AuthSession = { cookies: string[]; email: string; userId: string };
type SpaceBody = { id: string };
type InvitationBody = { id: string };
type MeBody = { id: string; personalSpaceId: string };

function asCookieSetHeader(setCookie: string | string[] | undefined): string[] {
  if (setCookie === undefined) {
    return [];
  }
  return Array.isArray(setCookie) ? setCookie : [setCookie];
}

describe('Membership lifecycle (integration)', () => {
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
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: false },
      }),
    );
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

    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password,
        displayName: label,
        timezone: 'UTC',
      })
      .expect(201);

    const userId = (registerRes.body as MeBody).id;

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    return {
      email,
      userId,
      cookies: asCookieSetHeader(loginRes.headers['set-cookie']),
    };
  }

  async function createSharedSpace(cookies: string[]): Promise<SpaceBody> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/spaces')
      .set('Cookie', cookies)
      .send({ name: 'Shared' })
      .expect(201);
    return res.body as SpaceBody;
  }

  async function inviteAndAccept(
    ownerCookies: string[],
    invitee: AuthSession,
    spaceId: string,
  ): Promise<void> {
    const inviteRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/invitations`)
      .set('Cookie', ownerCookies)
      .send({ email: invitee.email })
      .expect(201);

    await request(app.getHttpServer())
      .post(
        `/api/v1/invitations/${(inviteRes.body as InvitationBody).id}/accept`,
      )
      .set('Cookie', invitee.cookies)
      .expect(204);
  }

  it('GET /spaces/:id/members lists active members', async () => {
    const owner = await registerAndLogin('list-owner');
    const member = await registerAndLogin('list-member');
    const shared = await createSharedSpace(owner.cookies);
    await inviteAndAccept(owner.cookies, member, shared.id);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${shared.id}/members`)
      .set('Cookie', member.cookies)
      .expect(200);

    const body = res.body as { userId: string; role: string }[];
    expect(body).toHaveLength(2);
    const roles = body.map((row) => row.role).sort();
    expect(roles).toEqual(['MEMBER', 'OWNER']);
  });

  it('member can leave SHARED space (LEFT)', async () => {
    const owner = await registerAndLogin('leave-owner');
    const member = await registerAndLogin('leave-member');
    const shared = await createSharedSpace(owner.cookies);
    await inviteAndAccept(owner.cookies, member, shared.id);

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${shared.id}/membership/leave`)
      .set('Cookie', member.cookies)
      .expect(204);

    const list = await request(app.getHttpServer())
      .get('/api/v1/spaces')
      .set('Cookie', member.cookies)
      .expect(200);

    const ids = (list.body as SpaceBody[]).map((s) => s.id);
    expect(ids).not.toContain(shared.id);

    const prisma = app.get(PrismaService);
    const row = await prisma.spaceMembership.findFirst({
      where: { spaceId: shared.id, userId: member.userId },
    });
    expect(row?.status).toBe('LEFT');
    expect(row?.leftAt).not.toBeNull();
  });

  it('sole owner cannot leave', async () => {
    const owner = await registerAndLogin('sole-owner');
    const shared = await createSharedSpace(owner.cookies);

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${shared.id}/membership/leave`)
      .set('Cookie', owner.cookies)
      .expect(409)
      .expect((r) => {
        expect((r.body as { code?: string }).code).toBe(
          'CANNOT_LEAVE_AS_SOLE_OWNER',
        );
      });
  });

  it('owner transfers ownership; former owner becomes ADMIN and can leave', async () => {
    const owner = await registerAndLogin('xfer-owner');
    const member = await registerAndLogin('xfer-member');
    const shared = await createSharedSpace(owner.cookies);
    await inviteAndAccept(owner.cookies, member, shared.id);

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${shared.id}/ownership/transfer`)
      .set('Cookie', owner.cookies)
      .send({ newOwnerUserId: member.userId })
      .expect(204);

    const prisma = app.get(PrismaService);
    const ownerRow = await prisma.spaceMembership.findFirst({
      where: { spaceId: shared.id, userId: owner.userId, status: 'ACTIVE' },
    });
    const memberRow = await prisma.spaceMembership.findFirst({
      where: { spaceId: shared.id, userId: member.userId, status: 'ACTIVE' },
    });
    expect(ownerRow?.role).toBe('ADMIN');
    expect(memberRow?.role).toBe('OWNER');

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${shared.id}/membership/leave`)
      .set('Cookie', owner.cookies)
      .expect(204);
  });

  it('non-owner cannot transfer ownership', async () => {
    const owner = await registerAndLogin('xfer-deny-owner');
    const member = await registerAndLogin('xfer-deny-member');
    const shared = await createSharedSpace(owner.cookies);
    await inviteAndAccept(owner.cookies, member, shared.id);

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${shared.id}/ownership/transfer`)
      .set('Cookie', member.cookies)
      .send({ newOwnerUserId: owner.userId })
      .expect(403)
      .expect((r) => {
        expect((r.body as { code?: string }).code).toBe('INSUFFICIENT_ROLE');
      });
  });

  it('rejects transfer to self', async () => {
    const owner = await registerAndLogin('xfer-self');
    const shared = await createSharedSpace(owner.cookies);

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${shared.id}/ownership/transfer`)
      .set('Cookie', owner.cookies)
      .send({ newOwnerUserId: owner.userId })
      .expect(409)
      .expect((r) => {
        expect((r.body as { code?: string }).code).toBe('TRANSFER_TO_SELF');
      });
  });

  it('returns 404 when transfer target is not an active member', async () => {
    const owner = await registerAndLogin('xfer-miss-owner');
    const outsider = await registerAndLogin('xfer-outsider');
    const shared = await createSharedSpace(owner.cookies);

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${shared.id}/ownership/transfer`)
      .set('Cookie', owner.cookies)
      .send({ newOwnerUserId: outsider.userId })
      .expect(404)
      .expect((r) => {
        expect((r.body as { code?: string }).code).toBe('MEMBER_NOT_FOUND');
      });
  });

  it('owner removes member (REMOVED)', async () => {
    const owner = await registerAndLogin('rem-owner');
    const member = await registerAndLogin('rem-member');
    const shared = await createSharedSpace(owner.cookies);
    await inviteAndAccept(owner.cookies, member, shared.id);

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${shared.id}/members/${member.userId}/remove`)
      .set('Cookie', owner.cookies)
      .expect(204);

    const prisma = app.get(PrismaService);
    const row = await prisma.spaceMembership.findFirst({
      where: { spaceId: shared.id, userId: member.userId },
    });
    expect(row?.status).toBe('REMOVED');
    expect(row?.leftAt).not.toBeNull();
  });

  it('admin cannot remove another admin', async () => {
    const owner = await registerAndLogin('adm-owner');
    const adminA = await registerAndLogin('adm-a');
    const adminB = await registerAndLogin('adm-b');
    const shared = await createSharedSpace(owner.cookies);

    for (const admin of [adminA, adminB]) {
      const inviteRes = await request(app.getHttpServer())
        .post(`/api/v1/spaces/${shared.id}/invitations`)
        .set('Cookie', owner.cookies)
        .send({ email: admin.email, role: 'ADMIN' })
        .expect(201);

      await request(app.getHttpServer())
        .post(
          `/api/v1/invitations/${(inviteRes.body as InvitationBody).id}/accept`,
        )
        .set('Cookie', admin.cookies)
        .expect(204);
    }

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${shared.id}/members/${adminB.userId}/remove`)
      .set('Cookie', adminA.cookies)
      .expect(403)
      .expect((r) => {
        expect((r.body as { code?: string }).code).toBe('INSUFFICIENT_ROLE');
      });
  });

  it('returns 404 when listing members of another user space (anti-IDOR)', async () => {
    const owner = await registerAndLogin('idor-owner');
    const outsider = await registerAndLogin('idor-outsider');
    const shared = await createSharedSpace(owner.cookies);

    await request(app.getHttpServer())
      .get(`/api/v1/spaces/${shared.id}/members`)
      .set('Cookie', outsider.cookies)
      .expect(404)
      .expect((r) => {
        expect((r.body as { code?: string }).code).toBe('SPACE_NOT_FOUND');
      });
  });

  it('rejects GET members on PERSONAL space', async () => {
    const user = await registerAndLogin('personal-members');
    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', user.cookies)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/spaces/${(me.body as MeBody).personalSpaceId}/members`)
      .set('Cookie', user.cookies)
      .expect(403)
      .expect((r) => {
        expect((r.body as { code?: string }).code).toBe('SPACE_NOT_SHARED');
      });
  });

  it('owner cannot remove self (USE_LEAVE_INSTEAD)', async () => {
    const owner = await registerAndLogin('self-remove');
    const shared = await createSharedSpace(owner.cookies);

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${shared.id}/members/${owner.userId}/remove`)
      .set('Cookie', owner.cookies)
      .expect(409)
      .expect((r) => {
        expect((r.body as { code?: string }).code).toBe('USE_LEAVE_INSTEAD');
      });
  });

  it('rejects leave on PERSONAL space', async () => {
    const user = await registerAndLogin('personal-leave');
    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', user.cookies)
      .expect(200);

    await request(app.getHttpServer())
      .post(
        `/api/v1/spaces/${(me.body as MeBody).personalSpaceId}/membership/leave`,
      )
      .set('Cookie', user.cookies)
      .expect(403)
      .expect((r) => {
        expect((r.body as { code?: string }).code).toBe('SPACE_NOT_SHARED');
      });
  });
});
