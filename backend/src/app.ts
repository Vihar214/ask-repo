import express, { Express } from 'express';
import cors from 'cors';

import { Config } from './config.js';
import { HealthChecks, registerHealthRoutes } from './http/routes/health.routes.js';

export interface AppDependencies {
  healthChecks?: HealthChecks;
}

export function createApp(config: Config, dependencies: AppDependencies = {}): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  registerHealthRoutes(app, config, dependencies.healthChecks);

  return app;
}
