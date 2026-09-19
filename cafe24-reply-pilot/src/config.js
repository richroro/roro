/**
 * 환경 변수 → 설정 객체. 테스트에서 env를 주입할 수 있도록 함수로 노출한다.
 */
export const DEFAULT_SCOPES = [
  'mall.read_community',
  'mall.write_community',
  'mall.read_product',
  'mall.read_order',
  'mall.read_store',
];

export function loadConfig(env = process.env) {
  const port = Number(env.PORT || 3000);
  const baseUrl = (env.APP_BASE_URL || `http://localhost:${port}`).replace(/\/$/, '');
  const clientSecret = env.CAFE24_CLIENT_SECRET || '';
  const aiProvider = env.AI_PROVIDER || (env.ANTHROPIC_API_KEY ? 'claude' : 'mock');

  return {
    port,
    baseUrl,
    isHttps: baseUrl.startsWith('https://'),
    cafe24: {
      clientId: env.CAFE24_CLIENT_ID || '',
      clientSecret,
      scopes: (env.CAFE24_SCOPES || DEFAULT_SCOPES.join(','))
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      apiVersion: env.CAFE24_API_VERSION || '',
      apiHost: (env.CAFE24_API_HOST || '').replace(/\/$/, ''),
      launchMaxSkewSec: Number(env.CAFE24_LAUNCH_MAX_SKEW_SEC || 7200),
    },
    ai: {
      provider: aiProvider,
      apiKey: env.ANTHROPIC_API_KEY || '',
      model: env.AI_MODEL || 'claude-opus-5',
      effort: env.AI_EFFORT || 'medium',
      fallbacks: (env.AI_FALLBACKS || 'default') !== 'off',
    },
    session: {
      secret: env.SESSION_SECRET || clientSecret || 'dev-only-insecure-secret',
      ttlSec: Number(env.SESSION_TTL_SEC || 12 * 3600),
    },
    db: { path: env.DB_PATH || './data/reply-pilot.db' },
    poll: {
      intervalSec: Number(env.POLL_INTERVAL_SEC ?? 300),
      maxDraftsPerSync: Number(env.MAX_DRAFTS_PER_SYNC || 20),
    },
    webhook: { requireSignature: env.WEBHOOK_REQUIRE_SIGNATURE !== 'false' },
  };
}
