import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  imports: [
    UsersModule,   
    JwtModule.registerAsync({
      global: true,
      useFactory: () => {
        const secret = process.env.JWT_SECRET;

        if(!secret) throw new Error('JWT secret is not set!');

        return { secret, signOptions: {expiresIn: Number(process.env.JWT_EXPIRES_IN)} }
      }
    })
  ]
})
export class AuthModule {}
