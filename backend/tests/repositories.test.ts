import { describe, expect, it } from 'vitest';
import request from 'supertest';

import {
  AuthStore,
  createApp,
  DatabaseSchema,
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

  async updateSession(id: string, changes: Partial<SessionRecord>) {
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
    if (existing) return existing;
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
  }
}

type StoredRepository = DatabaseSchema['repositories'];
type StoredRepositoryJob = DatabaseSchema['repository_jobs'];

class MemoryRepositoryStore {
  repositories = new Map<string, StoredRepository>();
  jobs = new Map<string, StoredRepositoryJob>();
  deletedRepositoryIds: string[] = [];
  private count = 0;

  async findGuestActiveRepository(sessionId: string) {
    return [...this.repositories.values()].find(
      (repository) =>
        repository.session_id === sessionId && repository.active_repository,
    );
  }

  async findLoggedInRepositoryByUrl(userId: string, url: string) {
    return [...this.repositories.values()].find(
      (repository) => repository.user_id === userId && repository.url === url,
    );
  }

  async deleteRepository(id: string) {
    this.deletedRepositoryIds.push(id);
    this.repositories.delete(id);
    for (const job of this.jobs.values()) {
      if (job.repository_id === id) this.jobs.delete(job.id);
    }
  }

  async createRepositoryWithJob(input: {
    sessionId: string | null;
    userId: string | null;
    url: string;
    githubOwner: string;
    githubRepo: string;
    isPrivate: boolean;
    activeRepository?: boolean;
    replacesRepositoryId?: string | null;
  }) {
    const now = new Date();
    const repository: StoredRepository = {
      id: `repository-${++this.count}`,
      session_id: input.sessionId,
      user_id: input.userId,
      url: input.url,
      github_owner: input.githubOwner,
      github_repo: input.githubRepo,
      is_private: input.isPrivate,
      active_repository: input.activeRepository ?? true,
      status: 'queued',
      created_at: now,
      updated_at: now,
    };
    const job: StoredRepositoryJob = {
      id: `repository-job-${++this.count}`,
      repository_id: repository.id,
      replaces_repository_id: input.replacesRepositoryId ?? null,
      status: 'queued',
      file_count: null,
      file_limit: null,
      failure_code: null,
      failure_message: null,
      failure_detail: null,
      temp_clone_path: null,
      previous_repository_status: null,
      started_at: null,
      ready_for_indexing_at: null,
      finished_at: null,
      created_at: now,
      updated_at: now,
    };
    this.repositories.set(repository.id, repository);
    this.jobs.set(job.id, job);
    return { repository, job };
  }

  async createJobForRepository(repositoryId: string) {
    const now = new Date();
    const repository = this.repositories.get(repositoryId);
    const job: StoredRepositoryJob = {
      id: `repository-job-${++this.count}`,
      repository_id: repositoryId,
      replaces_repository_id: null,
      previous_repository_status: repository?.status ?? null,
      status: 'queued',
      file_count: null,
      file_limit: null,
      failure_code: null,
      failure_message: null,
      failure_detail: null,
      temp_clone_path: null,
      started_at: null,
      ready_for_indexing_at: null,
      finished_at: null,
      created_at: now,
      updated_at: now,
    };
    this.jobs.set(job.id, job);
    return job;
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

function createRepositoryApp() {
  const authStore = new MemoryAuthStore();
  const repositoryStore = new MemoryRepositoryStore();
  const enqueuedJobs: unknown[] = [];
  const app = createApp(config, {
    auth: { store: authStore, oauth },
    repositories: {
      store: repositoryStore,
      queue: {
        enqueueCloneAndCount: async (payload: unknown) => {
          enqueuedJobs.push(payload);
        },
      },
    },
  });
  return { app, authStore, repositoryStore, enqueuedJobs };
}

async function logIn(agent: request.SuperAgentTest) {
  await agent.get('/session');
  const start = await agent.get('/auth/github/start');
  const state = new URL(start.headers.location).searchParams.get('state')!;
  await agent.get(`/auth/github/callback?code=ok&state=${state}`);
  return agent.get('/session');
}

describe('Repository submit HTTP API', () => {
  it('submits a public Repository Job with normalized URL and no Private Repository Token', async () => {
    const { app, repositoryStore, enqueuedJobs } = createRepositoryApp();
    const agent = request.agent(app);
    const session = await agent.get('/session');

    const response = await agent
      .post('/repos')
      .set('x-csrf-token', session.body.session.csrfToken)
      .send({
        url: 'https://github.com/OpenAI/Foo.git?tab=readme#intro',
        isPrivate: false,
        privateRepositoryToken: null,
        replaceActiveRepository: false,
        reindexExistingRepository: false,
      });

    expect(response.status).toBe(202);
    expect(response.body.repository).toMatchObject({
      url: 'https://github.com/openai/foo',
      githubOwner: 'openai',
      githubRepo: 'foo',
      isPrivate: false,
      status: 'queued',
    });
    expect(response.body.job).toMatchObject({ status: 'queued' });
    expect(enqueuedJobs).toEqual([
      {
        repositoryJobId: response.body.job.id,
        repositoryId: response.body.repository.id,
        url: 'https://github.com/openai/foo',
        isPrivate: false,
        privateRepositoryToken: null,
        replaceRepositoryId: null,
      },
    ]);
    expect([...repositoryStore.repositories.values()][0].url).toBe(
      'https://github.com/openai/foo',
    );
  });

  it('requires CSRF and rejects unsupported URL and token combinations', async () => {
    const { app } = createRepositoryApp();
    const agent = request.agent(app);
    const session = await agent.get('/session');

    expect(
      (
        await agent.post('/repos').send({
          url: 'https://github.com/openai/foo',
          isPrivate: false,
          privateRepositoryToken: null,
          replaceActiveRepository: false,
          reindexExistingRepository: false,
        })
      ).status,
    ).toBe(403);

    const cases = [
      ['not-a-url', 'invalid_url'],
      ['git@github.com:openai/foo.git', 'invalid_url'],
      ['https://token@github.com/openai/foo', 'token_in_url_rejected'],
      ['https://gitlab.com/openai/foo', 'unsupported_url'],
      ['https://github.com/openai/foo/tree/main/src', 'unsupported_url'],
    ] as const;

    for (const [url, code] of cases) {
      const response = await agent
        .post('/repos')
        .set('x-csrf-token', session.body.session.csrfToken)
        .send({
          url,
          isPrivate: false,
          privateRepositoryToken: null,
          replaceActiveRepository: false,
          reindexExistingRepository: false,
        });
      expect(response.status).toBe(400);
      expect(response.body.code).toBe(code);
    }

    const publicWithToken = await agent
      .post('/repos')
      .set('x-csrf-token', session.body.session.csrfToken)
      .send({
        url: 'https://github.com/openai/foo',
        isPrivate: false,
        privateRepositoryToken: 'ghp_secret',
        replaceActiveRepository: false,
        reindexExistingRepository: false,
      });
    expect(publicWithToken.status).toBe(400);
  });

  it('submits a private Repository Job without persisting the Private Repository Token', async () => {
    const { app, repositoryStore, enqueuedJobs } = createRepositoryApp();
    const agent = request.agent(app);
    const session = await agent.get('/session');

    const missingToken = await agent
      .post('/repos')
      .set('x-csrf-token', session.body.session.csrfToken)
      .send({
        url: 'https://github.com/openai/private',
        isPrivate: true,
        privateRepositoryToken: '',
        replaceActiveRepository: false,
        reindexExistingRepository: false,
      });
    expect(missingToken.status).toBe(400);

    const response = await agent
      .post('/repos')
      .set('x-csrf-token', session.body.session.csrfToken)
      .send({
        url: 'https://github.com/openai/private',
        isPrivate: true,
        privateRepositoryToken: 'ghp_private_token',
        replaceActiveRepository: false,
        reindexExistingRepository: false,
      });

    expect(response.status).toBe(202);
    expect(enqueuedJobs[0]).toMatchObject({
      url: 'https://github.com/openai/private',
      isPrivate: true,
      privateRepositoryToken: 'ghp_private_token',
    });
    expect(
      JSON.stringify([...repositoryStore.repositories.values()]),
    ).not.toContain('ghp_private_token');
    expect(JSON.stringify([...repositoryStore.jobs.values()])).not.toContain(
      'ghp_private_token',
    );
  });

  it('requires consent before replacing a Guest User Active Repository', async () => {
    const { app, repositoryStore } = createRepositoryApp();
    const agent = request.agent(app);
    const session = await agent.get('/session');

    await agent
      .post('/repos')
      .set('x-csrf-token', session.body.session.csrfToken)
      .send({
        url: 'https://github.com/openai/first',
        isPrivate: false,
        privateRepositoryToken: null,
        replaceActiveRepository: false,
        reindexExistingRepository: false,
      });

    const conflict = await agent
      .post('/repos')
      .set('x-csrf-token', session.body.session.csrfToken)
      .send({
        url: 'https://github.com/openai/second',
        isPrivate: false,
        privateRepositoryToken: null,
        replaceActiveRepository: false,
        reindexExistingRepository: false,
      });
    expect(conflict.status).toBe(409);
    expect(conflict.body).toMatchObject({
      code: 'active_repository_exists',
      message:
        'Submitting a new repository will delete your current guest repository.',
    });

    const replaced = await agent
      .post('/repos')
      .set('x-csrf-token', session.body.session.csrfToken)
      .send({
        url: 'https://github.com/openai/second',
        isPrivate: false,
        privateRepositoryToken: null,
        replaceActiveRepository: true,
        reindexExistingRepository: false,
      });
    expect(replaced.status).toBe(202);
    expect(repositoryStore.deletedRepositoryIds).toEqual([]);
    expect([...repositoryStore.repositories.values()]).toHaveLength(2);
    expect(
      [...repositoryStore.repositories.values()][0].active_repository,
    ).toBe(true);
    expect([...repositoryStore.repositories.values()][1]).toMatchObject({
      url: 'https://github.com/openai/second',
      active_repository: false,
    });
    expect([...repositoryStore.jobs.values()][1]).toMatchObject({
      replaces_repository_id: [...repositoryStore.repositories.values()][0].id,
    });
    expect([...repositoryStore.repositories.values()][1].url).toBe(
      'https://github.com/openai/second',
    );
  });

  it('requires consent before reindexing an existing Logged-In User Repository', async () => {
    const { app, repositoryStore } = createRepositoryApp();
    const agent = request.agent(app);
    const loggedIn = await logIn(agent);

    await agent
      .post('/repos')
      .set('x-csrf-token', loggedIn.body.session.csrfToken)
      .send({
        url: 'https://github.com/openai/foo',
        isPrivate: false,
        privateRepositoryToken: null,
        replaceActiveRepository: false,
        reindexExistingRepository: false,
      });

    const conflict = await agent
      .post('/repos')
      .set('x-csrf-token', loggedIn.body.session.csrfToken)
      .send({
        url: 'https://github.com/OpenAI/Foo.git',
        isPrivate: false,
        privateRepositoryToken: null,
        replaceActiveRepository: false,
        reindexExistingRepository: false,
      });
    expect(conflict.status).toBe(409);
    expect(conflict.body).toMatchObject({
      code: 'repository_already_exists',
      message:
        'This repository already exists. Reindexing will replace the old index after the new one succeeds.',
    });

    const reindex = await agent
      .post('/repos')
      .set('x-csrf-token', loggedIn.body.session.csrfToken)
      .send({
        url: 'https://github.com/OpenAI/Foo.git',
        isPrivate: false,
        privateRepositoryToken: null,
        replaceActiveRepository: false,
        reindexExistingRepository: true,
      });
    expect(reindex.status).toBe(202);
    expect(repositoryStore.repositories.size).toBe(1);
    expect(repositoryStore.jobs.size).toBe(2);
    expect(repositoryStore.deletedRepositoryIds).toEqual([]);
  });
});
