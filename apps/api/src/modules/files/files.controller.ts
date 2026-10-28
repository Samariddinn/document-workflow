import { Controller, FileTypeValidator, Get, Inject, MaxFileSizeValidator, Param, ParseFilePipe, ParseUUIDPipe, Post, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '../../core/guards/auth.guard.js';
import { FilesService } from './files.service.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import type { AuthUser } from '../../core/auth/types/auth-user.types.js';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES = /^(application\/pdf|image\/(png|jpeg)|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/;

@Controller('files')
@UseGuards(AuthGuard)
export class FilesController {
    @Inject(FilesService) private _filesService: FilesService;

    @Get(':id')
    async download(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
       const { stream, file } = await this._filesService.download(id, user);

       return new StreamableFile(stream, {
        type: file.mime_type,
        disposition: `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        length: Number(file.size)
       })
    }

    @Post()
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
    async upload(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE }),
                    new FileTypeValidator({ fileType: ALLOWED_TYPES }),
                ],
            }),
        )
        file: Express.Multer.File,
        @CurrentUser('id') userId: string,
    ) {
        return this._filesService.upload(file, userId);
    }
}
