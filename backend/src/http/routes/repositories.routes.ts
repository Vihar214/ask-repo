import { Express, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from '../../auth/index.js';
import {
  submitRepository,
  type RepositoryRecord,
  type RepositoryRouteDependencies,
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

        if (found.session.kind === 'guest') {
          const result = await submitRepository(dependencies, {
            session: { id: found.session.id, kind: 'guest', userId: null },
            ...parsedBody.data,
          });
          return sendSubmitRepositoryResult(response, result);
        }

        if (!found.session.userId) {
          return response.status(401).json({ error: 'Session required' });
        }

        const result = await submitRepository(dependencies, {
          session: {
            id: found.session.id,
            kind: 'logged_in',
            userId: found.session.userId,
          },
          ...parsedBody.data,
        });
        return sendSubmitRepositoryResult(response, result);
      } catch (error) {
        next(error);
      }
    },
  );
}

type SubmitRepositoryResult = Awaited<ReturnType<typeof submitRepository>>;

function sendSubmitRepositoryResult(
  response: Response,
  result: SubmitRepositoryResult,
) {
  if (result.status === 'bad_request') {
    return response.status(400).json({
      code: result.code,
      message: result.message,
    });
  }

  if (result.status === 'conflict') {
    return response.status(409).json({
      code: result.code,
      message: result.message,
      repository: summarizeRepository(result.repository),
    });
  }

  return response.status(202).json({
    repository: summarizeRepository(result.repository),
    job: result.job,
  });
}
