import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiBase, buildAuthorizeUrl, createState, exchangeCode, normalizeTokenResponse, parseState, refreshAccessToken } from '../src/cafe24/oauth.js';

test('apiBase는 운영/로컬 호스트를 구분한다', () => {
  assert.equal(apiBase('demo'), 'https://demo.cafe24api.com/api/v2');
  assert.equal(apiBase('demo', 'http://localhost:4000'), 'http://localhost:4000/api/v2');
  assert.throws(() => apiBase('bad/mall'), /invalid mall_id/);
});

test('인가 URL에 필수 파라미터를 넣는다', () => {
  const url = new URL(buildAuthorizeUrl({ mallId: 'demo', clientId: 'cid', redirectUri: 'https://app.example/oauth/callback', scopes: ['mall.read_product', 'mall.write_community'], state: 's1' }));
  assert.equal(url.origin + url.pathname, 'https://demo.cafe24api.com/api/v2/oauth/authorize');
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.get('client_id'), 'cid');
  assert.equal(url.searchParams.get('scope'), 'mall.read_product,mall.write_community');
  assert.equal(url.searchParams.get('state'), 's1');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://app.example/oauth/callback');
});

test('토큰 응답을 정규화하고 만료 시각을 서버 시계로 계산한다', () => {
  const t = normalizeTokenResponse({ access_token: 'a', refresh_token: 'r', scopes: ['x'], mall_id: 'demo' }, 1_000_000_000_000);
  assert.equal(t.access_expires_at, 1_000_000_000 + 7200);
  assert.equal(t.refresh_expires_at, 1_000_000_000 + 14 * 86400);
  assert.deepEqual(t.scopes, ['x']);
  assert.throws(() => normalizeTokenResponse({}), /access_token/);
});

test('code 교환 요청은 Basic 인증과 form 본문을 쓴다', async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = { url, init };
    return new Response(JSON.stringify({ access_token: 'at', refresh_token: 'rt', scopes: [] }), { status: 200 });
  };
  const t = await exchangeCode({ mallId: 'demo', clientId: 'cid', clientSecret: 'sec', code: 'c1', redirectUri: 'https://app/cb', fetchImpl });
  assert.equal(t.access_token, 'at');
  assert.equal(captured.url, 'https://demo.cafe24api.com/api/v2/oauth/token');
  assert.equal(captured.init.headers.Authorization, `Basic ${Buffer.from('cid:sec').toString('base64')}`);
  const form = new URLSearchParams(captured.init.body);
  assert.equal(form.get('grant_type'), 'authorization_code');
  assert.equal(form.get('code'), 'c1');
  assert.equal(form.get('redirect_uri'), 'https://app/cb');
});

test('리프레시 실패 시 상태 코드를 담은 오류를 던진다', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ error: 'invalid_grant', error_description: 'expired' }), { status: 401 });
  await assert.rejects(refreshAccessToken({ mallId: 'demo', clientId: 'c', clientSecret: 's', refreshToken: 'r', fetchImpl }), (e) => e.status === 401 && /expired/.test(e.message));
});

test('state는 서명·만료 검증을 통과해야 복원된다', () => {
  const s = createState({ mall_id: 'demo', shop_no: 1 }, 'secret', 60);
  const p = parseState(s, 'secret');
  assert.equal(p.mall_id, 'demo');
  assert.equal(parseState(s, 'other'), null);
  assert.equal(parseState(`${s}x`, 'secret'), null);
  const expired = createState({ mall_id: 'demo' }, 'secret', -10);
  assert.equal(parseState(expired, 'secret'), null);
});
