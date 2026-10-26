import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationCreateDto } from './dtos/organization-create.dto.js';
import { KNEX } from '../../database/database.constants.js';
import type { Knex } from 'knex';
import { OrganizationUpdateDto } from './dtos/organization-update.dto.js';

@Injectable()
export class OrganizationService {
    @Inject(KNEX) private _db: Knex;

    async create(dto: OrganizationCreateDto) {
        const existingOrg = await this._db('organizations')
            .where({ name: dto.name })
            .orWhere({ tin: dto.tin })
            .first();

        if (existingOrg) {
            throw new ConflictException('This org is already exists');
        }

        const [org] = await this._db('organizations').insert({ ...dto })
            .returning("*");

        return org;
    }

    async list() {
        return this._db.select('*').from('organizations').orderBy('name').where({ is_deleted: false })
    }

    async delete(id: string) {
        await this._db.transaction(async (trx) => {
            const count = await trx('organizations')
                .where({ id, is_deleted: false })
                .update({ is_deleted: true, updated_at: this._db.fn.now() })

            if (!count) {
                throw new NotFoundException('Organization is not found');
            }

            await trx('users')
                .where({ org_id: id, is_deleted: false })
                .update({ is_deleted: true, updated_at: this._db.fn.now() })
        })
    }

    async update(dto: OrganizationUpdateDto, id: string) {
        // Check for duplicates
        if (dto.name || dto.tin) {
            const duplicate = await this._db('organizations')
                .where((q) => {
                    if (dto.name) q.orWhere({ name: dto.name })
                    if (dto.tin) q.orWhere({ tin: dto.tin })
                        .whereNot({ id })
                        .first('id')
                })

            if (duplicate) {
                throw new ConflictException('Organization with this name or tin already exists')
            }
        }
        const [org] = await this._db('organizations').where({ id, is_deleted: false })
            .update({ ...dto, updated_at: this._db.fn.now() }).returning('*')

        return org;
    }
}
