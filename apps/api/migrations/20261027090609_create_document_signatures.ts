import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.raw(`
        create table document_signatures (
         id uuid primary key default gen_random_uuid(),
         document_id uuid not null references documents(id) on delete cascade,
         signer_id uuid not null references users(id) on delete restrict,
         attempt integer not null check (attempt >= 1),
         status varchar(20) not null default 'PENDING' check (status in ('PENDING', 'SIGNED', 'REJECTED')),
         comment text,
         decided_at timestamp with time zone,
         created_at timestamp with time zone not null default now(),
         unique (document_id, attempt),
         check (status <> 'REJECTED' or length(trim(comment)) > 0),
         check ((status = 'PENDING') = (decided_at is null))
        );
    `)

    await knex.raw(`
        create index document_signatures_signer_id_status_idx on document_signatures (signer_id, status);
    `)
}


export async function down(knex: Knex): Promise<void> {
    await knex.raw(`
        drop table if exists document_signatures;
    `)
}
