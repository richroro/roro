import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Db, DEFAULT_SETTINGS } from '../src/db.js';
import { createMockProvider } from '../src/ai/mock.js';
import { loadConfig } from '../src/config.js';
import { isAnswerable, syncMall, unansweredQuery, publishOne } from '../src/services/inbox.js';
import { buildCommentRequest, buildReplyArticleRequest, textToHtml } from '../src/services/publisher.js';
import { shouldAutoPublish } from '../src/services/drafter.js';
import { trimProduct } from '../src/services/context.js';
import { summarizeOrders, orderStatusText } from '../src/cafe24/status.js';

const config = loadConfig({ CAFE24_CLIENT_ID: 'c', CAFE24_CLIENT_SECRET: 's', MAX_DRAFTS_PER_SYNC: '10', POLL_INTERVAL_SEC: '0' });

function fakeClient() {
  const posted = [];
  return {
    posted,
    async listArticles(boardNo, query) {
      if (boardNo === 6) {
        assert.equal(query.reply_status, 'N');
        return [
          { article_no: 501, board_no: 6, title: '배송 언제 오나요?', content: '언제 오나요', member_id: 'm_kim', product_no: 1001, reply_status: 'N', display: 'T', deleted: 'F', notice: 'F', reply_depth: 0, secret: 'T' },
          { article_no: 502, board_no: 6, title: '공지', content: '', notice: 'T', reply_status: 'N', display: 'T', deleted: 'F' },
          { article_no: 503, board_no: 6, title: '답변글', content: '', reply_depth: 1, reply_status: 'N', display: 'T', deleted: 'F' },
        ];
      }
      if (boardNo === 4) {
        assert.equal(query.comment, 'F');
        return [{ article_no: 301, board_no: 4, title: '만족해요', content: '좋아요', member_id: 'm_choi', product_no: 1001, rating: 5, display: 'T', deleted: 'F', notice: 'F', reply_depth: 0 }];
      }
      return [];
    },
    async getProduct(no) {
      return { product_no: no, product_name: '셔츠', price: '39000', selling: 'T', description: '<p>코튼</p>', options: { options: [{ option_name: '사이즈', option_value: [{ option_text: 'M' }] }] } };
    },
    async listOrders(q) {
      assert.equal(q.embed, 'items');
      return [
        { order_id: 'o1', member_id: q.member_id, order_date: '2026-09-15T10:00', paid: 'T', canceled: 'F', items: [{ product_no: 1001, product_name: '셔츠', option_value: 'M', quantity: 1, order_status: 'N30', shipping_company_name: 'CJ', shipping_code: '651' }] },
        { order_id: 'o2', member_id: 'someone_else', order_date: '2026-09-15', paid: 'T', canceled: 'F', items: [] },
      ];
    },
    async createArticles(boardNo, requests, shopNo) {
      posted.push({ type: 'article', boardNo, requests, shopNo });
      return [{ article_no: 9001 }];
    },
    async createComment(boardNo, articleNo, request, shopNo) {
      posted.push({ type: 'comment', boardNo, articleNo, request, shopNo });
      return { comment_no: 77 };
    },
  };
}

function setup() {
  const db = new Db(':memory:');
  const mall = db.upsertMall({ mall_id: 'demo', shop_no: 1, tokens: { access_token: 'a', refresh_token: 'r', access_expires_at: 9e9, refresh_expires_at: 9e9, scopes: [] } });
  const settings = db.saveSettings('demo', {
    ...DEFAULT_SETTINGS,
    store_name: '로로',
    onboarded: true,
    boards: [
      { board_no: 6, board_name: '상품 Q&A', enabled: true, mode: 'reply' },
      { board_no: 4, board_name: '후기', enabled: true, mode: 'comment' },
      { board_no: 9, board_name: '1:1', enabled: false, mode: 'reply' },
    ],
    policies: { ...DEFAULT_SETTINGS.policies, shipping: '당일 출고' },
  });
  return { db, mall, settings, client: fakeClient(), provider: createMockProvider(), logger: { warn() {}, error() {}, info() {} } };
}

test('isAnswerable는 공지·답변글·삭제·비노출 글을 제외한다', () => {
  assert.equal(isAnswerable({ article_no: 1, display: 'T', deleted: 'F' }), true);
  assert.equal(isAnswerable({ notice: 'T' }), false);
  assert.equal(isAnswerable({ reply_depth: 1 }), false);
  assert.equal(isAnswerable({ deleted: 'T' }), false);
  assert.equal(isAnswerable({ display: 'F' }), false);
  assert.equal(isAnswerable({ reply: 'T', reply_status: 'C' }), false);
});

test('unansweredQuery는 게시판 방식에 맞는 필터를 만든다', () => {
  assert.deepEqual(unansweredQuery({ mode: 'reply' }, 1, 50), { shop_no: 1, limit: 50, is_display: 'T', reply_status: 'N' });
  assert.deepEqual(unansweredQuery({ mode: 'comment' }, 2, 10), { shop_no: 2, limit: 10, is_display: 'T', comment: 'F' });
});

test('syncMall은 미답변 글을 대기열에 넣고 초안을 만들며 다른 회원 주문은 제외한다', async () => {
  const s = setup();
  const stats = await syncMall({ ...s, config });
  assert.equal(stats.found, 2);
  assert.equal(stats.created, 2);
  assert.equal(stats.generated, 2);
  assert.deepEqual(stats.errors, []);
  const rows = s.db.listDrafts('demo', { status: 'pending' });
  const shipping = rows.find((r) => r.article_no === 501);
  assert.equal(shipping.draft.category, 'shipping');
  assert.equal(shipping.context.orders.length, 1);
  assert.equal(shipping.context.orders[0].order_id, 'o1');
  assert.equal(shipping.context.product.product_name, '셔츠');
  assert.match(shipping.reply_text, /651/);
  const review = rows.find((r) => r.article_no === 301);
  assert.equal(review.draft.category, 'review_thanks');

  // 두 번째 동기화는 중복 생성하지 않는다
  const again = await syncMall({ ...s, config });
  assert.equal(again.created, 0);
  assert.equal(again.generated, 0);
});

test('syncMall은 maxGenerate(플랜 한도)를 지킨다', async () => {
  const s = setup();
  const stats = await syncMall({ ...s, config, maxGenerate: 1 });
  assert.equal(stats.created, 2);
  assert.equal(stats.generated, 1);
  const zero = await syncMall({ ...s, config, maxGenerate: 0 });
  assert.equal(zero.generated, 0);
  assert.match(zero.errors[0], /한도/);
});

test('자동 게시 조건을 만족하면 승인 없이 게시한다', async () => {
  const s = setup();
  s.settings.auto_publish = { enabled: true, min_confidence: 0.9, categories: ['shipping'] };
  s.db.saveSettings('demo', s.settings);
  const stats = await syncMall({ ...s, config });
  assert.equal(stats.published, 1);
  assert.equal(s.client.posted.length, 1);
  assert.equal(s.client.posted[0].type, 'article');
  assert.equal(s.client.posted[0].requests[0].reply_article_no, 501);
  const row = s.db.getDraftByArticle('demo', 1, 6, 501);
  assert.equal(row.status, 'published');
  assert.equal(row.published_ref, 'article:9001');
});

test('shouldAutoPublish', () => {
  const on = { auto_publish: { enabled: true, min_confidence: 0.9, categories: ['shipping'] } };
  assert.equal(shouldAutoPublish({ category: 'shipping', confidence: 0.95, needs_human: false, reply: 'x' }, on), true);
  assert.equal(shouldAutoPublish({ category: 'shipping', confidence: 0.95, needs_human: true, reply: 'x' }, on), false);
  assert.equal(shouldAutoPublish({ category: 'stock', confidence: 0.95, needs_human: false, reply: 'x' }, on), false);
  assert.equal(shouldAutoPublish({ category: 'shipping', confidence: 0.5, needs_human: false, reply: 'x' }, on), false);
  assert.equal(shouldAutoPublish({ category: 'shipping', confidence: 0.99, needs_human: false, reply: 'x' }, { auto_publish: { enabled: false } }), false);
});

test('publishOne은 게시판 방식에 따라 답변글/댓글을 만들고 상태를 기록한다', async () => {
  const s = setup();
  await syncMall({ ...s, config });
  const qna = s.db.getDraftByArticle('demo', 1, 6, 501);
  const r1 = await publishOne({ db: s.db, client: s.client, settings: s.settings, row: qna, replyText: '수정한 답변\n\n둘째 줄', clientIp: '1.2.3.4' });
  assert.equal(r1.mode, 'reply');
  const req = s.client.posted[0].requests[0];
  assert.equal(req.title, '[답변] 배송 언제 오나요?');
  assert.equal(req.content, '<p>수정한 답변</p><p>둘째 줄</p>');
  assert.equal(req.secret, 'T');
  assert.equal(req.client_ip, '1.2.3.4');
  assert.equal(s.db.getDraft(qna.id).status, 'published');

  const review = s.db.getDraftByArticle('demo', 1, 4, 301);
  const r2 = await publishOne({ db: s.db, client: s.client, settings: s.settings, row: review });
  assert.equal(r2.mode, 'comment');
  assert.equal(r2.ref, 'comment:77');
  assert.equal(s.client.posted[1].request.writer, '운영자');
  assert.ok(s.client.posted[1].request.password.length >= 8);
});

test('publishOne 실패 시 failed 상태와 오류를 남긴다', async () => {
  const s = setup();
  await syncMall({ ...s, config });
  const row = s.db.getDraftByArticle('demo', 1, 6, 501);
  s.client.createArticles = async () => {
    throw new Error('boom');
  };
  await assert.rejects(publishOne({ db: s.db, client: s.client, settings: s.settings, row, replyText: 'x' }), /boom/);
  const after = s.db.getDraft(row.id);
  assert.equal(after.status, 'failed');
  assert.equal(after.error, 'boom');
});

test('요청 빌더와 HTML 변환', () => {
  assert.equal(textToHtml('a <b>\nc'), '<p>a &lt;b&gt;<br>c</p>');
  const req = buildReplyArticleRequest({ article: { article_no: 1, title: 't', product_no: 5, secret: 'F' }, replyText: 'hi', settings: { writer_name: 'W', reply_title_prefix: 'Re:' } });
  assert.equal(req.writer, 'W');
  assert.equal(req.title, 'Re: t');
  assert.equal(req.product_no, 5);
  assert.equal(req.reply, 'T');
  const c = buildCommentRequest({ article: { secret: 'T' }, replyText: 'hi', settings: {} });
  assert.equal(c.secret, 'T');
  assert.equal(c.writer, '운영자');
});

test('trimProduct/summarizeOrders/orderStatusText', () => {
  const p = trimProduct({ product_no: 1, product_name: 'n', price: '1', selling: 'T', use_inventory: 'T', stock_quantity: 0, description: '<b>d</b>', options: { options: [{ option_name: '색', option_value: [{ option_text: '빨강' }] }] } });
  assert.equal(p.sold_out, true);
  assert.deepEqual(p.options, ['색: 빨강']);
  assert.equal(p.description_text, 'd');
  assert.equal(orderStatusText('N30'), '배송중');
  assert.equal(orderStatusText('C99'), '취소 처리중');
  assert.equal(orderStatusText(undefined), '처리중');
  const s = summarizeOrders([{ order_id: 'a', member_id: 'x', order_date: '2026-09-01T00:00', paid: 'T', items: [{ order_status: 'N40' }] }, { order_id: 'b', member_id: 'y', items: [] }], { memberId: 'x' });
  assert.equal(s.length, 1);
  assert.equal(s[0].items[0].status, '배송 완료');
});

test('Db: 토큰·설정·이벤트·월간 사용량', () => {
  const db = new Db(':memory:');
  db.upsertMall({ mall_id: 'm', shop_no: 1, user_id: 'u', tokens: { access_token: 'a', refresh_token: 'r', access_expires_at: 1, refresh_expires_at: 2, scopes: ['s'] } });
  db.upsertMall({ mall_id: 'm', shop_no: 1, user_id: null }); // 토큰 없는 재실행은 기존 토큰을 보존
  const m = db.getMall('m');
  assert.equal(m.access_token, 'a');
  assert.equal(m.user_id, 'u');
  assert.deepEqual(m.scopes, ['s']);
  db.updateTokens('m', { access_token: 'b', refresh_token: null, access_expires_at: 3, refresh_expires_at: 4, scopes: [] });
  assert.equal(db.getMall('m').refresh_token, 'r');
  const s = db.getSettings('m');
  assert.equal(s.tone, 'friendly');
  db.saveSettings('m', { ...s, tone: 'formal', policies: { shipping: 'x' } });
  assert.equal(db.getSettings('m').policies.shipping, 'x');
  assert.equal(db.getSettings('m').policies.faq, '');
  db.logEvent('m', 'draft_generated', { id: 1 });
  db.logEvent('m', 'draft_generated', { id: 2 });
  assert.equal(db.countGeneratedThisMonth('m'), 2);
  assert.deepEqual(db.countDrafts('m'), { pending: 0, published: 0, skipped: 0, failed: 0 });
  db.deleteMall('m');
  assert.equal(db.getMall('m'), null);
});
