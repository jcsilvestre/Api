import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { UserRole } from '../entities/user-role.entity';

@Controller('admin/roles')
export class AdminRolesController {
  constructor(
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRoles: Repository<UserRole>,
  ) {}

  @Get()
  async list() {
    const data = await this.roles.find();
    return { success: true, data };
  }

  @Post()
  async create(@Body() body: Partial<Role>) {
    const payload: any = {
      name: body.name,
      description: body.description,
      is_system_role: body.is_system_role ?? false,
    };
    const r = await this.roles.save(payload);
    return { success: true, data: r };
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const rid = parseInt(id, 10);
    const r = await this.roles.findOne({ where: { id: rid } });
    return { success: !!r, data: r };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: Partial<Role>) {
    const rid = parseInt(id, 10);
    const payload: any = {
      name: body.name,
      description: body.description,
      is_system_role: body.is_system_role,
    };
    await this.roles.update({ id: rid }, payload);
    const r = await this.roles.findOne({ where: { id: rid } });
    return { success: true, data: r };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const rid = parseInt(id, 10);
    await this.roles.delete({ id: rid });
    return { success: true };
  }
}

@Controller('admin/users')
export class AdminUserRolesController {
  constructor(
    @InjectRepository(UserRole)
    private readonly userRoles: Repository<UserRole>,
  ) {}

  @Post(':id/roles')
  async assign(@Param('id') id: string, @Body() body: { roleId: string }) {
    await this.userRoles.save({
      user_id: id,
      role_id: parseInt(body.roleId, 10),
    } as any);
    return { success: true };
  }

  @Delete(':id/roles/:roleId')
  async revoke(@Param('id') id: string, @Param('roleId') roleId: string) {
    await this.userRoles.delete({
      user_id: id,
      role_id: parseInt(roleId, 10),
    } as any);
    return { success: true };
  }
}
