import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Knex } from 'knex';
import { KNEX } from '../../database/database.constants.js';
import { SignatureListDto, SignatureRejectDto } from './dtos/signatures.dto.js';

@Injectable()
export class SignaturesService {
    @Inject(KNEX) private _db: Knex;

    async list(dto: SignatureListDto, userId: string) {
        const { limit = 20, offset = 0 } = dto;

        const pending = this._db('document_signatures as s')
            .join('documents as d', 'd.id', 's.document_id')
            .where({
                's.signer_id': userId,
                's.status': 'PENDING',
                'd.status': 'AWAITING_SIGNATURE',
                'd.is_deleted': false
            })
            .whereRaw('s.attempt = d.current_attempt');

        const list = await pending
            .clone()
            .join('users as u', 'u.id', 'd.created_by')
            .select(
                's.id',
                's.created_at as sent_at',
                'd.id as document_id',
                'd.document_number',
                'd.description',
                'd.kind',
                'u.first_name as author_first_name',
                'u.middle_name as author_middle_name',
                'u.last_name as author_last_name',
            )
            .orderBy([
                { column: 's.created_at', order: 'asc' },
                { column: 's.id', order: 'asc' },
            ])
            .limit(limit)
            .offset(offset);

        const count = await pending.clone().count({ total: '*' }).first();

        return { list, total: Number(count?.total ?? 0) };
    }

    async detail(id: string, userId: string) {
        const signature = await this._db('document_signatures as s')
            .join('documents as d', 'd.id', 's.document_id')
            .join('users as u', 'u.id', 'd.created_by')
            .select(
                's.id',
                's.signer_id',
                's.status',
                's.attempt',
                's.comment',
                's.decided_at',
                's.created_at as sent_at',
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
            .where('s.id', id)
            .andWhere('d.is_deleted', false)
            .first();

        if (!signature) {
            throw new NotFoundException('Signature not found');
        }

        if (signature.signer_id !== userId) {
            throw new ForbiddenException('This document is not waiting for your signature');
        }

        const files = await this._db('document_files as df')
            .join('files as f', 'f.id', 'df.file_id')
            .select('f.id', 'f.name', 'f.mime_type', 'f.size', 'df.kind')
            .where('df.document_id', signature.document_id)
            .whereIn('df.kind', ['MAIN', 'ADDITIONAL'])
            .orderBy('f.created_at');

        // Who approved the round the head is signing
        const approvers = await this._db('document_agreements as a')
            .join('users as u', 'u.id', 'a.user_id')
            .select('a.decided_at', 'u.first_name', 'u.middle_name', 'u.last_name')
            .where({
                'a.document_id': signature.document_id,
                'a.attempt': signature.attempt,
                'a.status': 'APPROVED',
            })
            .orderBy('a.decided_at');

        const can_decide =
            signature.status === 'PENDING' &&
            signature.document_status === 'AWAITING_SIGNATURE' &&
            signature.attempt === signature.current_attempt;

        return { ...signature, can_decide, files, approvers };
    }

    async sign(id: string, userId: string) {
        return await this._db.transaction(async (trx) => {
            const document = await this.lockPending(trx, id, userId);

            await trx('document_signatures')
                .where({ id })
                .update({ status: 'SIGNED', decided_at: trx.fn.now() });

            await trx('documents')
                .where({ id: document.id })
                .update({ status: 'SIGNED', updated_at: trx.fn.now() });

            return { id, status: 'SIGNED', document_status: 'SIGNED' };
        });
    }

    async reject(id: string, dto: SignatureRejectDto, userId: string) {
        return await this._db.transaction(async (trx) => {
            const document = await this.lockPending(trx, id, userId);

            await trx('document_signatures')
                .where({ id })
                .update({ status: 'REJECTED', decided_at: trx.fn.now(), comment: dto.reject_reason.trim() });

            await trx('documents')
                .where({ id: document.id })
                .update({ status: 'RETURNED', updated_at: trx.fn.now() });

            return { id, status: 'REJECTED', document_status: 'RETURNED' };
        });
    }

    private async lockPending(trx: Knex.Transaction, id: string, userId: string) {
        const found = await trx('document_signatures')
            .select('document_id', 'signer_id')
            .where({ id })
            .first();

        if (!found) {
            throw new NotFoundException('Signature not found');
        }

        if (found.signer_id !== userId) {
            throw new ForbiddenException('This document is not waiting for your signature');
        }

        const document = await trx('documents')
            .select('id', 'status', 'current_attempt', 'is_deleted')
            .where({ id: found.document_id })
            .forUpdate()
            .first();

        // Re-read after the lock: a parallel request may have decided it in the meantime
        const signature = await trx('document_signatures')
            .select('status', 'attempt')
            .where({ id })
            .first();

        if (
            !document ||
            document.is_deleted ||
            document.status !== 'AWAITING_SIGNATURE' ||
            signature.attempt !== document.current_attempt
        ) {
            throw new ConflictException('This document is no longer waiting for a signature');
        }

        if (signature.status !== 'PENDING') {
            throw new ConflictException('You have already decided on this document');
        }

        return document;
    }
}
