import { Express } from 'express';

import { Config } from '../../config.js';
import { AuthService, AuthServiceDependencies } from '../../auth/index.js';

export interface AuthRouteDependencies extends AuthServiceDependencies {}

export function registerAuthRoutes(
  app: Express,
  config: Config,
  dependencies: AuthRouteDependencies,
) {
  const authService = new AuthService(config, dependencies);

  app.get('/session', async (request, response, next) => {
    try {
      return response.json(
        await authService.bootstrapSession(request, response),
      );
    } catch (error) {
      next(error);
    }
  });

  app.get('/auth/github/start', async (request, response, next) => {
    try {
      return response.redirect(
        await authService.beginGitHubLogin(request, response),
      );
    } catch (error) {
      next(error);
    }
  });

  app.get('/auth/github/callback', async (request, response, next) => {
    try {
      return response.redirect(
        await authService.completeGitHubLogin(request, response),
      );
    } catch (error) {
      next(error);
    }
  });

  app.post('/auth/logout', async (request, response, next) => {
    try {
      const found = await authService.findLiveSession(request);
      if (found.session && !authService.requiresCsrf(request, found.session)) {
        return response.status(403).json({ error: 'Invalid CSRF token' });
      }
      await authService.logout(request, response);
      return response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.delete('/account', async (request, response, next) => {
    try {
      const found = await authService.findLiveSession(request);
      if (
        !found.session ||
        found.session.kind !== 'logged_in' ||
        !found.session.userId
      ) {
        return response
          .status(401)
          .json({ error: 'Logged-in session required' });
      }
      if (!authService.requiresCsrf(request, found.session)) {
        return response.status(403).json({ error: 'Invalid CSRF token' });
      }
      await authService.deleteAccount(found.session.userId, response);
      return response.status(204).end();
    } catch (error) {
      next(error);
    }
  });
}
