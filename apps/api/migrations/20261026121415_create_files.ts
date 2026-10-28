import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.raw(`
        create table if not exists files (
         id uuid primary key default gen_random_uuid(),
         storage_key text not null unique,
         name text not null,
         mime_type text not null,
         size bigint not null check (size > 0),
         uploaded_by uuid not null references users(id) on delete restrict,
         created_at timestamp with time zone not null default now()
        );
    `)

    await knex.raw(`
        create index files_uploaded_by_idx on files (uploaded_by);
    `)
}


export async function down(knex: Knex): Promise<void> {
    return knex.raw(`
        drop table if exists files;
    `)
}

