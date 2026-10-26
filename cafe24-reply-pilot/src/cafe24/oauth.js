import crypto from 'node:crypto';

export const ACCESS_TOKEN_TTL_SEC = 2 * 3600; // 카페24 액세스 토큰 2시간
export const REFRESH_TOKEN_TTL_SEC = 14 * 24 * 3600; // 리프레시 토큰 2주

/** 운영: https://{mall_id}.cafe24api.com/api/v2, 로컬 데모: CAFE24_API_HOST/api/v2 */
export function apiBase(mallId, apiHost = '') {
  if (apiHost) return `${apiHost}/api/v2`;
  if (!/^[a-z0-9_-]+$/i.test(mallId)) throw new Error(`invalid mall_id: ${mallId}`);
  return `https://${mallId}.cafe24api.com/api/v2`;
}

export function buildAuthorizeUrl({ mallId, clientId, redirectUri, scopes, state, apiHost = '' }) {
  const url = new URL(`${apiBase(mallId, apiHost)}/oauth/authorize`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('state', state);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scopes.join(','));
  return url.toString();
}

function basicAuth(clientId, clientSecret) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
}

async function postToken({ mallId, clientId, clientSecret, form, apiHost, fetchImpl = fetch }) {
  const res = await fetchImpl(`${apiBase(mallId, apiHost)}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: basicAuth(clientId, clientSecret),
    },
    body: new URLSearchParams(form).toString(),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`oauth token request failed (${res.status}): ${data?.error_description || data?.error || text}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return normalizeTokenResponse(data);
}

/** 카페24 토큰 응답을 저장용 레코드로 정규화 (만료 시각은 서버 시계 기준으로 보수적으로 계산) */
export function normalizeTokenResponse(data, now = Date.now()) {
  if (!data?.access_token) throw new Error('oauth response has no access_token');
  const nowSec = Math.floor(now / 1000);
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || null,
    access_expires_at: nowSec + ACCESS_TOKEN_TTL_SEC,
    refresh_expires_at: nowSec + REFRESH_TOKEN_TTL_SEC,
    scopes: Array.isArray(data.scopes) ? data.scopes : [],
    mall_id: data.mall_id || null,
    user_id: data.user_id || null,
    raw_expires_at: data.expires_at || null,
    raw_refresh_expires_at: data.refresh_token_expires_at || null,
  };
}

export function exchangeCode({ mallId, clientId, clientSecret, code, redirectUri, apiHost, fetchImpl }) {
  return postToken({
    mallId,
    clientId,
    clientSecret,
    apiHost,
    fetchImpl,
    form: { grant_type: 'authorization_code', code, redirect_uri: redirectUri },
  });
}

export function refreshAccessToken({ mallId, clientId, clientSecret, refreshToken, apiHost, fetchImpl }) {
  return postToken({
    mallId,
    clientId,
    clientSecret,
    apiHost,
    fetchImpl,
    form: { grant_type: 'refresh_token', refresh_token: refreshToken },
  });
}

/** OAuth state: 서명된 {mall_id, shop_no, user_id, exp}. CSRF 방지 + 콜백에서 몰 식별 */
export function createState(payload, secret, ttlSec = 600) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSec, n: crypto.randomBytes(8).toString('hex') })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function parseState(state, secret, now = Date.now()) {
  if (typeof state !== 'string' || !state.includes('.')) return null;
  const [body, sig] = state.split('.');
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp * 1000 < now) return null;
    return payload;
  } catch {
    return null;
  }
}
