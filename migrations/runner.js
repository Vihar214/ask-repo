import fs from 'fs';
import path from 'path';
import fileUrl from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const { Client } = pg;

function resolveConnectionString(customConnectionString) {
  const connectionString = customConnectionString || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to run migrations');
  }
  return connectionString;
}

export async function runMigrations(customConnectionString) {
  const client = new Client({
    connectionString: resolveConnectionString(customConnectionString),
  });

  await client.connect();

  try {
    // Ensure migrations table exists first
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const currentDir = path.dirname(fileUrl.fileURLToPath(import.meta.url));
    const files = fs
      .readdirSync(currentDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const version = file;
      const res = await client.query('SELECT version FROM schema_migrations WHERE version = $1', [version]);

      if (res.rowCount === 0) {
        const filePath = path.join(currentDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version, name) VALUES ($1, $2)', [version, file]);
        await client.query('COMMIT');
        console.log(`[Migrations] Applied ${file}`);
      } else {
        console.log(`[Migrations] Skipped ${file} (already applied)`);
      }
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

const isDirectRun = process.argv[1] && fileUrl.fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  runMigrations()
    .then(() => {
      console.log('[Migrations] All migrations executed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migrations] Execution failed:', err);
      process.exit(1);
    });
}
