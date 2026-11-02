import { Body, Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { SignaturesService } from './signatures.service.js';
import { AuthGuard } from '../../core/guards/auth.guard.js';
import { RoleGuard } from '../../core/guards/role.guard.js';
import { Roles } from '../../core/decorators/role.decorator.js';
import { UserRoleEnum } from '../../core/users/types/users.types.js';
import { SignatureListDto, SignatureRejectDto } from './dtos/signatures.dto.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';

@Controller('signatures')
@UseGuards(AuthGuard, RoleGuard)
@Roles(UserRoleEnum.HEAD)
export class SignaturesController {
    @Inject(SignaturesService) private _signaturesService: SignaturesService;

    @Get()
    list(@Query() dto: SignatureListDto, @CurrentUser('id') userId: string) {
        return this._signaturesService.list(dto, userId)
    }

    @Get(':id')
    detail(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
        return this._signaturesService.detail(id, userId)
    }

    @Post(':id/sign')
    @HttpCode(200)
    sign(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
        return this._signaturesService.sign(id, userId)
    }

    @Post(':id/reject')
    @HttpCode(200)
    reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SignatureRejectDto, @CurrentUser('id') userId: string) {
        return this._signaturesService.reject(id, dto, userId)
    }
}
