import { Express, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from '../../auth/index.js';
import type {
  CloneAndCountPayload,
  RepositoryRecord,
  RepositoryRouteDependencies,
} from '../../repositories/index.js';

const submitRepositorySchema = z.object({
  url: z.string().min(1),
  isPrivate: z.boolean(),
  privateRepositoryToken: z.string().max(512).nullable().optional(),
  replaceActiveRepository: z.boolean().optional().default(false),
  reindexExistingRepository: z.boolean().optional().default(false),
});

const summarizeRepository = (repository: RepositoryRecord) => ({
  id: repository.id,
  url: repository.url,
  githubOwner: repository.github_owner,
  githubRepo: repository.github_repo,
  isPrivate: repository.is_private,
  status: repository.status,
});

function normalizeGitHubRepositoryUrl(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { error: 'invalid_url' as const };
  }

  if (parsed.username || parsed.password) {
    return { error: 'token_in_url_rejected' as const };
  }

  if (parsed.protocol !== 'https:' || parsed.hostname !== 'github.com') {
    return { error: 'unsupported_url' as const };
  }

  const pathParts = parsed.pathname.replace(/\/$/, '').split('/');
  if (pathParts.length !== 3 || !pathParts[1] || !pathParts[2]) {
    return { error: 'unsupported_url' as const };
  }

  const githubOwner = pathParts[1].toLowerCase();
  let githubRepo = pathParts[2].toLowerCase();
  if (githubRepo.endsWith('.git')) {
    githubRepo = githubRepo.slice(0, -4);
  }

  if (!githubRepo) {
    return { error: 'unsupported_url' as const };
  }

  return {
    normalizedUrl: `https://github.com/${githubOwner}/${githubRepo}`,
    githubOwner,
    githubRepo,
  };
}

export function registerRepositoryRoutes(
  app: Express,
  dependencies: RepositoryRouteDependencies,
  authService: AuthService,
) {
  app.post(
    '/repos',
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const found = await authService.findLiveSession(request);
        if (!found.session) {
          return response.status(401).json({ error: 'Session required' });
        }
        if (!authService.requiresCsrf(request, found.session)) {
          return response.status(403).json({ error: 'Invalid CSRF token' });
        }

        const parsedBody = submitRepositorySchema.safeParse(request.body);
        if (!parsedBody.success) {
          return response.status(400).json({
            code: 'invalid_request',
            message: 'Repository submission is invalid.',
          });
        }

        const {
          url,
          isPrivate,
          privateRepositoryToken,
          replaceActiveRepository,
          reindexExistingRepository,
        } = parsedBody.data;

        if (!isPrivate && privateRepositoryToken) {
          return response.status(400).json({
            code: 'accidental_token_rejected',
            message: 'Public repositories should not include a token.',
          });
        }
        if (isPrivate && !privateRepositoryToken) {
          return response.status(400).json({
            code: 'token_required',
            message: 'Private repositories require a token.',
          });
        }
        if (
          isPrivate &&
          privateRepositoryToken &&
          privateRepositoryToken.length > 512
        ) {
          return response.status(400).json({
            code: 'token_too_long',
            message: 'Private Repository Token must not exceed 512 characters.',
          });
        }

        const normalized = normalizeGitHubRepositoryUrl(url);
        if ('error' in normalized) {
          return response.status(400).json({
            code: normalized.error,
            message:
              normalized.error === 'invalid_url'
                ? 'URL is invalid.'
                : 'Only GitHub HTTPS repository root URLs are supported.',
          });
        }

        if (found.session.kind === 'guest') {
          const existing = await dependencies.store.findGuestActiveRepository(
            found.session.id,
          );
          if (existing && !replaceActiveRepository) {
            return response.status(409).json({
              code: 'active_repository_exists',
              message:
                'Submitting a new repository will delete your current guest repository.',
              repository: summarizeRepository(existing),
            });
          }
          const { repository, job } =
            await dependencies.store.createRepositoryWithJob({
              sessionId: found.session.id,
              userId: null,
              url: normalized.normalizedUrl,
              githubOwner: normalized.githubOwner,
              githubRepo: normalized.githubRepo,
              isPrivate,
              activeRepository: !existing,
              replacesRepositoryId: existing?.id ?? null,
            });
          const payload: CloneAndCountPayload = {
            repositoryJobId: job.id,
            repositoryId: repository.id,
            url: normalized.normalizedUrl,
            isPrivate,
            privateRepositoryToken: isPrivate
              ? (privateRepositoryToken ?? null)
              : null,
            replaceRepositoryId: existing?.id ?? null,
          };
          await dependencies.queue.enqueueCloneAndCount(payload);
          return response.status(202).json({
            repository: summarizeRepository(repository),
            job,
          });
        }

        if (found.session.kind === 'logged_in') {
          const existing = await dependencies.store.findLoggedInRepositoryByUrl(
            found.session.userId!,
            normalized.normalizedUrl,
          );
          if (existing && !reindexExistingRepository) {
            return response.status(409).json({
              code: 'repository_already_exists',
              message:
                'This repository already exists. Reindexing will replace the old index after the new one succeeds.',
              repository: summarizeRepository(existing),
            });
          }
          if (existing && reindexExistingRepository) {
            const job = await dependencies.store.createJobForRepository(
              existing.id,
            );
            const payload: CloneAndCountPayload = {
              repositoryJobId: job.id,
              repositoryId: existing.id,
              url: normalized.normalizedUrl,
              isPrivate,
              privateRepositoryToken: isPrivate
                ? (privateRepositoryToken ?? null)
                : null,
              replaceRepositoryId: null,
            };
            await dependencies.queue.enqueueCloneAndCount(payload);
            return response.status(202).json({
              repository: summarizeRepository(existing),
              job,
            });
          }
        }

        const { repository, job } =
          await dependencies.store.createRepositoryWithJob({
            sessionId: null,
            userId: found.session.userId,
            url: normalized.normalizedUrl,
            githubOwner: normalized.githubOwner,
            githubRepo: normalized.githubRepo,
            isPrivate,
          });

        const payload: CloneAndCountPayload = {
          repositoryJobId: job.id,
          repositoryId: repository.id,
          url: normalized.normalizedUrl,
          isPrivate,
          privateRepositoryToken: isPrivate
            ? (privateRepositoryToken ?? null)
            : null,
          replaceRepositoryId: null,
        };
        await dependencies.queue.enqueueCloneAndCount(payload);

        return response.status(202).json({
          repository: summarizeRepository(repository),
          job,
        });
      } catch (error) {
        next(error);
      }
    },
  );
}
