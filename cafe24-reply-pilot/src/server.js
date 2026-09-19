import { loadConfig } from './config.js';
import { openDb } from './db.js';
import { createProvider } from './ai/provider.js';
import { createApp } from './app.js';
import { startScheduler } from './scheduler.js';

const config = loadConfig();
const logger = console;

if (!config.cafe24.clientId || !config.cafe24.clientSecret) {
  logger.warn('[boot] CAFE24_CLIENT_ID / CAFE24_CLIENT_SECRET 가 비어 있습니다. 앱 실행 URL 검증과 OAuth가 동작하지 않습니다.');
}

const db = openDb(config.db.path);
const provider = createProvider(config.ai);
const app = createApp({ config, db, provider, logger });

const server = app.listen(config.port, () => {
  logger.info(`[boot] reply-pilot listening on ${config.baseUrl} (port ${config.port})`);
  logger.info(`[boot] AI provider: ${provider.name} (${provider.model}) | cafe24 host: ${config.cafe24.apiHost || 'https://{mall_id}.cafe24api.com'}`);
});

const scheduler = startScheduler({ db, config, provider, logger });

function shutdown() {
  scheduler.stop();
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
