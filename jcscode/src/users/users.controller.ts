import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Patch,
  Delete,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '@nestjs/passport';
import { User } from '../entities/user.entity';
import { Session } from '../entities/session.entity';
import { UserRole } from '../entities/user-role.entity';
import { Role } from '../entities/role.entity';
import { In } from 'typeorm';
import { LoginHistory } from '../entities/login-history.entity';
import { Request } from 'express';
import * as crypto from 'crypto';
import bcrypt from 'bcrypt';

class SignoutDto {
  refreshToken!: string;
}
class UpdateMeDto {
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  language?: string;
  timezone?: string;
}
class ChangePasswordDto {
  current_password!: string;
  new_password!: string;
}
class ChangeEmailDto {
  new_email!: string;
}
class ConsentDto {
  version!: string;
  context?: string;
}

@Controller('users/me')
export class UsersController {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    @InjectRepository(UserRole)
    private readonly userRoles: Repository<UserRole>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(LoginHistory)
    private readonly logs: Repository<LoginHistory>,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async me(@Req() req: Request & { user: { userId: string } }) {
    const userId = req.user.userId;
    const user = await this.users.findOne({ where: { id: userId } });
    const urs = await this.userRoles.find({ where: { user_id: userId } });
    const roleIds = urs.map((u) => u.role_id);
    const roles = roleIds.length
      ? await this.roles.find({ where: { id: In(roleIds) } })
      : [];
    return { success: true, data: { user, roles } };
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch()
  async updateMe(
    @Req() req: Request & { user: { userId: string } },
    @Body() body: UpdateMeDto,
  ) {
    const userId = req.user.userId;
    await this.users.update({ id: userId }, body);
    const user = await this.users.findOne({ where: { id: userId } });
    return { success: true, data: user };
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('password')
  async changePassword(
    @Req() req: Request & { user: { userId: string } },
    @Body() body: ChangePasswordDto,
  ) {
    const userId = req.user.userId;
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || !user.password_hash)
      return { success: false, error: { code: 'INVALID_CURRENT' } };
    const ok = await bcrypt.compare(body.current_password, user.password_hash);
    if (!ok) return { success: false, error: { code: 'INVALID_CURRENT' } };
    const hash = await bcrypt.hash(body.new_password, 10);
    await this.users.update(
      { id: userId },
      { password_hash: hash, last_password_change: new Date() },
    );
    return { success: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('email')
  requestEmailChange(
    @Req() _req: Request & { user: { userId: string } },
    @Body() _body: ChangeEmailDto,
  ) {
    return { success: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete()
  async deleteMe(@Req() req: Request & { user: { userId: string } }) {
    const userId = req.user.userId;
    await this.users.update(
      { id: userId },
      { deleted_at: new Date(), status: 'deleted' } as any,
    );
    return { success: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('consent')
  consent(
    @Req() _req: Request & { user: { userId: string } },
    @Body() _body: ConsentDto,
  ) {
    return { success: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('security-logs')
  securityLogs() {
    return { success: true, data: [] };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('login-history')
  async loginHistory(@Req() req: Request & { user: { userId: string } }) {
    const userId = req.user.userId;
    const history = await this.logs.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: 50,
    });
    return { success: true, data: history };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('sessions')
  async sessionsList(@Req() req: Request & { user: { userId: string } }) {
    const userId = req.user.userId;
    const list = await this.sessions.find({ where: { user_id: userId } });
    return { success: true, data: list };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('signout')
  async signout(
    @Req() req: Request & { user: { userId: string } },
    @Body() body: SignoutDto,
  ) {
    const userId = req.user.userId;
    const hash = crypto
      .createHash('sha256')
      .update(body.refreshToken)
      .digest('hex');
    const sess = await this.sessions.findOne({
      where: { user_id: userId, refresh_token_hash: hash, is_active: true },
    });
    if (!sess) return { success: true };
    sess.is_active = false;
    sess.revoked_at = new Date();
    await this.sessions.save(sess);
    return { success: true };
  }
}
