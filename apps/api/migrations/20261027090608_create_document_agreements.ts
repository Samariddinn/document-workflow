import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.raw(`
        create table document_agreements (
         id uuid primary key default gen_random_uuid(),
         document_id uuid not null references documents(id) on delete cascade,
         user_id uuid not null references users(id) on delete restrict,
         attempt integer not null check (attempt >= 1),
         status varchar(20) not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
         comment text,
         decided_at timestamp with time zone,
         created_at timestamp with time zone not null default now(),
         unique (document_id, user_id, attempt),
         check (status <> 'REJECTED' or length(trim(comment)) > 0),
         check ((status in ('APPROVED', 'REJECTED')) = (decided_at is not null))
        );
    `)

    await knex.raw(`
        create index document_agreements_user_id_status_idx on document_agreements (user_id, status);
    `)
}


export async function down(knex: Knex): Promise<void> {
    await knex.raw(`
        drop table if exists document_agreements;
    `)
}
