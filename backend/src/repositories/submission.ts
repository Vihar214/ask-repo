import type {
  CloneAndCountPayload,
  RepositoryJobRecord,
  RepositoryRecord,
  RepositoryRouteDependencies,
} from './types.js';
import { normalizeGitHubRepositoryUrl } from './url.js';

type SubmitRepositorySession =
  | {
      id: string;
      kind: 'guest';
      userId: null;
    }
  | {
      id: string;
      kind: 'logged_in';
      userId: string;
    };

interface SubmitRepositoryInput {
  session: SubmitRepositorySession;
  url: string;
  isPrivate: boolean;
  privateRepositoryToken?: string | null | undefined;
  replaceActiveRepository: boolean;
  reindexExistingRepository: boolean;
}

type SubmitRepositoryResult =
  | {
      status: 'accepted';
      repository: RepositoryRecord;
      job: RepositoryJobRecord;
    }
  | {
      status: 'bad_request';
      code:
        | 'accidental_token_rejected'
        | 'invalid_url'
        | 'token_required'
        | 'token_too_long'
        | 'token_in_url_rejected'
        | 'unsupported_url';
      message: string;
    }
  | {
      status: 'conflict';
      code: 'active_repository_exists' | 'repository_already_exists';
      message: string;
      repository: RepositoryRecord;
    };

export async function submitRepository(
  dependencies: RepositoryRouteDependencies,
  input: SubmitRepositoryInput,
): Promise<SubmitRepositoryResult> {
  const {
    session,
    url,
    isPrivate,
    privateRepositoryToken,
    replaceActiveRepository,
    reindexExistingRepository,
  } = input;

  if (!isPrivate && privateRepositoryToken) {
    return {
      status: 'bad_request',
      code: 'accidental_token_rejected',
      message: 'Public repositories should not include a token.',
    };
  }
  if (isPrivate && !privateRepositoryToken) {
    return {
      status: 'bad_request',
      code: 'token_required',
      message: 'Private repositories require a token.',
    };
  }
  if (
    isPrivate &&
    privateRepositoryToken &&
    privateRepositoryToken.length > 512
  ) {
    return {
      status: 'bad_request',
      code: 'token_too_long',
      message: 'Private Repository Token must not exceed 512 characters.',
    };
  }

  const normalized = normalizeGitHubRepositoryUrl(url);
  if ('error' in normalized) {
    return {
      status: 'bad_request',
      code: normalized.error,
      message:
        normalized.error === 'invalid_url'
          ? 'URL is invalid.'
          : 'Only GitHub HTTPS repository root URLs are supported.',
    };
  }

  if (session.kind === 'guest') {
    const existing = await dependencies.store.findGuestActiveRepository(
      session.id,
    );
    if (existing && !replaceActiveRepository) {
      return {
        status: 'conflict',
        code: 'active_repository_exists',
        message:
          'Submitting a new repository will delete your current guest repository.',
        repository: existing,
      };
    }

    const { repository, job } =
      await dependencies.store.createRepositoryWithJob({
        sessionId: session.id,
        userId: null,
        url: normalized.normalizedUrl,
        githubOwner: normalized.githubOwner,
        githubRepo: normalized.githubRepo,
        isPrivate,
        activeRepository: !existing,
        replacesRepositoryId: existing?.id ?? null,
      });

    await enqueueCloneAndCountJob(dependencies, {
      repository,
      job,
      url: normalized.normalizedUrl,
      isPrivate,
      privateRepositoryToken,
      replaceRepositoryId: existing?.id ?? null,
    });

    return { status: 'accepted', repository, job };
  }

  const existing = await dependencies.store.findLoggedInRepositoryByUrl(
    session.userId,
    normalized.normalizedUrl,
  );
  if (existing && !reindexExistingRepository) {
    return {
      status: 'conflict',
      code: 'repository_already_exists',
      message:
        'This repository already exists. Reindexing will replace the old index after the new one succeeds.',
      repository: existing,
    };
  }
  if (existing && reindexExistingRepository) {
    const job = await dependencies.store.createJobForRepository(existing.id);
    await enqueueCloneAndCountJob(dependencies, {
      repository: existing,
      job,
      url: normalized.normalizedUrl,
      isPrivate,
      privateRepositoryToken,
      replaceRepositoryId: null,
    });
    return { status: 'accepted', repository: existing, job };
  }

  const { repository, job } = await dependencies.store.createRepositoryWithJob({
    sessionId: null,
    userId: session.userId,
    url: normalized.normalizedUrl,
    githubOwner: normalized.githubOwner,
    githubRepo: normalized.githubRepo,
    isPrivate,
  });

  await enqueueCloneAndCountJob(dependencies, {
    repository,
    job,
    url: normalized.normalizedUrl,
    isPrivate,
    privateRepositoryToken,
    replaceRepositoryId: null,
  });

  return { status: 'accepted', repository, job };
}

async function enqueueCloneAndCountJob(
  dependencies: RepositoryRouteDependencies,
  {
    repository,
    job,
    url,
    isPrivate,
    privateRepositoryToken,
    replaceRepositoryId,
  }: {
    repository: RepositoryRecord;
    job: RepositoryJobRecord;
    url: string;
    isPrivate: boolean;
    privateRepositoryToken: string | null | undefined;
    replaceRepositoryId: string | null;
  },
) {
  await dependencies.queue.enqueueCloneAndCount(
    createCloneAndCountPayload({
      repositoryJobId: job.id,
      repositoryId: repository.id,
      url,
      isPrivate,
      privateRepositoryToken,
      replaceRepositoryId,
    }),
  );
}

function createCloneAndCountPayload({
  repositoryJobId,
  repositoryId,
  url,
  isPrivate,
  privateRepositoryToken,
  replaceRepositoryId,
}: {
  repositoryJobId: string;
  repositoryId: string;
  url: string;
  isPrivate: boolean;
  privateRepositoryToken: string | null | undefined;
  replaceRepositoryId: string | null;
}): CloneAndCountPayload {
  return {
    repositoryJobId,
    repositoryId,
    url,
    isPrivate,
    privateRepositoryToken: isPrivate ? (privateRepositoryToken ?? null) : null,
    replaceRepositoryId,
  };
}
