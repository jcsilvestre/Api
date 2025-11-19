import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { SessionsController } from './sessions.controller';
import { Session } from '../entities/session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Session]), PassportModule],
  controllers: [SessionsController],
})
export class SessionsModule {}
