import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hmacBase64, signLaunchParams, stripHmacParam, verifyLaunchRequest, verifyWebhookSignature } from '../src/cafe24/hmac.js';

const SECRET = 'test-client-secret';
const nowSec = () => Math.floor(Date.now() / 1000);

function launchParams(extra = {}) {
  return { is_multi_shop: 'F', lang: 'ko_KR', mall_id: 'demo', nation: 'KR', shop_no: '1', timestamp: String(nowSec()), user_id: 'demo', user_name: '데모 운영자', user_type: 'P', ...extra };
}

test('정상 서명된 실행 요청을 통과시킨다', () => {
  const qs = signLaunchParams(launchParams(), SECRET);
  const r = verifyLaunchRequest(qs, SECRET);
  assert.equal(r.ok, true);
  assert.equal(r.params.mall_id, 'demo');
  assert.equal(r.params.user_name, '데모 운영자');
});

test('hmac 파라미터 위치와 무관하게 원문에서 제거한다', () => {
  assert.equal(stripHmacParam('a=1&hmac=xyz&b=2'), 'a=1&b=2');
  assert.equal(stripHmacParam('?hmac=xyz&a=1'), 'a=1');
});

test('파라미터가 변조되면 거부한다', () => {
  const qs = signLaunchParams(launchParams(), SECRET).replace('mall_id=demo', 'mall_id=other');
  assert.equal(verifyLaunchRequest(qs, SECRET).ok, false);
  assert.equal(verifyLaunchRequest(qs, SECRET).reason, 'hmac_mismatch');
});

test('다른 시크릿으로 서명하면 거부한다', () => {
  const qs = signLaunchParams(launchParams(), 'wrong');
  assert.equal(verifyLaunchRequest(qs, SECRET).ok, false);
});

test('timestamp가 허용 오차를 벗어나면 거부한다', () => {
  const qs = signLaunchParams(launchParams({ timestamp: String(nowSec() - 3 * 3600) }), SECRET);
  const r = verifyLaunchRequest(qs, SECRET, { maxSkewSec: 7200 });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'timestamp_expired');
});

test('키 정렬 정규형으로 서명된 경우도 허용한다', () => {
  const p = launchParams();
  const sorted = new URLSearchParams(p);
  sorted.sort();
  const hmac = hmacBase64(SECRET, sorted.toString());
  // 원문은 정렬되지 않은 순서로 전달
  const unsorted = new URLSearchParams({ user_type: p.user_type, mall_id: p.mall_id, timestamp: p.timestamp, shop_no: p.shop_no, user_id: p.user_id, lang: p.lang, nation: p.nation, is_multi_shop: p.is_multi_shop, user_name: p.user_name });
  const qs = `${unsorted.toString()}&hmac=${encodeURIComponent(hmac)}`;
  assert.equal(verifyLaunchRequest(qs, SECRET).ok, true);
});

test('필수 파라미터가 없으면 거부한다', () => {
  assert.equal(verifyLaunchRequest('mall_id=demo', SECRET).reason, 'missing_params');
  assert.equal(verifyLaunchRequest('mall_id=demo&timestamp=1&hmac=x', '').reason, 'client_secret_missing');
});

test('웹훅 서명을 검증한다', () => {
  const body = JSON.stringify({ event_no: 90033, resource: { mall_id: 'demo', board_no: 6, no: 501 } });
  const sig = hmacBase64(SECRET, body);
  assert.equal(verifyWebhookSignature(Buffer.from(body), sig, SECRET), true);
  assert.equal(verifyWebhookSignature(Buffer.from(body + ' '), sig, SECRET), false);
  assert.equal(verifyWebhookSignature(Buffer.from(body), '', SECRET), false);
});
