import { Body, Controller, Delete, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../core/guards/auth.guard.js';
import { RoleGuard } from '../../core/guards/role.guard.js';
import { Roles } from '../../core/decorators/role.decorator.js';
import { UserRoleEnum } from '../../core/users/types/users.types.js';
import { OrganizationCreateDto } from './dtos/organization-create.dto.js';
import { OrganizationService } from './organization.service.js';
import { OrganizationUpdateDto } from './dtos/organization-update.dto.js';

@Controller('organizations')
@UseGuards(AuthGuard, RoleGuard)
@Roles(UserRoleEnum.SUPER_ADMIN)
export class OrganizationController {
    @Inject(OrganizationService) private _orgService: OrganizationService;

    @Post()
    async create(@Body() dto: OrganizationCreateDto) {
        return this._orgService.create(dto)
    }

    @Get()
    async list() {
        return this._orgService.list()
    }

    @Delete(':id')
    @HttpCode(204)
    async delete(@Param('id', ParseUUIDPipe) id: string) {
        return this._orgService.delete(id);
    }

    @Patch(':id')
    async update(@Body() dto: OrganizationUpdateDto, @Param('id', ParseUUIDPipe) id: string) {
        return this._orgService.update(dto, id)
    }
}
