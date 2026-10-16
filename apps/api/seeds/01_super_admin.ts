import argon2  from "argon2";
import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
    const username = process.env.SUPER_ADMIN_USERNAME;
    const password = process.env.SUPER_ADMIN_PASSWORD;

    if(!username || !password) {
        throw new Error('Username or Password of the super admin is not avaiable');
    }

    const passwordHash = await argon2.hash(password);

    await knex('users')
    .insert({
        username,
        password_hash: passwordHash,
        org_id: null,
        role: 'SUPER_ADMIN',
        first_name: "Super",
        middle_name: "Admin",
        last_name: "Admin"
    }).onConflict("username").ignore();
};
