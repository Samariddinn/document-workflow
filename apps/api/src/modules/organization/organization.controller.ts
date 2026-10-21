import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../core/guards/auth.guard.js';
import { RoleGuard } from '../../core/guards/role.guard.js';
import { Roles } from '../../core/decorators/role.decorator.js';
import { UserRoleEnum } from '../../core/users/types/users.types.js';
import { OrganizationCreateDto } from './dtos/organization-create.dto.js';
import { OrganizationService } from './organization.service.js';

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
}
