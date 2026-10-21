
import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.raw(`
        alter table organizations add column is_deleted boolean not null default false;
        alter table users add column is_deleted boolean not null default false
    `)
}


export async function down(knex: Knex): Promise<void> {
    await knex.raw(`
        alter table organizations drop column is_deleted;
        alter table users drop column is_deleted;
    `)
}

