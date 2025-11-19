import { Controller, Get, Delete, Param } from '@nestjs/common';

@Controller('auth/oauth')
export class OauthController {
  @Get('google')
  google() {
    return {
      success: true,
      data: { redirect: 'https://accounts.google.com/o/oauth2/v2/auth' },
    };
  }

  @Get('google/callback')
  googleCallback() {
    return { success: true };
  }

  @Get('github')
  github() {
    return {
      success: true,
      data: { redirect: 'https://github.com/login/oauth/authorize' },
    };
  }

  @Get('github/callback')
  githubCallback() {
    return { success: true };
  }

  @Get('connections')
  connections() {
    return { success: true, data: [] };
  }

  @Delete('connections/:provider')
  disconnect(@Param('provider') _provider: string) {
    return { success: true };
  }
}
