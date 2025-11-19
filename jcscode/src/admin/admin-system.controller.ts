import { Controller, Get, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Session } from '../entities/session.entity';
import { LoginHistory } from '../entities/login-history.entity';
import { VerificationToken } from '../entities/verification-token.entity';

@Controller('admin')
export class AdminSystemController {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    @InjectRepository(LoginHistory)
    private readonly logsRepo: Repository<LoginHistory>,
    @InjectRepository(VerificationToken)
    private readonly tokensRepo: Repository<VerificationToken>,
  ) {}

  @Get('stats')
  async stats() {
    const totalUsers = await this.users.count();
    const activeSessions = await this.sessions.count({
      where: { is_active: true },
    });
    return { success: true, data: { totalUsers, activeSessions } };
  }

  @Get('logs/login')
  async loginLogs() {
    const data = await this.logsRepo.find({
      order: { created_at: 'DESC' },
      take: 100,
    });
    return { success: true, data };
  }

  @Get('maintenance/status')
  async maintenanceStatus() {
    const expiredTokens = await this.tokensRepo.count({
      where: { is_used: false },
    });
    return { success: true, data: { expiredTokens } };
  }

  @Post('maintenance/cleanup')
  async cleanup() {
    // simplistic cleanup: mark expired tokens as used
    const now = Date.now();
    const list = await this.tokensRepo.find({ where: { is_used: false } });
    for (const t of list) {
      if (t.expires_at.getTime() < now) {
        t.is_used = true;
        t.used_at = new Date();
      }
    }
    await this.tokensRepo.save(list);
    return { success: true };
  }

  @Post('sessions/revoke-all')
  async revokeAllSessions() {
    const list = await this.sessions.find({ where: { is_active: true } });
    for (const s of list) {
      s.is_active = false;
      s.revoked_at = new Date();
    }
    await this.sessions.save(list);
    return { success: true };
  }
}
