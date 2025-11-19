import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { User } from '../entities/user.entity';
import { Session } from '../entities/session.entity';
import { UserRole } from '../entities/user-role.entity';
import { Role } from '../entities/role.entity';
import { LoginHistory } from '../entities/login-history.entity';
import { PassportModule } from '@nestjs/passport';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Session, UserRole, Role, LoginHistory]),
    PassportModule,
    AuthModule,
  ],
  controllers: [UsersController],
})
export class UsersModule {}
