import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp, loadConfig } from '../src/index.js';

describe('Backend Health & Readiness', () => {
  const validEnv = {
    PORT: '3000',
    DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/askrepo',
    REDIS_URL: 'redis://localhost:6379/0',
    OLLAMA_BASE_URL: 'http://localhost:11434',
    SESSION_SECRET: 'test-session-secret',
  };

  it('GET /health returns process-only health', async () => {
    const config = loadConfig(validEnv);
    const app = createApp(config);

    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /ready returns 200 when services are reachable', async () => {
    const config = loadConfig(validEnv);
    const app = createApp(config, {
      healthChecks: {
        checkPostgres: async () => true,
        checkRedis: async () => true,
        checkOllama: async () => true,
      },
    });

    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ready',
      checks: {
        postgres: true,
        redis: true,
        ollama: true,
      },
    });
  });

  it('GET /ready returns 503 when services are unreachable', async () => {
    const config = loadConfig(validEnv);
    const app = createApp(config, {
      healthChecks: {
        checkPostgres: async () => false,
        checkRedis: async () => false,
        checkOllama: async () => false,
      },
    });

    const res = await request(app).get('/ready');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      status: 'unready',
      checks: {
        postgres: false,
        redis: false,
        ollama: false,
      },
    });
  });

  it('loadConfig validates environment configuration', () => {
    expect(() =>
      loadConfig({
        DATABASE_URL: 'not-a-url',
      }),
    ).toThrow('Invalid environment configuration');
  });

  it('loadConfig fails when required environment configuration is missing', () => {
    expect(() => loadConfig({})).toThrow('Invalid environment configuration');
  });
});
