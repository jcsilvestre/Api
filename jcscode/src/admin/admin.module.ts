import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { AdminUsersController } from './admin-users.controller';
import {
  AdminRolesController,
  AdminUserRolesController,
} from './admin-roles.controller';
import { AdminSystemController } from './admin-system.controller';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { UserRole } from '../entities/user-role.entity';
import { Session } from '../entities/session.entity';
import { LoginHistory } from '../entities/login-history.entity';
import { VerificationToken } from '../entities/verification-token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      UserRole,
      Session,
      LoginHistory,
      VerificationToken,
    ]),
    PassportModule,
  ],
  controllers: [
    AdminUsersController,
    AdminRolesController,
    AdminUserRolesController,
    AdminSystemController,
  ],
})
export class AdminModule {}
