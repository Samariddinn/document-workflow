import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { DocumentCreateDto, DocumentListDto } from './dto/documents.dto.js';
import { KNEX } from '../../database/database.constants.js';
import type { Knex } from 'knex';
import { AuthUser } from '../../core/auth/types/auth-user.types.js';
import { PgErrorCode } from '../../database/pg-error-codes.js';
import { DatabaseError } from 'pg';

@Injectable()
export class DocumentsService {
    @Inject(KNEX) private _db: Knex;

    async create(dto: DocumentCreateDto, user: AuthUser) {
        try {
            return await this._db.transaction(async (trx) => {
                const [document] = await trx('documents').insert({
                    created_by: user.id,
                    org_id: user.org_id,
                    kind: 'DOCUMENT',
                    document_number: dto.document_number,
                    description: dto.description,
                }).returning('*');

                const mainIds = dto.main_file_ids;
                const additionalIds = dto.additional_file_ids ?? [];
                const allIds = [...mainIds, ...additionalIds];

                if (new Set(allIds).size !== allIds.length) {
                    throw new BadRequestException('A file cannot be both main and additional')
                };

                const ownFiles = await trx('files')
                    .select('id')
                    .whereIn('id', allIds)
                    .andWhere('uploaded_by', user.id);

                if (ownFiles.length !== allIds.length) {
                    throw new BadRequestException('Some files do not exist or are not yours');
                }

                await trx('document_files').insert([
                    ...mainIds.map((file_id) => ({ document_id: document.id, file_id, kind: 'MAIN', })),
                    ...additionalIds.map((file_id) => ({ document_id: document.id, file_id, kind: 'ADDITIONAL' }))
                ])

                return document;
            })
        } catch (error) {
            if (error instanceof DatabaseError && error.code === PgErrorCode.UniqueViolation) {
                throw new ConflictException(`Document number ${dto.document_number} is already used`);
            }

            throw error;
        }

    }

    async list(dto: DocumentListDto, user: AuthUser) {
        const { limit = 20, offset   = 0 } = dto;
        const items = await this._db.raw(`
         select * from documents 
         where created_by = ? and is_deleted = false
         order by created_at desc, id desc
         limit ?
         offset ?
        `, [user.id, limit, offset])

        const count = await this._db.raw(`
            select count(*)::int
            from documents
            where created_by = ? and is_deleted = false
        `, [user.id]);

        return {
            list: items.rows,
            total: count.rows[0].count
        }
    }
}
