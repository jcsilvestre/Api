import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { VerificationToken } from '../entities/verification-token.entity';
import { LoginHistory } from '../entities/login-history.entity';
import { Session } from '../entities/session.entity';
import { SignupDto } from './dto/signup.dto';
import { SigninDto } from './dto/signin.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(VerificationToken) private readonly tokens: Repository<VerificationToken>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    @InjectRepository(LoginHistory) private readonly logs: Repository<LoginHistory>,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  async signup(dto: SignupDto, ip?: string, ua?: string) {
    const existing = await this.users.findOne({ where: { email: dto.email } });
    if (existing) return { success: false, error: { code: 'EMAIL_IN_USE' } };
    const password_hash = await bcrypt.hash(dto.password, 10);
    const user = await this.users.save({ email: dto.email, full_name: dto.full_name ?? null, password_hash, status: 'pending_verification' });
    const code = (Math.floor(100000 + Math.random() * 900000)).toString();
    const token_hash = crypto.createHash('sha256').update(code).digest('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.tokens.save({ user_id: user.id, token: code, token_hash, token_type: 'email_verification', expires_at: expires, ip_address: ip ?? null, user_agent: ua ?? null });
    void this.mail.sendVerificationCode(user.email, code);
    return { success: true, data: { user_id: user.id } };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.users.findOne({ where: { email: dto.email } });
    if (!user) return { success: false, error: { code: 'USER_NOT_FOUND' } };
    const token_hash = crypto.createHash('sha256').update(dto.code).digest('hex');
    const token = await this.tokens.findOne({ where: { user_id: user.id, token_hash, token_type: 'email_verification', is_used: false } });
    if (!token || token.expires_at.getTime() <= Date.now()) return { success: false, error: { code: 'INVALID_CODE' } };
    token.is_used = true;
    token.used_at = new Date();
    await this.tokens.save(token);
    user.is_email_verified = true;
    user.email_verified_at = new Date();
    user.status = 'active';
    await this.users.save(user);
    await this.logs.save({ user_id: user.id, action: 'login_success', status: 'success', ip_address: '0.0.0.0' });
    return { success: true };
  }

  async signin(dto: SigninDto, ip: string, ua: string) {
    const user = await this.users.findOne({ where: { email: dto.email } });
    if (!user || !user.password_hash) {
      await this.logs.save({ attempted_email: dto.email, action: 'login_failed', status: 'failed', ip_address: ip });
      return { success: false, error: { code: 'INVALID_CREDENTIALS' } };
    }
    const ok = await bcrypt.compare(dto.password, user.password_hash);
    if (!ok || user.status !== 'active') {
      await this.logs.save({ user_id: user.id, action: 'login_failed', status: 'failed', ip_address: ip });
      return { success: false, error: { code: 'INVALID_CREDENTIALS' } };
    }
    const access = await this.jwt.signAsync({ sub: user.id });
    const refreshRaw = crypto.randomUUID();
    const refreshHash = crypto.createHash('sha256').update(refreshRaw).digest('hex');
    await this.sessions.save({ user_id: user.id, refresh_token: refreshRaw, refresh_token_hash: refreshHash, ip_address: ip, user_agent: ua, expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), is_active: true });
    return { success: true, data: { accessToken: access, refreshToken: refreshRaw } };
  }
}
