import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from './dtos/login.dto.js';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service.js';
import  argon2  from 'argon2';

@Injectable()
export class AuthService {
    @Inject(JwtService) private _jwtService: JwtService;
    @Inject(UsersService) private _usersService: UsersService;

    async login(dto: LoginDto) {
        const { username, password } = dto;

        const user = await this._usersService.findByUsername(username);

        if(!user) throw new UnauthorizedException('Invalid username or password');

        const isPasswordValid = await argon2.verify(user.password_hash, password);

        if(!isPasswordValid) throw new UnauthorizedException('Invalid username or password');

        const payload = { sub: user.id, role: user.role, first_name: user.first_name, middle_name: user.middle_name, last_name: user.last_name };
        const accessToken = await this._jwtService.signAsync(payload);

        return { accessToken }
    }
}
