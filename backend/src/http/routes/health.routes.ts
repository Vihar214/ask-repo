import { Express, Request, Response } from 'express';
import { sql } from 'kysely';

import { Config } from '../../config.js';
import { createDb } from '../../db/client.js';
import { createRedisClient } from '../../queues/redis.js';

export interface HealthChecks {
  checkPostgres: () => Promise<boolean>;
  checkRedis: () => Promise<boolean>;
  checkOllama: () => Promise<boolean>;
}

function createDefaultHealthChecks(config: Config): HealthChecks {
  const db = createDb(config.DATABASE_URL);

  return {
    async checkPostgres() {
      try {
        await sql`SELECT 1`.execute(db);
        return true;
      } catch {
        return false;
      }
    },
    async checkRedis() {
      const redis = createRedisClient(config.REDIS_URL);
      try {
        const pong = await redis.ping();
        return pong === 'PONG';
      } catch {
        return false;
      } finally {
        redis.disconnect();
      }
    },
    async checkOllama() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const resp = await fetch(`${config.OLLAMA_BASE_URL}/api/version`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return resp.ok;
      } catch {
        return false;
      }
    },
  };
}

export function registerHealthRoutes(app: Express, config: Config, healthChecks = createDefaultHealthChecks(config)) {
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/ready', async (_req: Request, res: Response) => {
    const [postgresOk, redisOk, ollamaOk] = await Promise.all([
      healthChecks.checkPostgres(),
      healthChecks.checkRedis(),
      healthChecks.checkOllama(),
    ]);

    const allOk = postgresOk && redisOk && ollamaOk;
    const statusCode = allOk ? 200 : 503;

    res.status(statusCode).json({
      status: allOk ? 'ready' : 'unready',
      checks: {
        postgres: postgresOk,
        redis: redisOk,
        ollama: ollamaOk,
      },
    });
  });
}
