import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { CreateUserDto } from './dtos/user-create.dto.js';
import { UsersService } from './users.service.js';
import { AuthGuard } from '../guards/auth.guard.js';
import { RoleGuard } from '../guards/role.guard.js';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
    @Inject(UsersService) private _usersService: UsersService;

    @Get('hello')
    @UseGuards(RoleGuard)
    sayHello() {
        return 'Hello world'
    }

    @Post('create')
    async createUser(@Body() dto: CreateUserDto) {
        return this._usersService.create(dto);
    }
}
