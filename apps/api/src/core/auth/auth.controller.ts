import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { LoginDto } from './dtos/login.dto.js';
import { AuthService } from './auth.service.js';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
    @Inject(AuthService) private _authService: AuthService;

    // ThrottlerGuard is global (APP_GUARD in AppModule); this only sets a stricter limit for login
    @Post('login')
    @HttpCode(200)
    @Throttle({default: { limit: 5, ttl: 60_000 }})
    async login(@Body() dto: LoginDto) {
      return this._authService.login(dto);
    }
}
