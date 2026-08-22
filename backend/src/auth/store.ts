import { randomUUID } from 'node:crypto';
import { Kysely } from 'kysely';

import { DatabaseSchema } from '../db/index.js';

export type SessionKind = 'guest' | 'logged_in';
export interface SessionRecord {
  id: string;
  kind: SessionKind;
  userId: string | null;
  csrfToken: string;
  oauthState: string | null;
  oauthStateExpiresAt: Date | null;
  expiresAt: Date;
  lastSeenAt: Date;
}
export interface UserRecord {
  id: string;
  githubUserId: string;
  githubUsername: string;
  avatarUrl: string | null;
  email: string | null;
  lastLoginAt: Date;
}
export interface GitHubIdentity {
  id: string;
  login: string;
  avatarUrl: string | null;
  email: string | null;
}

export interface AuthStore {
  createSession(
    kind: SessionKind,
    userId: string | null,
    csrfToken: string,
    expiresAt: Date,
    now: Date,
  ): Promise<SessionRecord>;
  getSession(id: string): Promise<SessionRecord | undefined>;
  getUser(id: string): Promise<UserRecord | undefined>;
  updateSession(
    id: string,
    changes: Partial<
      Pick<
        SessionRecord,
        | 'csrfToken'
        | 'oauthState'
        | 'oauthStateExpiresAt'
        | 'expiresAt'
        | 'lastSeenAt'
      >
    >,
  ): Promise<void>;
  deleteSession(id: string): Promise<void>;
  upsertUser(identity: GitHubIdentity, now: Date): Promise<UserRecord>;
  deleteAccount(id: string): Promise<void>;
}

const rowToSession = (row: DatabaseSchema['sessions']): SessionRecord => ({
  id: row.id,
  kind: row.kind,
  userId: row.user_id,
  csrfToken: row.csrf_token,
  oauthState: row.oauth_state,
  oauthStateExpiresAt: row.oauth_state_expires_at,
  expiresAt: row.expires_at,
  lastSeenAt: row.last_seen_at,
});

const rowToUser = (row: DatabaseSchema['users']): UserRecord => ({
  id: row.id,
  githubUserId: row.github_user_id,
  githubUsername: row.github_username,
  avatarUrl: row.avatar_url,
  email: row.email,
  lastLoginAt: row.last_login_at,
});

export class PostgresAuthStore implements AuthStore {
  constructor(private readonly db: Kysely<DatabaseSchema>) {}
  async createSession(
    kind: SessionKind,
    userId: string | null,
    csrfToken: string,
    expiresAt: Date,
    now: Date,
  ) {
    const row = await this.db
      .insertInto('sessions')
      .values({
        id: randomUUID(),
        kind,
        user_id: userId,
        csrf_token: csrfToken,
        oauth_state: null,
        oauth_state_expires_at: null,
        expires_at: expiresAt,
        last_seen_at: now,
        created_at: now,
        updated_at: now,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return rowToSession(row);
  }

  async getSession(id: string) {
    const row = await this.db
      .selectFrom('sessions')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? rowToSession(row) : undefined;
  }

  async getUser(id: string) {
    const row = await this.db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? rowToUser(row) : undefined;
  }

  async updateSession(
    id: string,
    changes: Partial<
      Pick<
        SessionRecord,
        | 'csrfToken'
        | 'oauthState'
        | 'oauthStateExpiresAt'
        | 'expiresAt'
        | 'lastSeenAt'
      >
    >,
  ) {
    const updateValues: Partial<DatabaseSchema['sessions']> = {
      updated_at: new Date(),
    };
    if ('csrfToken' in changes) updateValues.csrf_token = changes.csrfToken;
    if ('oauthState' in changes) updateValues.oauth_state = changes.oauthState;
    if ('oauthStateExpiresAt' in changes)
      updateValues.oauth_state_expires_at = changes.oauthStateExpiresAt;
    if ('expiresAt' in changes) updateValues.expires_at = changes.expiresAt;
    if ('lastSeenAt' in changes)
      updateValues.last_seen_at = changes.lastSeenAt;

    await this.db
      .updateTable('sessions')
      .set(updateValues)
      .where('id', '=', id)
      .execute();
  }

  async deleteSession(id: string) {
    await this.db.deleteFrom('sessions').where('id', '=', id).execute();
  }

  async upsertUser(identity: GitHubIdentity, now: Date) {
    const existing = await this.db
      .selectFrom('users')
      .selectAll()
      .where('github_user_id', '=', identity.id)
      .executeTakeFirst();
    if (existing) {
      await this.db
        .updateTable('users')
        .set({ last_login_at: now, updated_at: now })
        .where('id', '=', existing.id)
        .execute();
      return rowToUser({ ...existing, last_login_at: now });
    }
    const row = await this.db
      .insertInto('users')
      .values({
        id: randomUUID(),
        github_user_id: identity.id,
        github_username: identity.login,
        avatar_url: identity.avatarUrl,
        email: identity.email,
        last_login_at: now,
        created_at: now,
        updated_at: now,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return rowToUser(row);
  }

  async deleteAccount(id: string) {
    await this.db.deleteFrom('users').where('id', '=', id).execute();
  }
}
