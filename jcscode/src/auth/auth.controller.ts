import { Body, Controller, Ip, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { SigninDto } from './dto/signin.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  signup(@Body() dto: SignupDto, @Ip() ip: string, @Req() req: any) {
    return this.auth.signup(dto, ip, req.headers['user-agent'] ?? '');
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto);
  }

  @Post('signin')
  signin(@Body() dto: SigninDto, @Ip() ip: string, @Req() req: any) {
    return this.auth.signin(dto, ip, req.headers['user-agent'] ?? '');
  }
}
