import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    // id is the protocol's own row in documents (kind = 'PROTOCOL');
    // source_document_id is the signed document the protocol was created from
    await knex.raw(`
        create table protocols (
         id uuid primary key references documents(id) on delete cascade,
         source_document_id uuid not null references documents(id) on delete restrict,
         check (id <> source_document_id)
        );
    `)

    await knex.raw(`
        create index protocols_source_document_id_idx on protocols (source_document_id);
    `)
}


export async function down(knex: Knex): Promise<void> {
    await knex.raw(`
        drop table if exists protocols;
    `)
}
