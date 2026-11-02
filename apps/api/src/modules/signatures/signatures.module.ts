import { Module } from '@nestjs/common';
import { SignaturesController } from './signatures.controller.js';
import { SignaturesService } from './signatures.service.js';

@Module({
  controllers: [SignaturesController],
  providers: [SignaturesService]
})
export class SignaturesModule {}
