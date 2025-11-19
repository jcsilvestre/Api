import { Controller, Post, Delete, Get, Body, Req } from '@nestjs/common';

class SetupDto {}
class EnableDto {
  code!: string;
}
class DisableDto {
  password!: string;
}
class VerifyDto {
  code!: string;
}

@Controller('auth/mfa')
export class MfaController {
  @Post('setup')
  setup(@Req() _req: any, @Body() _dto: SetupDto) {
    return { success: true, data: { secret: 'stub', qr: 'stub' } };
  }

  @Post('enable')
  enable(@Req() _req: any, @Body() _dto: EnableDto) {
    return { success: true };
  }

  @Delete('disable')
  disable(@Req() _req: any, @Body() _dto: DisableDto) {
    return { success: true };
  }

  @Post('verify')
  verify(@Body() _dto: VerifyDto) {
    return { success: true };
  }

  @Get('backup-codes')
  backupCodes(@Req() _req: any) {
    return { success: true, data: ['stub'] };
  }

  @Post('backup-codes')
  regenBackupCodes(@Req() _req: any) {
    return { success: true, data: ['stub'] };
  }
}
