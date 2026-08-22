import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationPath = path.resolve(
  process.cwd(),
  '../migrations/0002_auth_and_sessions.sql',
);
const migration = readFileSync(migrationPath, 'utf8');

describe('auth migration contract', () => {
  it('creates users with GitHub identity uniqueness and login metadata', () => {
    expect(migration).toContain('CREATE TABLE users');
    expect(migration).toContain('github_user_id TEXT NOT NULL UNIQUE');
    expect(migration).toContain('github_username TEXT NOT NULL');
    expect(migration).toContain(
      'last_login_at TIMESTAMP WITH TIME ZONE NOT NULL',
    );
  });

  it('creates sessions with auth lifecycle and recovery metadata', () => {
    expect(migration).toContain('CREATE TABLE sessions');
    expect(migration).toContain(
      "kind TEXT NOT NULL CHECK (kind IN ('guest', 'logged_in'))",
    );
    expect(migration).toContain('csrf_token TEXT NOT NULL');
    expect(migration).toContain('oauth_state TEXT');
    expect(migration).toContain(
      'oauth_state_expires_at TIMESTAMP WITH TIME ZONE',
    );
    expect(migration).toContain('expires_at TIMESTAMP WITH TIME ZONE NOT NULL');
    expect(migration).toContain(
      'last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL',
    );
  });

  it('enforces the guest versus logged-in session shape and indexes expiry lookups', () => {
    expect(migration).toContain(
      "CHECK ((kind = 'guest' AND user_id IS NULL) OR (kind = 'logged_in' AND user_id IS NOT NULL))",
    );
    expect(migration).toContain(
      'CREATE INDEX sessions_user_id_idx ON sessions(user_id);',
    );
    expect(migration).toContain(
      'CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);',
    );
  });
});
