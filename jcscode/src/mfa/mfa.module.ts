import { Module } from '@nestjs/common';
import { MfaController } from './mfa.controller';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [PassportModule],
  controllers: [MfaController],
})
export class MfaModule {}
