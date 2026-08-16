import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';

import { DatabaseSchema } from './schema.js';

export function createDb(databaseUrl: string) {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 10,
  });

  return new Kysely<DatabaseSchema>({
    dialect: new PostgresDialect({
      pool,
    }),
  });
}
