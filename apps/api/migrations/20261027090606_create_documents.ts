import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.raw(`
        create table documents (
         id uuid primary key default gen_random_uuid(),
         kind varchar(20) not null check (kind in ('DOCUMENT', 'PROTOCOL')),
         created_by uuid not null references users(id) on delete restrict,
         org_id uuid not null references organizations(id) on delete restrict,
         document_number varchar(10) not null,
         status varchar(20) not null default 'DRAFT' check (status in ('DRAFT', 'IN_APPROVAL', 'RETURNED', 'AWAITING_SIGNATURE', 'SIGNED')),
         current_attempt integer not null default 1 check (current_attempt >= 1),
         description varchar(150) not null,
         is_deleted boolean not null default false,
         created_at timestamp with time zone not null default now(),
         updated_at timestamp with time zone not null default now(),
         unique (org_id, kind, document_number)
        );
    `)

    await knex.raw(`
        create index documents_created_by_idx on documents (created_by);
    `)
}


export async function down(knex: Knex): Promise<void> {
    await knex.raw(`
        drop table if exists documents;
    `)
}
