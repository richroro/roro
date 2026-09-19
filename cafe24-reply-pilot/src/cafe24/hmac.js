import crypto from 'node:crypto';

/** base64(HMAC-SHA256(message, secret)) — 카페24 앱 실행 URL·웹훅 서명 방식 */
export function hmacBase64(secret, message) {
  return crypto.createHmac('sha256', secret).update(message, 'utf8').digest('base64');
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/**
 * 원본 쿼리스트링에서 hmac 파라미터만 제거한 문자열(원래 순서·인코딩 유지).
 * 카페24는 "hmac을 제외한 나머지 쿼리스트링"을 client_secret으로 서명한다.
 */
export function stripHmacParam(rawQuery) {
  return rawQuery
    .replace(/^\?/, '')
    .split('&')
    .filter((pair) => pair !== '' && !pair.startsWith('hmac='))
    .join('&');
}

/** 키 정렬 후 재인코딩한 정규형 (일부 구현체가 이 방식을 쓰므로 보조 후보로 검사) */
export function sortedQuery(rawQuery) {
  const params = new URLSearchParams(rawQuery.replace(/^\?/, ''));
  params.delete('hmac');
  params.sort();
  return params.toString();
}

/**
 * 앱 실행 요청(카페24 관리자 → 앱 URL) 검증.
 * @param {string} rawQuery  req.url의 '?' 뒤 문자열
 * @returns {{ok: boolean, reason?: string, params?: Record<string,string>}}
 */
export function verifyLaunchRequest(rawQuery, clientSecret, { maxSkewSec = 7200, now = Date.now() } = {}) {
  if (!clientSecret) return { ok: false, reason: 'client_secret_missing' };
  const params = Object.fromEntries(new URLSearchParams(rawQuery.replace(/^\?/, '')));
  const { hmac, timestamp, mall_id: mallId } = params;
  if (!hmac || !timestamp || !mallId) return { ok: false, reason: 'missing_params', params };

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: 'bad_timestamp', params };
  const skew = Math.abs(now / 1000 - ts);
  if (skew > maxSkewSec) return { ok: false, reason: 'timestamp_expired', params };

  const candidates = [stripHmacParam(rawQuery), sortedQuery(rawQuery)];
  const matched = candidates.some((msg) => safeEqual(hmacBase64(clientSecret, msg), hmac));
  if (!matched) return { ok: false, reason: 'hmac_mismatch', params };
  return { ok: true, params };
}

/**
 * 웹훅 서명 검증: X-Cafe24-Hmac-Sha256 = base64(HMAC-SHA256(raw body, client_secret))
 */
export function verifyWebhookSignature(rawBody, signature, clientSecret) {
  if (!signature || !clientSecret) return false;
  const body = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
  return safeEqual(hmacBase64(clientSecret, body), signature);
}

/** 테스트/데모용: 파라미터 객체로 서명된 앱 실행 쿼리스트링 생성 */
export function signLaunchParams(params, clientSecret) {
  const qs = new URLSearchParams(params).toString();
  return `${qs}&hmac=${encodeURIComponent(hmacBase64(clientSecret, qs))}`;
}
