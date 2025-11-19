import {
  Body,
  Controller,
  Ip,
  Post,
  Req,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { SigninDto } from './dto/signin.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ResendVerifyDto } from './dto/resend-verify.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MagicLinkDto } from './dto/magic-link.dto';
import { MagicLinkVerifyDto } from './dto/magic-link-verify.dto';
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @UseGuards(ThrottlerGuard)
  @Post('signup')
  signup(@Body() dto: SignupDto, @Ip() ip: string, @Req() req: any) {
    return this.auth.signup(dto, ip, req.headers['user-agent'] ?? '');
  }

  @UseGuards(ThrottlerGuard)
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto);
  }

  @UseGuards(ThrottlerGuard)
  @Post('signin')
  signin(@Body() dto: SigninDto, @Ip() ip: string, @Req() req: any) {
    return this.auth.signin(dto, ip, req.headers['user-agent'] ?? '');
  }

  @UseGuards(ThrottlerGuard)
  @Post('refresh')
  refresh(@Body() dto: RefreshDto, @Ip() ip: string, @Req() req: any) {
    return this.auth.refresh(dto, ip, req.headers['user-agent'] ?? '');
  }

  @UseGuards(ThrottlerGuard)
  @Post('verify-email/resend')
  resend(@Body() dto: ResendVerifyDto, @Ip() ip: string, @Req() req: any) {
    return this.auth.resendVerification(
      dto,
      ip,
      req.headers['user-agent'] ?? '',
    );
  }

  @UseGuards(ThrottlerGuard)
  @Post('forgot-password')
  forgot(@Body() dto: ForgotPasswordDto, @Ip() ip: string, @Req() req: any) {
    return this.auth.forgotPassword(dto, ip, req.headers['user-agent'] ?? '');
  }

  @UseGuards(ThrottlerGuard)
  @Post('reset-password')
  reset(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @UseGuards(ThrottlerGuard)
  @Get('check-availability')
  checkAvailability(
    @Query('email') email?: string,
    @Query('username') username?: string,
  ) {
    return this.auth.checkAvailability({ email, username });
  }

  @UseGuards(ThrottlerGuard)
  @Post('magic-link')
  magicLink(@Body() dto: MagicLinkDto, @Ip() ip: string, @Req() req: any) {
    return this.auth.createMagicLink(dto, ip, req.headers['user-agent'] ?? '');
  }

  @UseGuards(ThrottlerGuard)
  @Post('magic-link/verify')
  magicLinkVerify(
    @Body() dto: MagicLinkVerifyDto,
    @Ip() ip: string,
    @Req() req: any,
  ) {
    return this.auth.verifyMagicLink(dto, ip, req.headers['user-agent'] ?? '');
  }

  @Post('token/introspect')
  introspect(@Body('token') token: string) {
    return this.auth.introspectToken(token);
  }

  @Post('token/revoke')
  revoke(@Body() dto: RefreshDto) {
    return this.auth.revokeRefresh(dto);
  }
}
