import { Inject, Injectable } from '@nestjs/common';
import { KNEX } from '../../database/database.constants.js';
import type { Knex } from 'knex';
import { IUser } from './types/users.types.js';
import { CreateUserDto } from './dtos/user-create.dto.js';

@Injectable()
export class UsersService {
    @Inject(KNEX) private _db: Knex;

   async findByUsername(username: string): Promise<IUser | undefined> {
    return this._db<IUser>('users').where({username}).first();
   }

    async create(dto: CreateUserDto) {
   
   }
}
