import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { UsersModule } from './users/users.module';
import { SessionsModule } from './sessions/sessions.module';
import { MfaModule } from './mfa/mfa.module';
import { OauthModule } from './oauth/oauth.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL ?? '60'),
        limit: parseInt(process.env.THROTTLE_LIMIT ?? '5'),
      },
    ]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.PGHOST ?? '127.0.0.1',
      port: parseInt(process.env.PGPORT ?? '5432'),
      username: process.env.PGUSER ?? 'jcscode',
      password: process.env.PGPASSWORD ?? '123456',
      database: process.env.PGDATABASE ?? 'jcscode',
      schema: 'auth',
      autoLoadEntities: true,
      synchronize: false,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'test', 'html'),
      serveRoot: '/v1',
    }),
    AuthModule,
    MailModule,
    UsersModule,
    SessionsModule,
    MfaModule,
    OauthModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
