import { Module } from '@nestjs/common';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';
import { UsersModule } from '../../core/users/users.module.js';

@Module({
  controllers: [FilesController],
  providers: [FilesService],
  imports: [UsersModule]
})
export class FilesModule {}
