import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationPath = path.resolve(
  process.cwd(),
  '../migrations/0003_repo_submit_clone_and_file_limit.sql',
);
const migration = readFileSync(migrationPath, 'utf8');

describe('Repository submit migration contract', () => {
  it('creates Repository records with normalized URL ownership and status constraints', () => {
    expect(migration).toContain('CREATE TABLE repositories');
    expect(migration).toContain('url TEXT NOT NULL');
    expect(migration).toContain('github_owner TEXT NOT NULL');
    expect(migration).toContain('github_repo TEXT NOT NULL');
    expect(migration).toContain('is_private BOOLEAN NOT NULL');
    expect(migration).toContain(
      'active_repository BOOLEAN NOT NULL DEFAULT TRUE',
    );
    expect(migration).toContain(
      "status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'ready_for_indexing', 'rejected_file_limit', 'failed'))",
    );
    expect(migration).toContain(
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
    expect(migration).toContain('CREATE TABLE repository_jobs');
    expect(migration).toContain(
      'repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE',
    );
    expect(migration).toContain(
      'replaces_repository_id UUID REFERENCES repositories(id) ON DELETE SET NULL',
    );
    expect(migration).toContain(
      "status TEXT NOT NULL CHECK (status IN ('queued', 'cloning', 'counting_files', 'ready_for_indexing', 'rejected_file_limit', 'failed'))",
    );
    expect(migration).toContain('file_count INTEGER');
    expect(migration).toContain('file_limit INTEGER');
    expect(migration).toContain('failure_code TEXT');
    expect(migration).toContain('failure_message TEXT');
    expect(migration).toContain('failure_detail TEXT');
    expect(migration).toContain('temp_clone_path TEXT');
    expect(migration).toContain('started_at TIMESTAMP WITH TIME ZONE');
    expect(migration).toContain(
      'ready_for_indexing_at TIMESTAMP WITH TIME ZONE',
    );
    expect(migration).toContain('finished_at TIMESTAMP WITH TIME ZONE');
  });
});
