import { loadConfig, createApp, createDb, PostgresAuthStore } from './index.js';

const config = loadConfig();
const app = createApp(config, {
  auth: { store: new PostgresAuthStore(createDb(config.DATABASE_URL)) },
});

app.listen(config.PORT, () => {
  console.log(`[Backend] Server running on port ${config.PORT}`);
});
