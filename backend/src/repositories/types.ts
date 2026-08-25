import type { DatabaseSchema } from '../db/index.js';

export type RepositoryRecord = DatabaseSchema['repositories'];
export type RepositoryJobRecord = DatabaseSchema['repository_jobs'];

export interface CreateRepositoryWithJobInput {
  sessionId: string | null;
  userId: string | null;
  url: string;
  githubOwner: string;
  githubRepo: string;
  isPrivate: boolean;
  activeRepository?: boolean;
  replacesRepositoryId?: string | null;
}

export interface RepositoryStore {
  findGuestActiveRepository(
    sessionId: string,
  ): Promise<RepositoryRecord | undefined>;
  findLoggedInRepositoryByUrl(
    userId: string,
    url: string,
  ): Promise<RepositoryRecord | undefined>;
  deleteRepository(id: string): Promise<void>;
  createJobForRepository(repositoryId: string): Promise<RepositoryJobRecord>;
  createRepositoryWithJob(
    input: CreateRepositoryWithJobInput,
  ): Promise<{ repository: RepositoryRecord; job: RepositoryJobRecord }>;
}

export interface CloneAndCountPayload {
  repositoryJobId: string;
  repositoryId: string;
  url: string;
  isPrivate: boolean;
  privateRepositoryToken: string | null;
  replaceRepositoryId: string | null;
}

export interface RepositoryQueue {
  enqueueCloneAndCount(payload: CloneAndCountPayload): Promise<void>;
}

export interface RepositoryRouteDependencies {
  store: RepositoryStore;
  queue: RepositoryQueue;
}
