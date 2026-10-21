import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './core/auth/auth.module.js';
import { UsersModule } from './core/users/users.module.js';
import { OrganizationModule } from './modules/organization/organization.module.js';

@Module({
  imports: [DatabaseModule, AuthModule, UsersModule, OrganizationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
