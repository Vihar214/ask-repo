import { loadConfig } from './config.js';
import { createApp } from './app.js';

const config = loadConfig();
const app = createApp(config);

app.listen(config.PORT, () => {
  console.log(`[Backend] Server running on port ${config.PORT}`);
});
