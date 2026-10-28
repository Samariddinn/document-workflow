import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.raw(`
        create table document_files (
         document_id uuid not null references documents(id) on delete cascade,
         file_id uuid not null references files(id) on delete restrict,
         kind varchar(20) not null check (kind in ('MAIN', 'ADDITIONAL', 'SIGNED')),
         created_at timestamp with time zone not null default now(),
         primary key (document_id, file_id)
        );
    `)

    await knex.raw(`
        create index document_files_file_id_idx on document_files (file_id);
        create unique index document_files_one_signed_per_document on document_files (document_id) where kind = 'SIGNED';
    `)
}


export async function down(knex: Knex): Promise<void> {
    await knex.raw(`
        drop table if exists document_files;
    `)
}
