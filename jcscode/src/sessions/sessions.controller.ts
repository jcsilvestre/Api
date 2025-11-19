import { Controller, Get, Delete, Param, Req, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../entities/session.entity';
import { Request } from 'express';
import jwt from 'jsonwebtoken';

@Controller('sessions')
export class SessionsController {
  constructor(
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
  ) {}

  @Get()
  async list(@Req() req: Request & { user?: { userId?: string } }) {
    const userId = req.user?.userId;
    if (!userId) return { success: true, data: [] };
    const list = await this.sessions.find({ where: { user_id: userId } });
    return { success: true, data: list };
  }

  @Delete(':id')
  async revokeOne(@Param('id') id: string) {
    const sess = await this.sessions.findOne({ where: { id } });
    if (!sess) return { success: false, error: { code: 'SESSION_NOT_FOUND' } };
    sess.is_active = false;
    sess.revoked_at = new Date();
    await this.sessions.save(sess);
    return { success: true };
  }

  @Delete()
  async revokeAll(@Req() req: Request & { user?: { userId?: string } }) {
    const userId = req.user?.userId;
    if (!userId) return { success: true };
    const list = await this.sessions.find({
      where: { user_id: userId, is_active: true },
    });
    for (const s of list) {
      s.is_active = false;
      s.revoked_at = new Date();
    }
    await this.sessions.save(list);
    return { success: true };
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const sess = await this.sessions.findOne({ where: { id } });
    return { success: true, data: sess ?? null };
  }

  @Post(':id/refresh')
  async refreshManual(@Param('id') id: string) {
    const sess = await this.sessions.findOne({ where: { id } });
    const userId = sess?.user_id ?? 'unknown';
    const access = jwt.sign(
      { sub: userId },
      process.env.JWT_SECRET ?? 'dev_secret',
    );
    return { success: true, data: { accessToken: access } };
  }
}
