import { Kysely } from 'kysely';
import crypto from 'crypto';
import { DatabaseSchema } from '../db/index.js';
import type { CreateRepositoryWithJobInput, RepositoryStore } from './types.js';

export class PostgresRepositoryStore implements RepositoryStore {
  constructor(private db: Kysely<DatabaseSchema>) {}

  async findGuestActiveRepository(sessionId: string) {
    return this.db
      .selectFrom('repositories')
      .selectAll()
      .where('session_id', '=', sessionId)
      .where('user_id', 'is', null)
      .where('active_repository', '=', true)
      .executeTakeFirst();
  }

  async deleteRepository(id: string) {
    await this.db.deleteFrom('repositories').where('id', '=', id).execute();
  }

  async findLoggedInRepositoryByUrl(userId: string, url: string) {
    return this.db
      .selectFrom('repositories')
      .selectAll()
      .where('user_id', '=', userId)
      .where('url', '=', url)
      .executeTakeFirst();
  }

  async createJobForRepository(repositoryId: string) {
    const jobId = crypto.randomUUID();
    const now = new Date();
    const repository = await this.db
      .selectFrom('repositories')
      .select(['status'])
      .where('id', '=', repositoryId)
      .executeTakeFirstOrThrow();

    await this.db
      .insertInto('repository_jobs')
      .values({
        id: jobId,
        repository_id: repositoryId,
        replaces_repository_id: null,
        previous_repository_status: repository.status,
        status: 'queued',
        created_at: now,
        updated_at: now,
      })
      .execute();

    return this.db
      .selectFrom('repository_jobs')
      .selectAll()
      .where('id', '=', jobId)
      .executeTakeFirstOrThrow();
  }

  async createRepositoryWithJob(params: CreateRepositoryWithJobInput) {
    const repoId = crypto.randomUUID();
    const jobId = crypto.randomUUID();
    const now = new Date();

    await this.db.transaction().execute(async (trx) => {
      await trx
        .insertInto('repositories')
        .values({
          id: repoId,
          session_id: params.sessionId,
          user_id: params.userId,
          url: params.url,
          github_owner: params.githubOwner,
          github_repo: params.githubRepo,
          is_private: params.isPrivate,
          active_repository: params.activeRepository ?? true,
          status: 'queued',
          created_at: now,
          updated_at: now,
        })
        .execute();

      await trx
        .insertInto('repository_jobs')
        .values({
          id: jobId,
          repository_id: repoId,
          replaces_repository_id: params.replacesRepositoryId ?? null,
          previous_repository_status: null,
          status: 'queued',
          created_at: now,
          updated_at: now,
        })
        .execute();
    });

    const [repository, job] = await Promise.all([
      this.db
        .selectFrom('repositories')
        .selectAll()
        .where('id', '=', repoId)
        .executeTakeFirstOrThrow(),
      this.db
        .selectFrom('repository_jobs')
        .selectAll()
        .where('id', '=', jobId)
        .executeTakeFirstOrThrow(),
    ]);

    return { repository, job };
  }
}
