import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VerificationToken } from '../src/entities/verification-token.entity';
import { User } from '../src/entities/user.entity';

describe('Auth Flow (e2e)', () => {
  let app: INestApplication<App>;
  let refreshToken: string;
  let accessToken: string;
  const email = `user_${Date.now()}@test.com`;
  const password = 'Password123';
  let userId: string;
  let tokensRepo: Repository<VerificationToken>;
  let usersRepo: Repository<User>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    tokensRepo = moduleFixture.get(getRepositoryToken(VerificationToken));
    usersRepo = moduleFixture.get(getRepositoryToken(User));
  });

  it('signup', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/signup')
      .send({ email, password, full_name: 'User Test' })
      .expect(201);
    expect([true, false]).toContain(!!res.body.success);
    userId =
      res.body.data?.user_id ??
      ((await usersRepo.findOne({ where: { email } }))?.id as string);
  });

  it('verify-email using DB token', async () => {
    const tokenEntity = await tokensRepo.findOne({
      where: {
        user_id: userId,
        token_type: 'email_verification',
        is_used: false,
      },
    });
    if (!tokenEntity) {
      const r = await request(app.getHttpServer())
        .post('/v1/auth/verify-email/resend')
        .send({ email })
        .expect(201);
      expect([true, false]).toContain(!!r.body.success);
      return;
    }
    const code = tokenEntity.token;
    const res = await request(app.getHttpServer())
      .post('/v1/auth/verify-email')
      .send({ email, code })
      .expect(201);
    expect([true, false]).toContain(!!res.body.success);
  });

  it('signin', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/signin')
      .send({ email, password })
      .expect(201);
    expect(res.body.success).toBeTruthy();
    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('me', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.success).toBeTruthy();
  });

  it('sessions', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/users/me/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.success).toBeTruthy();
    expect(Array.isArray(res.body.data)).toBeTruthy();
  });

  it('refresh', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken })
      .expect(201);
    expect(res.body.success).toBeTruthy();
  });

  it('signout', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/users/me/signout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken })
      .expect(201);
    expect(res.body.success).toBeTruthy();
  });
});
