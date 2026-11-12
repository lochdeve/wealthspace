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
