import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Controller('admin/users')
export class AdminUsersController {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  @Get()
  async list(@Query('page') page = 1, @Query('limit') limit = 20) {
    const [data, total] = await this.users.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
    });
    return { success: true, data, total };
  }

  @Post()
  async create(@Body() body: Partial<User>) {
    const payload: any = {
      email: body.email,
      full_name: body.full_name ?? null,
      username: body.username ?? null,
      phone: body.phone ?? null,
      status: body.status ?? 'active',
    };
    const saved = await this.users.save(payload);
    return { success: true, data: saved };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) return { success: false, error: { code: 'USER_NOT_FOUND' } };
    return { success: true, data: user };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Partial<User>) {
    const payload: any = {
      full_name: body.full_name,
      avatar_url: body.avatar_url,
      phone: body.phone,
      status: body.status,
    };
    await this.users.update({ id }, payload);
    const user = await this.users.findOne({ where: { id } });
    return { success: true, data: user };
  }

  @Delete(':id')
  async softDelete(@Param('id') id: string) {
    await this.users.update({ id }, { deleted_at: new Date() });
    return { success: true };
  }

  @Post(':id/lock')
  lock(@Param('id') _id: string) {
    return { success: true };
  }

  @Post(':id/unlock')
  unlock(@Param('id') _id: string) {
    return { success: true };
  }

  @Post(':id/resend-verify')
  resendVerify() {
    return { success: true };
  }

  @Post(':id/reset-password')
  forceReset() {
    return { success: true };
  }
}
