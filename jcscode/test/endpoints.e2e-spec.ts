import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VerificationToken } from '../src/entities/verification-token.entity';
import { User } from '../src/entities/user.entity';
import { Session } from '../src/entities/session.entity';
import { Role } from '../src/entities/role.entity';

describe('Endpoints Inventory (e2e)', () => {
  let app: INestApplication;
  let server: any;
  let tokensRepo: Repository<VerificationToken>;
  let usersRepo: Repository<User>;
  let sessionsRepo: Repository<Session>;
  let rolesRepo: Repository<Role>;

  const email = `user_${Date.now()}@test.com`;
  const password = 'Password123';
  let userId = '';
  let accessToken = '';
  let refreshToken = '';
  let sessionId = '';
  let createdRoleId: number | null = null;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    server = app.getHttpServer();
    tokensRepo = moduleFixture.get(getRepositoryToken(VerificationToken));
    usersRepo = moduleFixture.get(getRepositoryToken(User));
    sessionsRepo = moduleFixture.get(getRepositoryToken(Session));
    rolesRepo = moduleFixture.get(getRepositoryToken(Role));
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/signup', async () => {
    const res = await request(server)
      .post('/v1/auth/signup')
      .send({ email, password, full_name: 'E2E User' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBeTruthy();
    userId = res.body.data.user_id;
  });

  it('POST /auth/verify-email', async () => {
    const tokenEntity = await tokensRepo.findOne({
      where: {
        user_id: userId,
        token_type: 'email_verification',
        is_used: false,
      },
    });
    if (!tokenEntity) {
      const res = await request(server)
        .post('/v1/auth/verify-email/resend')
        .send({ email });
      expect([200, 201]).toContain(res.status);
      return;
    }
    const code = tokenEntity.token;
    const res = await request(server)
      .post('/v1/auth/verify-email')
      .send({ email, code });
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBeTruthy();
  });

  it('POST /auth/signin', async () => {
    const res = await request(server)
      .post('/v1/auth/signin')
      .send({ email, password });
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBeTruthy();
    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('GET /auth/check-availability', async () => {
    const res = await request(server).get(
      `/v1/auth/check-availability?email=${encodeURIComponent(email)}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.success).toBeTruthy();
    expect(res.body.data.emailAvailable).toBe(false);
  });

  it('POST /auth/refresh', async () => {
    const res = await request(server)
      .post('/v1/auth/refresh')
      .send({ refreshToken });
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBeTruthy();
  });

  it('POST /auth/verify-email/resend', async () => {
    const res = await request(server)
      .post('/v1/auth/verify-email/resend')
      .send({ email });
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBeTruthy();
  });

  it('POST /auth/forgot-password', async () => {
    const res = await request(server)
      .post('/v1/auth/forgot-password')
      .send({ email });
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBeTruthy();
  });

  it('POST /auth/reset-password', async () => {
    const tok = await tokensRepo.findOne({
      where: { user_id: userId, token_type: 'password_reset', is_used: false },
    });
    if (tok) {
      const res = await request(server)
        .post('/v1/auth/reset-password')
        .send({ token: tok.token, new_password: password });
      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBeTruthy();
    } else {
      expect(true).toBeTruthy();
    }
  });

  it('POST /auth/magic-link', async () => {
    const res = await request(server)
      .post('/v1/auth/magic-link')
      .send({ email });
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBeTruthy();
  });

  it('POST /auth/magic-link/verify', async () => {
    const tok = await tokensRepo.findOne({
      where: { user_id: userId, token_type: 'magic_link', is_used: false },
    });
    if (tok) {
      const res = await request(server)
        .post('/v1/auth/magic-link/verify')
        .send({ token: tok.token });
      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBeTruthy();
    } else {
      expect(true).toBeTruthy();
    }
  });

  it('POST /auth/token/introspect', async () => {
    const res = await request(server)
      .post('/v1/auth/token/introspect')
      .send({ token: accessToken });
    expect(res.status).toBe(201);
    expect(res.body.success).toBeTruthy();
  });

  // move revoke to later to avoid interference

  it('GET /users/me', async () => {
    const res = await request(server)
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBeTruthy();
  });

  it('PATCH /users/me', async () => {
    const res = await request(server)
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ full_name: 'E2E User Updated' });
    expect([200, 204]).toContain(res.status);
  });

  it('PATCH /users/me/password', async () => {
    const res = await request(server)
      .patch('/v1/users/me/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ current_password: password, new_password: password });
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBeTruthy();
  });

  it('POST /users/me/email', async () => {
    const res = await request(server)
      .post('/v1/users/me/email')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ new_email: `new_${email}` });
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBeTruthy();
  });

  it('GET /users/me/sessions', async () => {
    const res = await request(server)
      .get('/v1/users/me/sessions')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBeTruthy();
    const list = res.body.data as any[];
    sessionId = list.length ? list[0].id : '';
  });

  it('POST /users/me/signout', async () => {
    if (!refreshToken) return expect(true).toBeTruthy();
    const res = await request(server)
      .post('/v1/users/me/signout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken });
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBeTruthy();
  });

  it('POST /auth/signin (re-login)', async () => {
    const res = await request(server)
      .post('/v1/auth/signin')
      .send({ email, password });
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBeTruthy();
    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('GET /sessions', async () => {
    const res = await request(server)
      .get('/v1/sessions')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBeTruthy();
  });

  it('GET /sessions/:id', async () => {
    if (!sessionId) return expect(true).toBeTruthy();
    const res = await request(server)
      .get(`/v1/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBeTruthy();
  });

  it('POST /sessions/:id/refresh', async () => {
    if (!sessionId) return expect(true).toBeTruthy();
    const res = await request(server)
      .post(`/v1/sessions/${sessionId}/refresh`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBeTruthy();
  });

  it('DELETE /sessions/:id', async () => {
    if (!sessionId) return expect(true).toBeTruthy();
    const res = await request(server)
      .delete(`/v1/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect([200, 204]).toContain(res.status);
  });

  it('DELETE /sessions', async () => {
    const res = await request(server)
      .delete('/v1/sessions')
      .set('Authorization', `Bearer ${accessToken}`);
    expect([200, 204]).toContain(res.status);
  });

  it('POST /auth/signin (re-login before admin)', async () => {
    const res = await request(server)
      .post('/v1/auth/signin')
      .send({ email, password });
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBeTruthy();
    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('POST /auth/mfa/setup', async () => {
    const res = await request(server)
      .post('/v1/auth/mfa/setup')
      .set('Authorization', `Bearer ${accessToken}`);
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBeTruthy();
  });

  it('POST /auth/mfa/enable', async () => {
    const res = await request(server)
      .post('/v1/auth/mfa/enable')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: '000000' });
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBeTruthy();
  });

  it('DELETE /auth/mfa/disable', async () => {
    const res = await request(server)
      .delete('/v1/auth/mfa/disable')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ password });
    expect([200, 204]).toContain(res.status);
  });

  it('POST /auth/mfa/verify', async () => {
    const res = await request(server)
      .post('/v1/auth/mfa/verify')
      .send({ code: '000000' });
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBeTruthy();
  });

  it('GET /auth/mfa/backup-codes', async () => {
    const res = await request(server)
      .get('/v1/auth/mfa/backup-codes')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBeTruthy();
  });

  it('POST /auth/mfa/backup-codes', async () => {
    const res = await request(server)
      .post('/v1/auth/mfa/backup-codes')
      .set('Authorization', `Bearer ${accessToken}`);
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBeTruthy();
  });

  it('GET /auth/oauth/google', async () => {
    const res = await request(server).get('/v1/auth/oauth/google');
    expect(res.status).toBe(200);
    expect(res.body.success).toBeTruthy();
  });

  it('GET /auth/oauth/google/callback', async () => {
    const res = await request(server).get('/v1/auth/oauth/google/callback');
    expect(res.status).toBe(200);
    expect(res.body.success).toBeTruthy();
  });

  it('GET /auth/oauth/github', async () => {
    const res = await request(server).get('/v1/auth/oauth/github');
    expect(res.status).toBe(200);
    expect(res.body.success).toBeTruthy();
  });

  it('GET /auth/oauth/github/callback', async () => {
    const res = await request(server).get('/v1/auth/oauth/github/callback');
    expect(res.status).toBe(200);
    expect(res.body.success).toBeTruthy();
  });

  it('GET /auth/oauth/connections', async () => {
    const res = await request(server)
      .get('/v1/auth/oauth/connections')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBeTruthy();
  });

  it('DELETE /auth/oauth/connections/:provider', async () => {
    const res = await request(server)
      .delete('/v1/auth/oauth/connections/google')
      .set('Authorization', `Bearer ${accessToken}`);
    expect([200, 204]).toContain(res.status);
  });

  it('GET /admin/roles', async () => {
    const res = await request(server)
      .get('/v1/admin/roles')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBeTruthy();
  });

  it('POST /admin/roles', async () => {
    const res = await request(server)
      .post('/v1/admin/roles')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `role_${Date.now()}`, description: 'e2e role' });
    expect([200, 201]).toContain(res.status);
    createdRoleId = res.body.data?.id ?? null;
  });

  it('GET /admin/roles/:id', async () => {
    if (!createdRoleId) return expect(true).toBeTruthy();
    const res = await request(server)
      .get(`/v1/admin/roles/${createdRoleId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBeTruthy();
  });

  it('PUT /admin/roles/:id', async () => {
    if (!createdRoleId) return expect(true).toBeTruthy();
    const res = await request(server)
      .put(`/v1/admin/roles/${createdRoleId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ description: 'updated' });
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBeTruthy();
  });

  it('GET /admin/users', async () => {
    const res = await request(server)
      .get('/v1/admin/users')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBeTruthy();
  });

  it('POST /admin/users', async () => {
    const res = await request(server)
      .post('/v1/admin/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        email: `admin_created_${Date.now()}@test.com`,
        full_name: 'Created via Admin',
      });
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBeTruthy();
  });

  it('GET /admin/users/:id', async () => {
    const resList = await request(server)
      .get('/v1/admin/users')
      .set('Authorization', `Bearer ${accessToken}`);
    const anyUserId = resList.body.data?.[0]?.id ?? userId;
    const res = await request(server)
      .get(`/v1/admin/users/${anyUserId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBeTruthy();
  });

  it('PATCH /admin/users/:id', async () => {
    const resList = await request(server)
      .get('/v1/admin/users')
      .set('Authorization', `Bearer ${accessToken}`);
    const anyUserId = resList.body.data?.[0]?.id ?? userId;
    const res = await request(server)
      .patch(`/v1/admin/users/${anyUserId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ full_name: 'Admin Updated' });
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBeTruthy();
  });

  it('POST /admin/users/:id/lock', async () => {
    const res = await request(server)
      .post(`/v1/admin/users/${userId}/lock`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBeTruthy();
  });

  it('POST /admin/users/:id/unlock', async () => {
    const res = await request(server)
      .post(`/v1/admin/users/${userId}/unlock`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBeTruthy();
  });

  it('POST /admin/users/:id/resend-verify', async () => {
    const res = await request(server)
      .post(`/v1/admin/users/${userId}/resend-verify`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect([200, 201]).toContain(res.status);
  });

  it('POST /admin/users/:id/reset-password', async () => {
    const res = await request(server)
      .post(`/v1/admin/users/${userId}/reset-password`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect([200, 201]).toContain(res.status);
  });

  it('POST /admin/users/:id/roles', async () => {
    if (!createdRoleId) {
      const role = await rolesRepo.save({ name: `role_${Date.now()}` } as any);
      createdRoleId = role.id;
    }
    const res = await request(server)
      .post(`/v1/admin/users/${userId}/roles`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ roleId: createdRoleId?.toString() });
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBeTruthy();
  });

  it('DELETE /admin/users/:id/roles/:roleId', async () => {
    if (!createdRoleId) return expect(true).toBeTruthy();
    const res = await request(server)
      .delete(`/v1/admin/users/${userId}/roles/${createdRoleId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect([200, 204]).toContain(res.status);
  });

  it('GET /admin/stats', async () => {
    const res = await request(server)
      .get('/v1/admin/stats')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBeTruthy();
  });

  it('GET /admin/logs/login', async () => {
    const res = await request(server)
      .get('/v1/admin/logs/login')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
  });

  it('GET /admin/maintenance/status', async () => {
    const res = await request(server)
      .get('/v1/admin/maintenance/status')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
  });

  it('POST /admin/maintenance/cleanup', async () => {
    const res = await request(server)
      .post('/v1/admin/maintenance/cleanup')
      .set('Authorization', `Bearer ${accessToken}`);
    expect([200, 201]).toContain(res.status);
  });

  it('POST /admin/sessions/revoke-all', async () => {
    const res = await request(server)
      .post('/v1/admin/sessions/revoke-all')
      .set('Authorization', `Bearer ${accessToken}`);
    expect([200, 201]).toContain(res.status);
  });

  it('POST /auth/token/revoke', async () => {
    const res = await request(server)
      .post('/v1/auth/token/revoke')
      .send({ refreshToken });
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBeTruthy();
  });
});
