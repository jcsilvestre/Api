import { Module } from '@nestjs/common';
import { OauthController } from './oauth.controller';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [PassportModule],
  controllers: [OauthController],
})
export class OauthModule {}
