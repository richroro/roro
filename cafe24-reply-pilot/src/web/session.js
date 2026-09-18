import crypto from 'node:crypto';

const COOKIE = 'rp_session';

function sign(secret, body) {
  return crypto.createHmac('sha256', secret).update(body).digest('base64url');
}

export function encodeSession(payload, secret, ttlSec) {
  const data = { ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + ttlSec };
  const body = Buffer.from(JSON.stringify(data)).toString('base64url');
  return `${body}.${sign(secret, body)}`;
}

export function decodeSession(value, secret, now = Date.now()) {
  if (typeof value !== 'string' || !value.includes('.')) return null;
  const [body, sig] = value.split('.');
  const expected = sign(secret, body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!data.exp || data.exp * 1000 < now) return null;
    return data;
  } catch {
    return null;
  }
}

export function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

/** 세션 쿠키 → req.session, 그리고 res.setSession / res.clearSession 헬퍼 */
export function sessionMiddleware(config) {
  const { secret, ttlSec } = config.session;
  // 카페24 관리자에서 새 창/iframe으로 열릴 수 있으므로 https에서는 SameSite=None
  const attrs = config.isHttps ? 'Path=/; HttpOnly; Secure; SameSite=None' : 'Path=/; HttpOnly; SameSite=Lax';
  return (req, res, next) => {
    const cookies = parseCookies(req.headers.cookie || '');
    req.session = decodeSession(cookies[COOKIE], secret);
    res.setSession = (payload) => {
      res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(encodeSession(payload, secret, ttlSec))}; ${attrs}; Max-Age=${ttlSec}`);
    };
    res.clearSession = () => {
      res.setHeader('Set-Cookie', `${COOKIE}=; ${attrs}; Max-Age=0`);
    };
    next();
  };
}

/** 폼 CSRF 토큰: 세션 발급 시각에 묶인 HMAC */
export function csrfToken(session, secret) {
  if (!session) return '';
  return sign(secret, `csrf:${session.mall_id}:${session.iat}`);
}

export function verifyCsrf(session, secret, token) {
  if (!session || typeof token !== 'string') return false;
  const expected = csrfToken(session, secret);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
