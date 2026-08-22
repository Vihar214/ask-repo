import { describe, expect, it } from 'vitest';
import request from 'supertest';

import {
  AuthStore,
  createApp,
  GitHubIdentity,
  GitHubOAuthClient,
  loadConfig,
  SessionKind,
  SessionRecord,
  UserRecord,
} from '../src/index.js';

class MemoryAuthStore implements AuthStore {
  sessions = new Map<string, SessionRecord>();
  users = new Map<string, UserRecord>();
  private count = 0;
  async createSession(
    kind: SessionKind,
    userId: string | null,
    csrfToken: string,
    expiresAt: Date,
    now: Date,
  ) {
    const session = {
      id: `session-${++this.count}`,
      kind,
      userId,
      csrfToken,
      oauthState: null,
      oauthStateExpiresAt: null,
      expiresAt,
      lastSeenAt: now,
    };
    this.sessions.set(session.id, session);
    return session;
  }
  async getSession(id: string) {
    return this.sessions.get(id);
  }
  async getUser(id: string) {
    return this.users.get(id);
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
    const session = this.sessions.get(id);
    if (session) Object.assign(session, changes);
  }
  async deleteSession(id: string) {
    this.sessions.delete(id);
  }
  async upsertUser(identity: GitHubIdentity, now: Date) {
    const existing = [...this.users.values()].find(
      (user) => user.githubUserId === identity.id,
    );
    if (existing) {
      existing.lastLoginAt = now;
      return existing;
    }
    const user = {
      id: `user-${++this.count}`,
      githubUserId: identity.id,
      githubUsername: identity.login,
      avatarUrl: identity.avatarUrl,
      email: identity.email,
      lastLoginAt: now,
    };
    this.users.set(user.id, user);
    return user;
  }
  async deleteAccount(id: string) {
    this.users.delete(id);
    for (const session of this.sessions.values()) {
      if (session.userId === id) this.sessions.delete(session.id);
    }
  }
}

const config = loadConfig({
  PORT: '3000',
  DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/askrepo',
  REDIS_URL: 'redis://localhost:6379/0',
  OLLAMA_BASE_URL: 'http://localhost:11434',
  SESSION_SECRET: 'test-secret',
});
const oauth: GitHubOAuthClient = {
  authorizationUrl: (state) => `https://github.test/authorize?state=${state}`,
  exchange: async () => ({
    id: '42',
    login: 'octo',
    avatarUrl: null,
    email: 'octo@example.test',
  }),
};
const createClock = (start: string) => {
  let current = new Date(start);
  return {
    now: () => current,
    set: (next: string) => {
      current = new Date(next);
    },
  };
};

describe('auth HTTP API', () => {
  it('bootstraps a guest session with expiry metadata and a non-persistent cookie', async () => {
    const app = createApp(config, {
      auth: { store: new MemoryAuthStore(), oauth },
    });
    const response = await request(app).get('/session');
    expect(response.status).toBe(200);
    expect(response.body.session.kind).toBe('guest');
    expect(response.body.session.expiresAt).toBeTruthy();
    expect(response.body.session.csrfToken).toBeTruthy();
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(response.headers['set-cookie'][0]).not.toContain('Max-Age=');
  });

  it('logs in, reuses the GitHub user, and rolls the logged-in session expiry forward', async () => {
    const clock = createClock('2026-01-01T00:00:00.000Z');
    const store = new MemoryAuthStore();
    const app = createApp(config, { auth: { store, oauth, clock: clock.now } });
    const agent = request.agent(app);
    await agent.get('/session');
    const start = await agent.get('/auth/github/start');
    const state = new URL(start.headers.location).searchParams.get('state')!;
    const callback = await agent.get(
      `/auth/github/callback?code=ok&state=${state}`,
    );
    expect(callback.status).toBe(302);
    expect(callback.headers.location).toBe(config.FRONTEND_URL);
    expect(callback.headers['set-cookie'][0]).toContain('Max-Age=2592000');
    const session = await agent.get('/session');
    expect(session.body.session.kind).toBe('logged_in');
    expect(session.body.user.githubUsername).toBe('octo');
    const firstExpiry = session.body.session.expiresAt;
    clock.set('2026-01-10T00:00:00.000Z');
    const rolled = await agent.get('/session');
    expect(new Date(rolled.body.session.expiresAt).getTime()).toBeGreaterThan(
      new Date(firstExpiry).getTime(),
    );
    const secondStart = await agent.get('/auth/github/start');
    const secondState = new URL(secondStart.headers.location).searchParams.get(
      'state',
    )!;
    await agent.get(`/auth/github/callback?code=again&state=${secondState}`);
    expect(store.users.size).toBe(1);
  });

  it('falls back to a new guest session after invalid OAuth state or a stale cookie', async () => {
    const store = new MemoryAuthStore();
    const app = createApp(config, { auth: { store, oauth } });
    const agent = request.agent(app);
    await agent.get('/session');
    const failed = await agent.get('/auth/github/callback?code=ok&state=wrong');
    expect(failed.status).toBe(302);
    const guest = await agent.get('/session');
    expect(guest.body.session.kind).toBe('guest');
    expect(guest.body.session.recovered).toBe(false);
    const stale = await request(app)
      .get('/session')
      .set('Cookie', 'ask_repo_session=missing.invalid');
    expect(stale.body.session.kind).toBe('guest');
    expect(stale.body.session.recovered).toBe(true);
  });

  it('keeps the prior guest session when a GitHub identity exchange fails', async () => {
    const store = new MemoryAuthStore();
    const app = createApp(config, {
      auth: {
        store,
        oauth: {
          ...oauth,
          exchange: async () => {
            throw new Error('GitHub unavailable');
          },
        },
      },
    });
    const agent = request.agent(app);
    const original = await agent.get('/session');
    const start = await agent.get('/auth/github/start');
    const state = new URL(start.headers.location).searchParams.get('state')!;
    await agent.get(`/auth/github/callback?code=ok&state=${state}`);
    const session = await agent.get('/session');
    expect(session.body.session.kind).toBe('guest');
    expect(session.body.session.csrfToken).toBe(
      original.body.session.csrfToken,
    );
    expect(store.sessions.size).toBe(1);
  });

  it('logout removes only the active session, then bootstraps a fresh guest session, and account deletion removes all user sessions', async () => {
    const store = new MemoryAuthStore();
    const app = createApp(config, { auth: { store, oauth } });
    const agent = request.agent(app);
    await agent.get('/session');
    const start = await agent.get('/auth/github/start');
    const state = new URL(start.headers.location).searchParams.get('state')!;
    await agent.get(`/auth/github/callback?code=ok&state=${state}`);
    const loggedIn = await agent.get('/session');
    const csrf = loggedIn.body.session.csrfToken;
    const userId = [...store.users.keys()][0];
    const second = await store.createSession(
      'logged_in',
      userId,
      'second-csrf',
      new Date(Date.now() + 10000),
      new Date(),
    );
    expect((await agent.post('/auth/logout')).status).toBe(403);
    expect(
      (await agent.post('/auth/logout').set('x-csrf-token', csrf)).status,
    ).toBe(204);
    expect(store.users.size).toBe(1);
    expect(store.sessions.has(second.id)).toBe(true);
    const guest = await agent.get('/session');
    expect(guest.body.session.kind).toBe('guest');
    expect(guest.body.session.csrfToken).not.toBe(csrf);
    expect(guest.headers['set-cookie'][0]).not.toContain('Max-Age=');
    const reloginStart = await agent.get('/auth/github/start');
    const reloginState = new URL(
      reloginStart.headers.location,
    ).searchParams.get('state')!;
    await agent.get(`/auth/github/callback?code=ok&state=${reloginState}`);
    const active = await agent.get('/session');
    expect(
      (
        await agent
          .delete('/account')
          .set('x-csrf-token', active.body.session.csrfToken)
      ).status,
    ).toBe(204);
    expect(store.users.size).toBe(0);
    expect(store.sessions.size).toBe(0);
  });
});
