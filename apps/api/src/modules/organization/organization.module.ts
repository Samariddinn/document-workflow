import { Module } from '@nestjs/common';
import { OrganizationController } from './organization.controller.js';
import { OrganizationService } from './organization.service.js';
import { UsersModule } from '../../core/users/users.module.js';

@Module({
  controllers: [OrganizationController],
  providers: [OrganizationService],
  imports: [UsersModule]
})
export class OrganizationModule {}
