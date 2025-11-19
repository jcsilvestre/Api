import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../entities/user.entity';
import { VerificationToken } from '../entities/verification-token.entity';
import { Session } from '../entities/session.entity';
import { LoginHistory } from '../entities/login-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, VerificationToken, Session, LoginHistory]),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev_secret',
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
