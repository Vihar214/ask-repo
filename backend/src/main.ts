import {
  loadConfig,
  createApp,
  createDb,
  PostgresAuthStore,
  RedisRepositoryQueue,
  PostgresRepositoryStore,
} from './index.js';
import { createRedisClient } from './queues/redis.js';

const config = loadConfig();
const db = createDb(config.DATABASE_URL);
const redis = createRedisClient(config.REDIS_URL);

const app = createApp(config, {
  auth: { store: new PostgresAuthStore(db) },
  repositories: {
    store: new PostgresRepositoryStore(db),
    queue: new RedisRepositoryQueue(redis),
  },
});

app.listen(config.PORT, () => {
  console.log(`[Backend] Server running on port ${config.PORT}`);
});
