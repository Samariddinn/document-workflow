import { Body, Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AgreementsService } from './agreements.service.js';
import { AuthGuard } from '../../core/guards/auth.guard.js';
import { RoleGuard } from '../../core/guards/role.guard.js';
import { Roles } from '../../core/decorators/role.decorator.js';
import { UserRoleEnum } from '../../core/users/types/users.types.js';
import { AgreementRejectDto, AgreementsListDto } from './dtos/agreements.dto.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import type { AuthUser } from '../../core/auth/types/auth-user.types.js';

@Controller('agreements')
@UseGuards(AuthGuard, RoleGuard)
@Roles(UserRoleEnum.EMPLOYEE)
export class AgreementsController {
    @Inject(AgreementsService) private _agreementsService: AgreementsService;

    @Get()
    async list(@Query() dto: AgreementsListDto, @CurrentUser() user: AuthUser) {
      return this._agreementsService.list(dto, user)
    }

    @Get(':id')
   async detail(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this._agreementsService.detail(id, userId);
    }

    @Post(':id/approve')
    @HttpCode(200)
    async approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
      return this._agreementsService.approve(id, userId)
    }

    @Post(':id/reject')
    @HttpCode(200)
    async reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AgreementRejectDto, @CurrentUser('id') userId: string) {
      return this._agreementsService.reject(id, dto, userId)
    }
}
