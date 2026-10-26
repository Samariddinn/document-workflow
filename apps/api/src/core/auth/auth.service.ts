import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from './dtos/login.dto.js';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service.js';
import  argon2  from 'argon2';
import { randomBytes } from 'node:crypto';
import { JwtPayload } from './types/jwt-payload.types.js';

@Injectable()
export class AuthService {
    @Inject(JwtService) private _jwtService: JwtService;
    @Inject(UsersService) private _usersService: UsersService;

    private readonly _dummyHash = argon2.hash(randomBytes(32).toString('hex'));

    async login(dto: LoginDto) {
        const { username, password } = dto;

        const user = await this._usersService.findByUsername(username);

        // Always run argon2, whether or not the user exists
        const hash = user?.password_hash ?? (await this._dummyHash);
        const isPasswordValid = await argon2.verify(hash, password);

        if (!user || !isPasswordValid) {
            throw new UnauthorizedException('Invalid username or password');
        }

        const payload: JwtPayload = { sub: user.id, role: user.role, first_name: user.first_name, middle_name: user.middle_name, last_name: user.last_name };
        const accessToken = await this._jwtService.signAsync(payload);

        return { accessToken }
    }
}
