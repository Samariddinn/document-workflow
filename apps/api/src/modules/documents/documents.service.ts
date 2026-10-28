import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentCreateDto, DocumentListDto, DocumentSubmitDto, DocumentUpdateDto } from './dto/documents.dto.js';
import { KNEX } from '../../database/database.constants.js';
import type { Knex } from 'knex';
import { AuthUser } from '../../core/auth/types/auth-user.types.js';
import { PgErrorCode } from '../../database/pg-error-codes.js';
import { DatabaseError } from 'pg';
import { UserRoleEnum } from '../../core/users/types/users.types.js';

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
        const { limit = 20, offset = 0 } = dto;
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

    async detail(id: string, userId: string) {
        const doc = await this._db('documents').select('*').where({ id, is_deleted: false }).first();

        if (!doc) throw new NotFoundException('Document is not found');

        if (doc.created_by !== userId) throw new ForbiddenException();


        const files = await this._db('document_files as df').join('files as f', 'f.id', 'df.file_id')
            .select('f.id', 'f.name', 'f.mime_type', 'f.size', 'df.kind')
            .where('df.document_id', id)
            .orderBy('f.created_at')


        return { ...doc, files }
    }

    async update(id: string, dto: DocumentUpdateDto, userId: string) {
        try {
            return await this._db.transaction(async (trx) => {
                const document = await trx('documents')
                    .select('created_by', 'status')
                    .where({ id, is_deleted: false })
                    .forUpdate()
                    .first();

                if (!document) throw new NotFoundException('Document not found');
                if (document.created_by !== userId) throw new ForbiddenException("You can't edit a document that is not yours");
                if (document.status !== 'DRAFT' && document.status !== 'RETURNED') {
                    throw new ConflictException('Only draft or returned documents can be edited');
                }

                const mainIds = dto.main_file_ids ?? [];
                const additionalIds = dto.additional_file_ids ?? [];
                const allIds = [...mainIds, ...additionalIds];

                if (new Set(allIds).size !== allIds.length) {
                    throw new BadRequestException('A file cannot be both main and additional');
                }

                await trx('document_files').where({ document_id: id }).whereIn('kind', ['MAIN', 'ADDITIONAL']).delete();
                await trx('document_files').insert([
                    ...mainIds.map((file_id) => ({ document_id: id, file_id, kind: 'MAIN' })),
                    ...additionalIds.map((file_id) => ({ document_id: id, file_id, kind: 'ADDITIONAL' })),
                ]);

                const [updated] = await trx('documents')
                    .where({ id })
                    .update({ document_number: dto.document_number, description: dto.description, updated_at: trx.fn.now() })
                    .returning('*');

                return updated;
            });
        } catch (error) {
            if (error instanceof DatabaseError && error.code === PgErrorCode.UniqueViolation) {
                throw new ConflictException(`Document number ${dto.document_number} is already used`);
            }
            throw error;
        }
    }


    async delete(id: string, userId: string) {
        const document = await this._db('documents').select('created_by', 'status').where({ id, is_deleted: false }).first();

        if (!document) {
            throw new NotFoundException('Document not found');
        }

        if (document.created_by !== userId) {
            throw new ForbiddenException("You can't delete the document that is not yours.")
        }

        if (document.status !== 'DRAFT') {
            throw new ConflictException('Only draft documents can be deleted.')
        }

        await this._db('documents')
            .where({ id, is_deleted: false, status: 'DRAFT' })
            .update({ is_deleted: true, updated_at: this._db.fn.now() })
    }

    async submit(id: string, dto: DocumentSubmitDto, user: AuthUser) {
        return this._db.transaction(async (trx) => {
            const document = await trx('documents')
                .select('created_by', 'status', 'current_attempt')
                .where({ id, is_deleted: false })
                .forUpdate()
                .first();

            if (!document) {
                throw new NotFoundException('Document not found');
            }

            if (document.created_by !== user.id) {
                throw new ForbiddenException("You can't submit a document that is not yours");
            }

            if (document.status !== 'DRAFT' && document.status !== 'RETURNED') {
                throw new ConflictException('Only draft or returned documents can be sent for approval');
            }

            const attempt = document.status === 'DRAFT' ? document.current_attempt : document.current_attempt + 1;

            const approvers = await trx('users')
                .select('id')
                .whereIn('id', dto.approver_ids)
                .andWhere({ org_id: user.org_id, role: UserRoleEnum.EMPLOYEE, is_deleted: false })
                .whereNot({ id: user.id });

            if (approvers.length !== dto.approver_ids.length) {
                throw new BadRequestException('Approvers must be other employees of your organization');
            }

            await trx('document_agreements').insert(
                dto.approver_ids.map((user_id) => ({
                    document_id: id,
                    user_id,
                    attempt,
                    status: 'PENDING',
                })),
            );

            const [updated] = await trx('documents')
                .where({ id })
                .update({ status: 'IN_APPROVAL', current_attempt: attempt, updated_at: trx.fn.now() })
                .returning('*');

            return updated;
        });
    }

}
