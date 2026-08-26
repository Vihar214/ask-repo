import express, { Express } from 'express';
import cors from 'cors';

import { Config } from './config.js';
import {
  HealthChecks,
  registerHealthRoutes,
  AuthRouteDependencies,
  registerAuthRoutes,
} from './http/index.js';
import { AuthService } from './auth/index.js';
import { registerRepositoryRoutes } from './http/routes/repositories.routes.js';
import type { RepositoryRouteDependencies } from './repositories/index.js';

export interface AppDependencies {
  healthChecks?: HealthChecks;
  auth?: AuthRouteDependencies;
  repositories?: RepositoryRouteDependencies;
}

export function createApp(
  config: Config,
  dependencies: AppDependencies = {},
): Express {
  const app = express();
  app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));
  app.use(express.json());

  registerHealthRoutes(app, config, dependencies.healthChecks);
  if (dependencies.auth) registerAuthRoutes(app, config, dependencies.auth);
  if (dependencies.repositories && dependencies.auth) {
    registerRepositoryRoutes(
      app,
      dependencies.repositories,
      new AuthService(config, dependencies.auth),
    );
  }

  return app;
}
