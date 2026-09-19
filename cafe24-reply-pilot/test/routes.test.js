import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Db } from '../src/db.js';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createMockProvider } from '../src/ai/mock.js';
import { hmacBase64, signLaunchParams } from '../src/cafe24/hmac.js';
import { mergeBoards } from '../src/web/routes.js';

const SECRET = 'route-secret';
let server;
let base;
let db;
const cafe24Calls = [];
const posted = [];

/** 카페24 API를 흉내내는 fetch: URL로 분기 */
async function fakeCafe24Fetch(url, init = {}) {
  cafe24Calls.push({ url, init });
  const u = new URL(url);
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  if (u.pathname.endsWith('/oauth/token')) return json({ access_token: 'at1', refresh_token: 'rt1', scopes: ['mall.read_community'], mall_id: 'demo', user_id: 'demo' });
  if (u.pathname.endsWith('/admin/store')) return json({ store: { shop_name: '데모 스토어' } });
  if (u.pathname.endsWith('/admin/boards')) return json({ boards: [{ board_no: 6, board_name: '상품 Q&A', reply_feature: 'T', use_board: 'T' }, { board_no: 4, board_name: '상품 사용후기', reply_feature: 'F', use_board: 'T' }, { board_no: 1, board_name: '공지사항', reply_feature: 'F', use_board: 'T' }] });
  if (/\/admin\/boards\/6\/articles$/.test(u.pathname) && init.method === 'GET') return json({ articles: [{ article_no: 501, title: '배송 언제 오나요', content: '언제 오나요', member_id: 'm_kim', product_no: 1001, reply_status: 'N', display: 'T', deleted: 'F', reply_depth: 0 }] });
  if (/\/admin\/boards\/4\/articles$/.test(u.pathname) && init.method === 'GET') return json({ articles: [] });
  if (/\/admin\/boards\/6\/articles$/.test(u.pathname) && init.method === 'POST') {
    posted.push(JSON.parse(init.body));
    return json({ articles: [{ article_no: 9001 }] });
  }
  if (/\/admin\/products\/1001$/.test(u.pathname)) return json({ product: { product_no: 1001, product_name: '셔츠', price: '39000' } });
  if (u.pathname.endsWith('/admin/orders')) return json({ orders: [{ order_id: 'o1', member_id: 'm_kim', order_date: '2026-09-15', paid: 'T', canceled: 'F', items: [{ product_name: '셔츠', quantity: 1, order_status: 'N30', shipping_company_name: 'CJ', shipping_code: '651' }] }] });
  return json({ error: { code: 404, message: `no route ${u.pathname}` } }, 404);
}

before(async () => {
  db = new Db(':memory:');
  const config = loadConfig({ CAFE24_CLIENT_ID: 'cid', CAFE24_CLIENT_SECRET: SECRET, SESSION_SECRET: 'sess', APP_BASE_URL: 'http://localhost:0', POLL_INTERVAL_SEC: '0' });
  const app = createApp({ config, db, provider: createMockProvider(), logger: { warn() {}, error() {}, info() {} }, fetchImpl: fakeCafe24Fetch });
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const jar = {};
function cookieHeader() {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
}
function storeCookies(res) {
  const set = res.headers.get('set-cookie');
  if (!set) return;
  const [pair] = set.split(';');
  const [k, v] = pair.split('=');
  jar[k] = v;
}
async function go(path, init = {}) {
  const res = await fetch(`${base}${path}`, { redirect: 'manual', ...init, headers: { cookie: cookieHeader(), ...(init.headers || {}) } });
  storeCookies(res);
  return res;
}
async function postForm(path, data) {
  return go(path, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data).toString() });
}
function csrfFrom(html) {
  return html.match(/name="_csrf" value="([^"]+)"/)[1];
}

test('세션 없이 앱 화면에 가면 401 안내', async () => {
  const res = await go('/dashboard');
  assert.equal(res.status, 401);
  assert.match(await res.text(), /관리자에서 앱을 실행/);
});

test('서명이 틀린 실행 요청은 403', async () => {
  const res = await go('/app/launch?mall_id=demo&timestamp=1&hmac=bad');
  assert.equal(res.status, 403);
});

test('최초 실행은 OAuth 인가 화면으로 보낸다', async () => {
  const qs = signLaunchParams({ mall_id: 'demo', shop_no: '1', user_id: 'demo', user_name: '데모', user_type: 'P', timestamp: String(Math.floor(Date.now() / 1000)), lang: 'ko_KR', nation: 'KR' }, SECRET);
  const res = await go(`/app/launch?${qs}`);
  assert.equal(res.status, 302);
  const loc = new URL(res.headers.get('location'));
  assert.equal(loc.host, 'demo.cafe24api.com');
  assert.equal(loc.searchParams.get('client_id'), 'cid');
  assert.ok(loc.searchParams.get('state'));
  jar.state = loc.searchParams.get('state');
});

test('OAuth 콜백은 토큰을 저장하고 설정을 미리 채운 뒤 세션을 만든다', async () => {
  const state = jar.state;
  delete jar.state;
  const res = await go(`/oauth/callback?code=abc&state=${encodeURIComponent(state)}`);
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/settings?welcome=1');
  assert.ok(jar.rp_session);
  const mall = db.getMall('demo');
  assert.equal(mall.access_token, 'at1');
  const s = db.getSettings('demo');
  assert.equal(s.store_name, '데모 스토어');
  assert.equal(s.boards.length, 3);
  assert.equal(s.boards.find((b) => b.board_no === 6).mode, 'reply');
  assert.equal(s.boards.find((b) => b.board_no === 4).mode, 'comment');
  assert.equal(s.boards.find((b) => b.board_no === 1).enabled, false);
});

test('잘못된 state는 400', async () => {
  const res = await go('/oauth/callback?code=abc&state=nope');
  assert.equal(res.status, 400);
});

test('설정 저장(CSRF 포함) 후 온보딩 완료', async () => {
  const page = await go('/settings');
  assert.equal(page.status, 200);
  const html = await page.text();
  const csrf = csrfFrom(html);
  const bad = await postForm('/settings', { _csrf: 'x', store_name: 'y' });
  assert.equal(bad.status, 403);
  const res = await postForm('/settings', { _csrf: csrf, store_name: '로로', writer_name: '로로 CS', tone: 'formal', policy_shipping: '당일 출고', board_enabled_6: 'on', board_mode_6: 'reply', board_mode_4: 'comment', order_lookup: 'on', auto_publish_enabled: 'on', auto_min_confidence: '0.9', auto_categories: 'shipping' });
  assert.equal(res.status, 302);
  const s = db.getSettings('demo');
  assert.equal(s.onboarded, true);
  assert.equal(s.tone, 'formal');
  assert.equal(s.boards.find((b) => b.board_no === 6).enabled, true);
  assert.equal(s.boards.find((b) => b.board_no === 4).enabled, false);
  assert.equal(s.auto_publish.enabled, false, '무료 플랜에서는 자동 게시가 꺼진 채 저장');
});

test('재실행 시 토큰이 있으면 바로 대시보드로', async () => {
  const qs = signLaunchParams({ mall_id: 'demo', shop_no: '1', user_id: 'demo', user_name: '데모', user_type: 'P', timestamp: String(Math.floor(Date.now() / 1000)) }, SECRET);
  const res = await go(`/app/launch?${qs}`);
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/dashboard');
  const dash = await go('/dashboard');
  assert.equal(dash.status, 200);
  assert.match(await dash.text(), /상품 Q&amp;A/);
});

test('동기화 → 초안 → 게시 흐름', async () => {
  const inbox0 = await go('/inbox');
  const csrf = csrfFrom(await inbox0.text());
  const sync = await postForm('/inbox/sync', { _csrf: csrf });
  assert.equal(sync.status, 302);
  assert.match(decodeURIComponent(sync.headers.get('location')), /초안 1건 생성/);
  const inbox = await go('/inbox');
  const html = await inbox.text();
  assert.match(html, /배송 언제 오나요/);
  assert.match(html, /651/);
  const id = html.match(/id="draft-(\d+)"/)[1];
  const pub = await postForm(`/drafts/${id}/publish`, { _csrf: csrf, reply_text: '안녕하세요. 배송중입니다.' });
  assert.equal(pub.status, 302);
  assert.match(decodeURIComponent(pub.headers.get('location')), /답변글로 게시/);
  assert.equal(posted.length, 1);
  assert.equal(posted[0].requests[0].reply_article_no, 501);
  assert.equal(posted[0].requests[0].writer, '로로 CS');
  assert.equal(db.getDraft(Number(id)).status, 'published');
  const done = await go('/inbox?status=published');
  assert.match(await done.text(), /게시 완료/);
});

test('웹훅: 서명 없으면 401, 서명 맞으면 200 후 비동기 동기화', async () => {
  const body = JSON.stringify({ event_no: 90033, resource: { mall_id: 'demo', event_shop_no: '1', board_no: 6, no: 777 } });
  const bad = await fetch(`${base}/webhooks/cafe24`, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
  assert.equal(bad.status, 401);
  const ok = await fetch(`${base}/webhooks/cafe24`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cafe24-hmac-sha256': hmacBase64(SECRET, body) }, body });
  assert.equal(ok.status, 200);
  await new Promise((r) => setTimeout(r, 100));
  assert.ok(db.listEvents('demo', 50).some((e) => e.type === 'webhook'));
});

test('앱 삭제 웹훅은 몰 데이터를 지운다', async () => {
  const body = JSON.stringify({ event_no: 90077, resource: { mall_id: 'demo' } });
  const res = await fetch(`${base}/webhooks/cafe24`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cafe24-hmac-sha256': hmacBase64(SECRET, body) }, body });
  assert.equal(res.status, 200);
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(db.getMall('demo'), null);
  const after = await go('/dashboard');
  assert.equal(after.status, 401);
});

test('mergeBoards는 기존 선택을 유지하고 새 게시판만 추정한다', () => {
  const merged = mergeBoards([{ board_no: 6, board_name: 'Q', enabled: false, mode: 'comment' }], [{ board_no: 6, board_name: '상품 Q&A', reply_feature: 'T' }, { board_no: 9, board_name: '1:1 문의', reply_feature: 'T' }, { board_no: 2, board_name: '자료실', use_board: 'F' }]);
  assert.deepEqual(merged, [
    { board_no: 6, board_name: '상품 Q&A', enabled: false, mode: 'comment' },
    { board_no: 9, board_name: '1:1 문의', enabled: true, mode: 'reply' },
  ]);
});
