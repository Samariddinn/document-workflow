import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { OrganizationCreateDto } from './dtos/organization-create.dto.js';
import { KNEX } from '../../database/database.constants.js';
import type { Knex } from 'knex';

@Injectable()
export class OrganizationService {
    @Inject(KNEX) private _db: Knex;

    async create(dto: OrganizationCreateDto) {
    const existingOrg = await this._db('organizations')
    .where({name: dto.name})
    .orWhere({tin: dto.tin})
    .first();

    if(existingOrg) {
        throw new ConflictException('This org is already exists');
    }

    const [org] =  await this._db('organizations').insert({...dto})
     .returning("*");

     return org;
    }

    async list() {
        return this._db.select('*').from('organizations').orderBy('name').where({is_deleted: false})
    }
}
