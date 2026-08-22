import express, { Express } from 'express';
import cors from 'cors';

import { Config } from './config.js';
import {
  HealthChecks,
  registerHealthRoutes,
  AuthRouteDependencies,
  registerAuthRoutes,
} from './http/index.js';

export interface AppDependencies {
  healthChecks?: HealthChecks;
  auth?: AuthRouteDependencies;
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

  return app;
}
