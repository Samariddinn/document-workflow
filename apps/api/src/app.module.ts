import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './core/auth/auth.module.js';
import { UsersModule } from './core/users/users.module.js';
import { OrganizationModule } from './modules/organization/organization.module.js';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [DatabaseModule, AuthModule, UsersModule, OrganizationModule, ThrottlerModule.forRoot([
    {ttl: 60_000, limit: 100}
  ])],
  controllers: [AppController],
  providers: [AppService, {provide: APP_GUARD, useClass: ThrottlerGuard}],
})
export class AppModule {}
