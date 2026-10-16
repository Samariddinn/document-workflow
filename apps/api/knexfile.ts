import type { Knex } from "knex";

process.loadEnvFile();

const config: Knex.Config = {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: {
        directory: './migrations',
        extension: 'ts',
    },
   seeds: {
    directory: './seeds',
    extension: 'ts',
  },
}

export default config;