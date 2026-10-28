import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './core/auth/auth.module.js';
import { UsersModule } from './core/users/users.module.js';
import { OrganizationModule } from './modules/organization/organization.module.js';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { StorageModule } from './storage/storage.module.js';
import { FilesModule } from './modules/files/files.module.js';
import { DocumentsModule } from './modules/documents/documents.module.js';

@Module({
  imports: [DatabaseModule, StorageModule, AuthModule, UsersModule, OrganizationModule, FilesModule, ThrottlerModule.forRoot([
    {ttl: 60_000, limit: 100}
  ]), DocumentsModule],
  controllers: [AppController],
  providers: [AppService, {provide: APP_GUARD, useClass: ThrottlerGuard}],
})
export class AppModule {}
