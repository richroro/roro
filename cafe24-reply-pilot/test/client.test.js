import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Cafe24ApiError, Cafe24Client } from '../src/cafe24/client.js';

const nowSec = () => Math.floor(Date.now() / 1000);

function makeClient(handler, extra = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return handler(url, init, calls.length);
  };
  const client = new Cafe24Client({
    mallId: 'demo',
    tokens: { access_token: 'at', refresh_token: 'rt', access_expires_at: nowSec() + 3600 },
    clientId: 'cid',
    clientSecret: 'sec',
    apiVersion: '2025-06-01',
    fetchImpl,
    sleep: async () => {},
    logger: { warn() {}, error() {} },
    ...extra,
  });
  return { client, calls };
}

test('GET 요청에 Bearer·버전 헤더와 쿼리를 붙인다', async () => {
  const { client, calls } = makeClient(() => new Response(JSON.stringify({ boards: [{ board_no: 6 }] }), { status: 200 }));
  const boards = await client.listBoards(2);
  assert.deepEqual(boards, [{ board_no: 6 }]);
  assert.equal(calls[0].url, 'https://demo.cafe24api.com/api/v2/admin/boards?shop_no=2');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer at');
  assert.equal(calls[0].init.headers['X-Cafe24-Api-Version'], '2025-06-01');
});

test('배열 쿼리는 콤마로, 빈 값은 생략한다', () => {
  const { client } = makeClient(() => new Response('{}'));
  assert.equal(client.buildUrl('/admin/orders', { embed: ['items', 'buyer'], member_id: '', limit: 5 }), 'https://demo.cafe24api.com/api/v2/admin/orders?embed=items%2Cbuyer&limit=5');
});

test('401이면 토큰을 갱신하고 한 번 재시도한다', async () => {
  const saved = [];
  const { client, calls } = makeClient(
    (url, init, n) => {
      if (url.endsWith('/oauth/token')) return new Response(JSON.stringify({ access_token: 'new-at', refresh_token: 'new-rt' }), { status: 200 });
      if (init.headers.Authorization === 'Bearer at') return new Response(JSON.stringify({ error: { code: 401, message: 'expired' } }), { status: 401 });
      return new Response(JSON.stringify({ product: { product_no: 1 } }), { status: 200 });
    },
    { onTokens: (t) => saved.push(t) },
  );
  const p = await client.getProduct(1);
  assert.equal(p.product_no, 1);
  assert.equal(saved[0].access_token, 'new-at');
  assert.equal(calls.filter((c) => c.url.endsWith('/oauth/token')).length, 1);
  assert.equal(calls.at(-1).init.headers.Authorization, 'Bearer new-at');
});

test('만료 임박 토큰은 요청 전에 미리 갱신한다', async () => {
  const { client, calls } = makeClient((url) => {
    if (url.endsWith('/oauth/token')) return new Response(JSON.stringify({ access_token: 'fresh', refresh_token: 'rt2' }), { status: 200 });
    return new Response(JSON.stringify({ store: { shop_name: 'S' } }), { status: 200 });
  });
  client.tokens.access_expires_at = nowSec() + 60; // 5분 미만
  await client.getStore();
  assert.equal(calls[0].url.endsWith('/oauth/token'), true);
  assert.equal(calls[1].init.headers.Authorization, 'Bearer fresh');
});

test('429는 Retry-After만큼 기다렸다가 재시도한다', async () => {
  const waits = [];
  const { client, calls } = makeClient(
    (url, init, n) => (n === 1 ? new Response('{"error":{"message":"limit"}}', { status: 429, headers: { 'retry-after': '2' } }) : new Response('{"orders":[]}', { status: 200 })),
    { sleep: async (ms) => waits.push(ms) },
  );
  const orders = await client.listOrders({ member_id: 'm' });
  assert.deepEqual(orders, []);
  assert.deepEqual(waits, [2000]);
  assert.equal(calls.length, 2);
});

test('재시도 후에도 실패하면 Cafe24ApiError를 던진다', async () => {
  const { client } = makeClient(() => new Response(JSON.stringify({ error: { code: 422, message: 'writer is required' } }), { status: 422 }));
  await assert.rejects(client.createComment(4, 301, { content: 'x' }), (e) => e instanceof Cafe24ApiError && e.status === 422 && /writer is required/.test(e.message));
});

test('POST 본문은 shop_no와 request/requests로 감싼다', async () => {
  const { client, calls } = makeClient(() => new Response(JSON.stringify({ articles: [{ article_no: 9001 }] }), { status: 200 }));
  await client.createArticles(6, [{ title: 't' }], 1);
  assert.deepEqual(JSON.parse(calls[0].init.body), { shop_no: 1, requests: [{ title: 't' }] });
  assert.equal(calls[0].init.headers['Content-Type'], 'application/json');
});
