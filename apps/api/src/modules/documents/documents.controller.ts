import { Body, Controller, Get, Inject, Post, Query, UseGuards } from '@nestjs/common';
import { DocumentCreateDto, DocumentListDto } from './dto/documents.dto.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import { DocumentsService } from './documents.service.js';
import type { AuthUser } from '../../core/auth/types/auth-user.types.js';
import { AuthGuard } from '../../core/guards/auth.guard.js';
import { RoleGuard } from '../../core/guards/role.guard.js';
import { Roles } from '../../core/decorators/role.decorator.js';
import { IUser, UserRoleEnum } from '../../core/users/types/users.types.js';

@Controller('documents')
@UseGuards(AuthGuard, RoleGuard)
export class DocumentsController {
    @Inject() private _documentsService: DocumentsService;

    @Post()
    @Roles(UserRoleEnum.EMPLOYEE)
    async create(@Body() dto : DocumentCreateDto, @CurrentUser() user: AuthUser) {
     return this._documentsService.create(dto, user);
    }

    @Get()
    @Roles(UserRoleEnum.EMPLOYEE)
    async list(@Query() dto: DocumentListDto, @CurrentUser() user: AuthUser) {
        return this._documentsService.list(dto, user);
    }
}
