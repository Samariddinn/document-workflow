import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
   await knex.raw(`
     create table if not exists organizations(
       id uuid primary key default gen_random_uuid(),
       name varchar(200) not null unique,
       tin varchar(9) not null unique,
       created_at timestamp with time zone default now(),
       updated_at timestamp with time zone default now()
     )    
    `)
}


export async function down(knex: Knex): Promise<void> {
   await knex.raw(`
    drop table if exists organizations;    
    `)
}

