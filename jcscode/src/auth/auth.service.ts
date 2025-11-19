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
import { RefreshDto } from './dto/refresh.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { ResendVerifyDto } from './dto/resend-verify.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MagicLinkDto } from './dto/magic-link.dto';
import { MagicLinkVerifyDto } from './dto/magic-link-verify.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(VerificationToken)
    private readonly tokens: Repository<VerificationToken>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    @InjectRepository(LoginHistory)
    private readonly logs: Repository<LoginHistory>,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  async signup(dto: SignupDto, ip?: string, ua?: string) {
    const existing = await this.users.findOne({ where: { email: dto.email } });
    if (existing) return { success: false, error: { code: 'EMAIL_IN_USE' } };
    const password_hash = await bcrypt.hash(dto.password, 10);
    const user = await this.users.save({
      email: dto.email,
      full_name: dto.full_name ?? null,
      password_hash,
      status: 'pending_verification',
    });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const token_hash = crypto.createHash('sha256').update(code).digest('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.tokens.save({
      user_id: user.id,
      token: code,
      token_hash,
      token_type: 'email_verification',
      expires_at: expires,
      ip_address: ip ?? null,
      user_agent: ua ?? null,
    });
    void this.mail.sendVerificationCode(user.email, code);
    return { success: true, data: { user_id: user.id } };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.users.findOne({ where: { email: dto.email } });
    if (!user) return { success: false, error: { code: 'USER_NOT_FOUND' } };
    const token_hash = crypto
      .createHash('sha256')
      .update(dto.code)
      .digest('hex');
    const token = await this.tokens.findOne({
      where: {
        user_id: user.id,
        token_hash,
        token_type: 'email_verification',
        is_used: false,
      },
    });
    if (!token || token.expires_at.getTime() <= Date.now())
      return { success: false, error: { code: 'INVALID_CODE' } };
    token.is_used = true;
    token.used_at = new Date();
    await this.tokens.save(token);
    user.is_email_verified = true;
    user.email_verified_at = new Date();
    await this.users.save(user);
    return { success: true };
  }

  async signin(dto: SigninDto, ip: string, ua: string) {
    const user = await this.users.findOne({ where: { email: dto.email } });
    if (!user || !user.password_hash) {
      await this.logs.save({
        attempted_email: dto.email,
        action: 'login_failed',
        status: 'failed',
        ip_address: ip,
      });
      return { success: false, error: { code: 'INVALID_CREDENTIALS' } };
    }
    const ok = await bcrypt.compare(dto.password, user.password_hash);
    if (!ok) {
      await this.logs.save({
        user_id: user.id,
        action: 'login_failed',
        status: 'failed',
        ip_address: ip,
      });
      return { success: false, error: { code: 'INVALID_CREDENTIALS' } };
    }
    const access = await this.jwt.signAsync({ sub: user.id });
    const refreshRaw = crypto.randomUUID();
    const refreshHash = crypto
      .createHash('sha256')
      .update(refreshRaw)
      .digest('hex');
    await this.sessions.save({
      user_id: user.id,
      refresh_token: refreshRaw,
      refresh_token_hash: refreshHash,
      ip_address: ip,
      user_agent: ua,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      is_active: true,
    });
    return {
      success: true,
      data: { accessToken: access, refreshToken: refreshRaw },
    };
  }

  async refresh(dto: RefreshDto, ip: string, _ua: string) {
    const hash = crypto
      .createHash('sha256')
      .update(dto.refreshToken)
      .digest('hex');
    const session = await this.sessions.findOne({
      where: { refresh_token_hash: hash, is_active: true },
    });
    if (!session || session.expires_at.getTime() <= Date.now())
      return { success: false, error: { code: 'INVALID_REFRESH' } };
    const access = await this.jwt.signAsync({ sub: session.user_id });
    session.last_activity_at = new Date();
    await this.sessions.save(session);
    await this.logs.save({
      user_id: session.user_id,
      action: 'token_refresh',
      status: 'success',
      ip_address: ip,
    });
    return { success: true, data: { accessToken: access } };
  }

  async checkAvailability(dto: CheckAvailabilityDto) {
    if (dto.email) {
      const u = await this.users.findOne({ where: { email: dto.email } });
      return { success: true, data: { emailAvailable: !u } };
    }
    if (dto.username) {
      const u = await this.users.findOne({ where: { username: dto.username } });
      return { success: true, data: { usernameAvailable: !u } };
    }
    return { success: false, error: { code: 'MISSING_QUERY' } };
  }

  async resendVerification(dto: ResendVerifyDto, ip?: string, ua?: string) {
    const user = await this.users.findOne({ where: { email: dto.email } });
    if (!user) return { success: false, error: { code: 'USER_NOT_FOUND' } };
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const token_hash = crypto.createHash('sha256').update(code).digest('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.tokens.save({
      user_id: user.id,
      token: code,
      token_hash,
      token_type: 'email_verification',
      expires_at: expires,
      ip_address: ip ?? null,
      user_agent: ua ?? null,
    });
    void this.mail.sendVerificationCode(user.email, code);
    return { success: true };
  }

  async forgotPassword(dto: ForgotPasswordDto, ip?: string, ua?: string) {
    const user = await this.users.findOne({ where: { email: dto.email } });
    if (!user) return { success: false, error: { code: 'USER_NOT_FOUND' } };
    const token = crypto.randomUUID();
    const token_hash = crypto.createHash('sha256').update(token).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await this.tokens.save({
      user_id: user.id,
      token,
      token_hash,
      token_type: 'password_reset',
      expires_at: expires,
      ip_address: ip ?? null,
      user_agent: ua ?? null,
    });
    void this.mail.sendResetPassword(user.email, token);
    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const token_hash = crypto
      .createHash('sha256')
      .update(dto.token)
      .digest('hex');
    const token = await this.tokens.findOne({
      where: { token_hash, token_type: 'password_reset', is_used: false },
    });
    if (!token || token.expires_at.getTime() <= Date.now())
      return { success: false, error: { code: 'INVALID_TOKEN' } };
    const user = await this.users.findOne({ where: { id: token.user_id } });
    if (!user) return { success: false, error: { code: 'USER_NOT_FOUND' } };
    user.password_hash = await bcrypt.hash(dto.new_password, 10);
    user.last_password_change = new Date();
    await this.users.save(user);
    token.is_used = true;
    token.used_at = new Date();
    await this.tokens.save(token);
    await this.logs.save({
      user_id: user.id,
      action: 'password_reset',
      status: 'success',
      ip_address: '0.0.0.0',
    });
    return { success: true };
  }

  async createMagicLink(dto: MagicLinkDto, ip?: string, ua?: string) {
    const user = await this.users.findOne({ where: { email: dto.email } });
    if (!user) return { success: true };
    const token = crypto.randomUUID();
    const token_hash = crypto.createHash('sha256').update(token).digest('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    await this.tokens.save({
      user_id: user.id,
      token,
      token_hash,
      token_type: 'magic_link',
      expires_at: expires,
      ip_address: ip ?? null,
      user_agent: ua ?? null,
    });
    void this.mail.sendResetPassword(user.email, token);
    return { success: true };
  }

  async verifyMagicLink(dto: MagicLinkVerifyDto, ip: string, ua: string) {
    const token_hash = crypto
      .createHash('sha256')
      .update(dto.token)
      .digest('hex');
    const token = await this.tokens.findOne({
      where: { token_hash, token_type: 'magic_link', is_used: false },
    });
    if (!token || token.expires_at.getTime() <= Date.now())
      return { success: false, error: { code: 'INVALID_TOKEN' } };
    const user = await this.users.findOne({ where: { id: token.user_id } });
    if (!user) return { success: false, error: { code: 'USER_NOT_FOUND' } };
    const access = await this.jwt.signAsync({ sub: user.id });
    const refreshRaw = crypto.randomUUID();
    const refreshHash = crypto
      .createHash('sha256')
      .update(refreshRaw)
      .digest('hex');
    await this.sessions.save({
      user_id: user.id,
      refresh_token: refreshRaw,
      refresh_token_hash: refreshHash,
      ip_address: ip,
      user_agent: ua,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      is_active: true,
    });
    token.is_used = true;
    token.used_at = new Date();
    await this.tokens.save(token);
    return {
      success: true,
      data: { accessToken: access, refreshToken: refreshRaw },
    };
  }

  async introspectToken(token: string) {
    try {
      const payload = await this.jwt.verifyAsync(token, {
        secret: process.env.JWT_SECRET ?? 'dev_secret',
      });
      return { success: true, data: { valid: true, payload } };
    } catch {
      return { success: true, data: { valid: false } };
    }
  }

  async revokeRefresh(dto: RefreshDto) {
    const hash = crypto
      .createHash('sha256')
      .update(dto.refreshToken)
      .digest('hex');
    const session = await this.sessions.findOne({
      where: { refresh_token_hash: hash, is_active: true },
    });
    if (!session) return { success: true };
    session.is_active = false;
    session.revoked_at = new Date();
    await this.sessions.save(session);
    return { success: true };
  }
}
