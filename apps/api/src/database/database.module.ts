import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { KNEX } from './database.constants.js';
import knex, { type Knex } from 'knex';

@Global()
@Module({
    providers: [
        {
            provide: KNEX,
            useFactory: () => {
                const url = process.env.DATABASE_URL;
                if(!url) {
                    throw new Error('DATABASE_URL is not set')
                };

                return knex({client: 'pg', connection: url})
            }
        }
    ],
    exports: [KNEX]
})

export class DatabaseModule implements OnApplicationShutdown {
    @Inject(KNEX) private readonly _db: Knex;

    async onApplicationShutdown() {
        await this._db.destroy();
    }
}