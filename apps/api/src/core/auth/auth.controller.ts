import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { LoginDto } from './dtos/login.dto.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
    @Inject(AuthService) private _authService: AuthService;

    @Post('login')
    @HttpCode(200)
    async login(@Body() dto: LoginDto) {
      return this._authService.login(dto);
    }
}
