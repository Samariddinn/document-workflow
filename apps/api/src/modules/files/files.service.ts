import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Knex } from 'knex';
import { KNEX } from '../../database/database.constants.js';
import { StorageService } from '../../storage/storage.service.js';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { IUser, UserRoleEnum } from '../../core/users/types/users.types.js';
import { AuthUser } from '../../core/auth/types/auth-user.types.js';

@Injectable()
export class FilesService {
    @Inject(KNEX) private _db: Knex;
    @Inject(StorageService) private _storage: StorageService;

    async upload(file: Express.Multer.File, userId: string) {
        const name = Buffer.from(file.originalname, 'latin1').toString('utf8');

        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const key = `${now.getFullYear()}/${month}/${randomUUID()}${extname(name).toLowerCase()}`;

        await this._storage.upload(key, file.buffer, file.mimetype);

        try {
            const [row] = await this._db('files')
                .insert({
                    storage_key: key,
                    name,
                    mime_type: file.mimetype,
                    size: file.size,
                    uploaded_by: userId,
                })
                .returning(['id', 'name', 'mime_type', 'size', 'created_at']);

            return row;
        } catch (error) {
            await this._storage.delete(key);
            throw error;
        }
    }

    async download(id: string, user: AuthUser) {
        const result = await this._db.raw(`
            select storage_key, name, mime_type, size, uploaded_by
            from files 
            where id = ?
        `, [id]);

        const file = result?.rows[0];

        if (!file) {
            throw new NotFoundException('File not found');
        }

        if (user.role !== UserRoleEnum.SUPER_ADMIN && file.uploaded_by !== user.id) {
            throw new ForbiddenException();
        }

        const stream = await this._storage.getStream(file.storage_key);

        return { stream, file }
    }
}
