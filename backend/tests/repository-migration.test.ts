import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationPath = path.resolve(
  process.cwd(),
  '../migrations/0003_repo_submit_clone_and_file_limit.sql',
);
const migration = readFileSync(migrationPath, 'utf8');

const createTableBlock = (tableName: string) => {
  const match = migration.match(
    new RegExp(`CREATE TABLE ${tableName} \\([\\s\\S]*?\\n\\);`),
  );
  if (!match) throw new Error(`Missing CREATE TABLE ${tableName}`);
  return match[0];
};

describe('Repository submit migration contract', () => {
  it('creates Repository records with normalized URL ownership and status constraints', () => {
    const repositoriesTable = createTableBlock('repositories');

    expect(repositoriesTable).toContain('CREATE TABLE repositories');
    expect(repositoriesTable).toContain('url TEXT NOT NULL');
    expect(repositoriesTable).toContain('github_owner TEXT NOT NULL');
    expect(repositoriesTable).toContain('github_repo TEXT NOT NULL');
    expect(repositoriesTable).toContain('is_private BOOLEAN NOT NULL');
    expect(repositoriesTable).toContain(
      'active_repository BOOLEAN NOT NULL DEFAULT TRUE',
    );
    expect(repositoriesTable).toContain(
      "status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'ready_for_indexing', 'rejected_file_limit', 'failed'))",
    );
    expect(repositoriesTable).toContain(
      'CHECK ((user_id IS NULL) <> (session_id IS NULL))',
    );
  });

  it('enforces one guest Active Repository and one logged-in Repository URL', () => {
    expect(migration).toContain(
      'CREATE UNIQUE INDEX repositories_guest_active_session_unique_idx',
    );
    expect(migration).toContain('ON repositories(session_id)');
    expect(migration).toContain(
      'WHERE user_id IS NULL AND active_repository = TRUE',
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX repositories_logged_in_user_url_unique_idx',
    );
    expect(migration).toContain('ON repositories(user_id, url)');
    expect(migration).toContain('WHERE user_id IS NOT NULL');
  });

  it('creates Repository Job records with clone/count status, failure, and Temp Clone handoff fields', () => {
    const repositoryJobsTable = createTableBlock('repository_jobs');

    expect(repositoryJobsTable).toContain('CREATE TABLE repository_jobs');
    expect(repositoryJobsTable).toContain(
      'repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE',
    );
    expect(repositoryJobsTable).toContain(
      'replaces_repository_id UUID REFERENCES repositories(id) ON DELETE SET NULL',
    );
    expect(repositoryJobsTable).toContain(
      "status TEXT NOT NULL CHECK (status IN ('queued', 'cloning', 'counting_files', 'ready_for_indexing', 'rejected_file_limit', 'failed'))",
    );
    expect(repositoryJobsTable).toContain('file_count INTEGER');
    expect(repositoryJobsTable).toContain('file_limit INTEGER');
    expect(repositoryJobsTable).toContain('failure_code TEXT');
    expect(repositoryJobsTable).toContain('failure_message TEXT');
    expect(repositoryJobsTable).toContain('failure_detail TEXT');
    expect(repositoryJobsTable).toContain('temp_clone_path TEXT');
    expect(repositoryJobsTable).toContain(
      'previous_repository_status TEXT CHECK',
    );
    expect(repositoryJobsTable).toContain('started_at TIMESTAMP WITH TIME ZONE');
    expect(repositoryJobsTable).toContain(
      'ready_for_indexing_at TIMESTAMP WITH TIME ZONE',
    );
    expect(repositoryJobsTable).toContain(
      'finished_at TIMESTAMP WITH TIME ZONE',
    );
  });

  it('defines the final Repository schema directly without patch statements', () => {
    expect(migration).not.toContain('ALTER TABLE repositories');
    expect(migration).not.toContain('ALTER TABLE repository_jobs');
    expect(migration).not.toContain('repositories_guest_session_unique_idx');
  });
});
