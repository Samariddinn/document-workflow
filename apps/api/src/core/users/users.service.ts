import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { KNEX } from '../../database/database.constants.js';
import type { Knex } from 'knex';
import { IUser, UserRoleEnum } from './types/users.types.js';
import { CreateUserDto } from './dtos/user-create.dto.js';
import argon2 from "argon2";
import { UserUpdateDto } from './dtos/user-update.dto.js';
import { AuthUser } from '../auth/types/auth-user.types.js';

@Injectable()
export class UsersService {
    @Inject(KNEX) private _db: Knex;

    async findByUsername(username: string): Promise<IUser | undefined> {
        return this._db<IUser>('users').where({ username, is_deleted: false }).first();
    }

    async create(dto: CreateUserDto) {
        const { password, ...rest } = dto;

        const existingUser = await this._db('users').where({ username: dto.username }).first('id');
        if (existingUser) {
            throw new ConflictException('Username is already taken');
        }

        const org = await this._db('organizations').where({ id: dto.org_id }).first('id');
        if (!org) {
            throw new NotFoundException('Organization not found');
        }

        if (dto.role === UserRoleEnum.HEAD) {
            const existingHead = await this._db('users')
                .where({ org_id: dto.org_id, role: UserRoleEnum.HEAD, is_deleted: false })
                .first('id');

            if (existingHead) {
                throw new ConflictException('This organization already has a head');
            }
        }

        const password_hash = await argon2.hash(password);

        const [user] = await this._db('users')
            .insert({ ...rest, password_hash })
            .returning(['id', 'username', 'role', 'org_id', 'first_name', 'middle_name', 'last_name', 'created_at'])

        return user;
    }

    async list() {
        return this._db('users')
            .leftJoin('organizations', 'users.org_id', 'organizations.id')
            .select(
                'users.id',
                'users.username',
                'users.role',
                'users.first_name',
                'users.middle_name',
                'users.last_name',
                'users.created_at',
                this._db.raw(`
      case when organizations.id is null then null
      else json_build_object('id', organizations.id, 'name', organizations.name, 'tin', organizations.tin)
      end as organization
    `),
            )
            .where('users.is_deleted', false)
            .orderBy('users.created_at', 'desc');
    }

    async delete(id: string, currentUserId: string) {
        if (id === currentUserId) {
            throw new ForbiddenException('You cannot delete your own account');
        }
        
        const target = await this._db('users')
            .where({ id, is_deleted: false })
            .first('id', 'role');

        if (!target) {
            throw new NotFoundException('User not found');
        }

        if (target.role === UserRoleEnum.SUPER_ADMIN) {
            throw new ForbiddenException('Super admin accounts cannot be deleted');
        }

        await this._db('users')
            .where({ id })
            .update({ is_deleted: true, updated_at: this._db.fn.now() });
    }

    async update(dto: UserUpdateDto, id: string) {
        const rowToUpdate = await this._db('users').where({ is_deleted: false, id })
            .update({ ...dto })
            .returning('*').first();

        if (!rowToUpdate) {
            throw new NotFoundException('Row not found')
        }

        return rowToUpdate;
    }

    async findActiveById(id: string): Promise<AuthUser | undefined> {
        return this._db('users')
            .where({ id, is_deleted: false })
            .first('id', 'role', 'org_id', 'first_name', 'middle_name', 'last_name')
    }
}
