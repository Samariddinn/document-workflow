import { Body, Controller, Delete, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { DocumentCreateDto, DocumentListDto, DocumentSubmitDto, DocumentUpdateDto } from './dto/documents.dto.js';
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

    @Get(':id')
    @Roles(UserRoleEnum.EMPLOYEE)
    async detail(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
     return this._documentsService.detail(id, userId);
    }

    @Post(':id/submit')
    @Roles(UserRoleEnum.EMPLOYEE)
    async submitToApprovers(@Param('id') document_id: string, @Body() dto: DocumentSubmitDto, @CurrentUser() user: AuthUser) {
      return this._documentsService.submit(document_id, dto, user)
    }

    @Roles(UserRoleEnum.EMPLOYEE)
    @Patch(':id')
    update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DocumentUpdateDto, @CurrentUser('id') userId: string) {
        return this._documentsService.update(id, dto, userId)
    }
    
    @Delete(':id')
    @Roles(UserRoleEnum.EMPLOYEE)
    @HttpCode(204)
    async delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
       return this._documentsService.delete(id, userId);
    }

}
