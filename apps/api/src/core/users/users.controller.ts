import { Body, Controller, Delete, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CreateUserDto } from './dtos/user-create.dto.js';
import { UsersService } from './users.service.js';
import { AuthGuard } from '../guards/auth.guard.js';
import { RoleGuard } from '../guards/role.guard.js';
import { Roles } from '../decorators/role.decorator.js';
import { UserRoleEnum } from './types/users.types.js';
import { UserUpdateDto } from './dtos/user-update.dto.js';
import { CurrentUser } from '../decorators/current-user.decorator.js';

@Controller('users')
@UseGuards(AuthGuard, RoleGuard)
@Roles(UserRoleEnum.SUPER_ADMIN)
export class UsersController {
    @Inject(UsersService) private _usersService: UsersService;

    @Post()
    async createUser(@Body() dto: CreateUserDto) {
        return this._usersService.create(dto);
    }

    @Get()
    async list() {
        return this._usersService.list();
    }

    @Delete(':id')
    @HttpCode(204)
    delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') currentUserId: string) {
        return this._usersService.delete(id, currentUserId)
    }

    @Patch(':id')
    update(@Body() dto: UserUpdateDto, @Param('id', ParseUUIDPipe) id: string) {
     return this._usersService.update(dto, id)  
    }
}
