import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.raw(`
        create table if not exists users (
         id uuid primary key default gen_random_uuid(),
         username varchar(30) not null unique,
         password_hash text not null,
         created_at timestamp with time zone default now(),
         updated_at timestamp with time zone default now(),
         role varchar(20) not null check (role in ('SUPER_ADMIN', 'HEAD', 'EMPLOYEE')),
         org_id uuid references organizations(id) on delete restrict ,
         first_name varchar(50) not null,
         middle_name varchar(50) not null,
         last_name varchar(50) not null,
         check(
         (role = 'SUPER_ADMIN' and org_id is null)
         or 
         (role in ('HEAD', 'EMPLOYEE') and org_id is not null)
         )
        );
    `)

    await knex.raw(`
     create unique index users_one_head_per_org on users (org_id) where role = 'HEAD';
    `)
}


export async function down(knex: Knex): Promise<void> {
   await knex.raw(`
     drop table if exists users;
    `) 
}