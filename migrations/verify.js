import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const { Client } = pg;

function resolveConnectionString() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to verify migrations');
  }
  return process.env.DATABASE_URL;
}

export async function verifyMigrations() {
  const client = new Client({
    connectionString: resolveConnectionString(),
  });

  await client.connect();

  try {
    const vectorResult = await client.query(
      "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS enabled"
    );
    const migrationResult = await client.query(
      "SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = '0001_enable_vector.sql') AS recorded"
    );

    const vectorEnabled = vectorResult.rows[0]?.enabled === true;
    const migrationRecorded = migrationResult.rows[0]?.recorded === true;

    if (!vectorEnabled || !migrationRecorded) {
      throw new Error(
        `Migration verification failed: vector=${vectorEnabled}, migration=${migrationRecorded}`
      );
    }

    console.log('[Migrations] Verified pgvector extension and migration history.');
  } finally {
    await client.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  verifyMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Migrations] Verification failed:', err);
      process.exit(1);
    });
}
