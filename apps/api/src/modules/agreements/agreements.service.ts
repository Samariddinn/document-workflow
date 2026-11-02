import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Knex } from 'knex';
import { KNEX } from '../../database/database.constants.js';
import { AgreementRejectDto, AgreementsListDto } from './dtos/agreements.dto.js';
import { AuthUser } from '../../core/auth/types/auth-user.types.js';
import { UserRoleEnum } from '../../core/users/types/users.types.js';

@Injectable()
export class AgreementsService {
    @Inject(KNEX) private _db: Knex;

    async list(dto: AgreementsListDto, user: AuthUser) {
        const { limit = 20, offset = 0 } = dto;

        const pending = this._db('document_agreements as a')
            .join('documents as d', 'd.id', 'a.document_id')
            .where({
                'a.user_id': user.id,
                'a.status': 'PENDING',
                'd.status': 'IN_APPROVAL',
                'd.is_deleted': false
            })
            .whereRaw('a.attempt = d.current_attempt');

        const list = await pending
            .clone()
            .join('users as u', 'u.id', 'd.created_by')
            .select(
                'a.id',
                'a.created_at as sent_at',
                'd.id as document_id',
                'd.document_number',
                'd.description',
                'd.kind',
                'u.first_name as author_first_name',
                'u.middle_name as author_middle_name',
                'u.last_name as author_last_name',
            )
            .orderBy([
                { column: 'a.created_at', order: 'asc' },
                { column: 'a.id', order: 'asc' },
            ])
            .limit(limit)
            .offset(offset)

        const count = await pending.clone().count({ total: '*' }).first();

        return { list, total: Number(count?.total ?? 0) }
    }

    async approve(id: string, userId: string) {
        return await this._db.transaction(async (trx) => {
            const found = await trx('document_agreements')
                .select('document_id', 'user_id')
                .where({ id })
                .first();

            if (!found) {
                throw new NotFoundException('Approval not found');
            }

            if (found.user_id !== userId) {
                throw new ForbiddenException('This approval is not assigned to you!')
            };

            const document = await trx('documents')
                .select('id', 'org_id', 'status', 'current_attempt', 'is_deleted')
                .where({ id: found.document_id })
                .forUpdate()
                .first();

            const agreement = await trx('document_agreements')
                .select('status', 'attempt')
                .where({ id })
                .first();

            if (
                !document ||
                document.is_deleted ||
                document.status !== 'IN_APPROVAL' ||
                agreement.attempt !== document.current_attempt
            ) {
                throw new ConflictException('This document is no longer waiting for approval');
            }

            if (agreement.status !== 'PENDING') {
                throw new ConflictException('You have already decided on this document');
            }

            await trx('document_agreements')
                .where({ id })
                .update({ status: 'APPROVED', decided_at: trx.fn.now() });

            const pending = await trx('document_agreements')
                .where({ document_id: document.id, attempt: document.current_attempt, status: 'PENDING' })
                .count({ total: '*' })
                .first();

            if (Number(pending?.total ?? 0) > 0) {
                return { id, status: 'APPROVED', document_status: 'IN_APPROVAL' };
            }

            const head = await trx('users')
                .select('id')
                .where({ org_id: document.org_id, role: UserRoleEnum.HEAD, is_deleted: false })
                .first();

            if (!head) {
                throw new ConflictException('The organization has no head to sign this document');
            }

            await trx('document_signatures').insert({
                document_id: document.id,
                signer_id: head.id,
                attempt: document.current_attempt,
                status: 'PENDING',
            });

            await trx('documents')
                .where({ id: document.id })
                .update({ status: 'AWAITING_SIGNATURE', updated_at: trx.fn.now() });

            return { id, status: 'APPROVED', document_status: 'AWAITING_SIGNATURE' };

        })
    }

    async reject(id: string, dto: AgreementRejectDto, userId: string) {
        return await this._db.transaction(async (trx) => {
            const found = await trx('document_agreements')
                .select('document_id', 'user_id')
                .where({ id })
                .first();

            if (!found) {
                throw new NotFoundException('Approval not found');
            }

            if (found.user_id !== userId) {
                throw new ForbiddenException('This approval is not assigned to you!')
            };

            const document = await trx('documents')
                .select('id', 'org_id', 'status', 'current_attempt', 'is_deleted')
                .where({ id: found.document_id })
                .forUpdate()
                .first();

            const agreement = await trx('document_agreements')
                .select('status', 'attempt')
                .where({ id })
                .first();

            if (
                !document ||
                document.is_deleted ||
                document.status !== 'IN_APPROVAL' ||
                agreement.attempt !== document.current_attempt
            ) {
                throw new ConflictException('This document is no longer waiting for approval');
            }

            if (agreement.status !== 'PENDING') {
                throw new ConflictException('You have already decided on this document');
            }

            await trx('document_agreements')
                .where({ id })
                .update({ status: 'REJECTED', decided_at: trx.fn.now(), comment:  dto.reject_reason.trim() })

            await trx('document_agreements')
                .where({ document_id: document.id, attempt: document.current_attempt, status: 'PENDING' })
                .update({ status: 'CANCELLED' });

            await trx('documents')
                .where({ id: document.id })
                .update({ status: 'RETURNED', updated_at: trx.fn.now() });

            return { id, status: 'REJECTED', document_status: 'RETURNED' };

        })
    }

    async detail(id: string, userId: string) {
        const agreement = await this._db('document_agreements as a')
            .join('documents as d', 'd.id', 'a.document_id')
            .join('users as u', 'u.id', 'd.created_by')
            .select(
                'a.id',
                'a.user_id',
                'a.status',
                'a.attempt',
                'a.comment',
                'a.decided_at',
                'a.created_at as sent_at',
                'd.id as document_id',
                'd.document_number',
                'd.description',
                'd.kind',
                'd.status as document_status',
                'd.current_attempt',
                'u.first_name as author_first_name',
                'u.middle_name as author_middle_name',
                'u.last_name as author_last_name',
            )
            .where('a.id', id)
            .andWhere('d.is_deleted', false)
            .first();

        if (!agreement) {
            throw new NotFoundException('Approval not found');
        }

        if (agreement.user_id !== userId) {
            throw new ForbiddenException('This approval is not assigned to you');
        }

        const files = await this._db('document_files as df')
            .join('files as f', 'f.id', 'df.file_id')
            .select('f.id', 'f.name', 'f.mime_type', 'f.size', 'df.kind')
            .where('df.document_id', agreement.document_id)
            .whereIn('df.kind', ['MAIN', 'ADDITIONAL'])
            .orderBy('f.created_at');

        const can_decide =
            agreement.status === 'PENDING' &&
            agreement.document_status === 'IN_APPROVAL' &&
            agreement.attempt === agreement.current_attempt;

        return { ...agreement, can_decide, files };

    }
}
