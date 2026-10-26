/**
 * 로컬 데모용 가짜 카페24 서버.
 * 실제 카페24 Admin API의 응답 형태(boards/articles/comments/products/orders/oauth/appstore)를 흉내 낸다.
 * 사용: node scripts/mock-cafe24.js  (기본 포트 4000) → 앱의 CAFE24_API_HOST=http://localhost:4000
 */
import express from 'express';

const port = Number(process.env.MOCK_PORT || 4000);
const app = express();
app.use(express.json());

const state = {
  boards: [
    { shop_no: 1, board_no: 4, board_name: '상품 사용후기', board_type: 5, reply_feature: 'F', use_comment: 'T', use_board: 'T' },
    { shop_no: 1, board_no: 6, board_name: '상품 Q&A', board_type: 5, reply_feature: 'T', use_comment: 'F', use_board: 'T' },
    { shop_no: 1, board_no: 9, board_name: '1:1 맞춤상담', board_type: 4, reply_feature: 'T', use_comment: 'F', use_board: 'T' },
  ],
  products: {
    1001: {
      product_no: 1001, product_name: '오버핏 코튼 셔츠 (아이보리)', price: '39000', selling: 'T', display: 'T', use_inventory: 'T', stock_quantity: 12,
      summary_description: '20수 코튼 100%, 넉넉한 오버핏', simple_description: '데일리로 입기 좋은 셔츠',
      description: '<p>소재: 코튼 100% (20수)</p><p>세탁: 찬물 단독 세탁, 건조기 사용 금지</p><p>모델 착용: 175cm/65kg L 사이즈</p><p>사이즈(cm) S 어깨 48 가슴 56 총장 72 / M 어깨 50 가슴 58 총장 74 / L 어깨 52 가슴 60 총장 76</p>',
      shipping_info: '오후 2시 이전 결제 시 당일 출고', exchange_info: '수령 후 7일 이내 교환 가능(미착용, 택 미제거)',
      options: { options: [{ option_name: '사이즈', option_value: [{ option_text: 'S' }, { option_text: 'M' }, { option_text: 'L' }] }] },
    },
    1002: {
      product_no: 1002, product_name: '무선 블루투스 이어폰 X2', price: '89000', selling: 'T', display: 'T', use_inventory: 'T', stock_quantity: 0, sold_out: 'T',
      summary_description: '노이즈 캔슬링, 30시간 재생', simple_description: '',
      description: '<p>블루투스 5.3, IPX4 생활방수</p><p>충전 케이스 포함 최대 30시간</p><p>iOS/Android 호환</p>',
      shipping_info: '', exchange_info: '',
    },
  },
  articles: {
    6: [
      { shop_no: 1, board_no: 6, article_no: 501, parent_article_no: 501, product_no: 1001, member_id: 'm_kim', writer: '김민지', title: '배송 언제 오나요?', content: '<p>3일 전에 주문했는데 아직 안 와서요. 언제쯤 받아볼 수 있을까요?</p>', created_date: '2026-09-17T10:12:00+09:00', reply_status: 'N', reply: 'F', reply_depth: 0, display: 'T', deleted: 'F', notice: 'F', secret: 'T', rating: 0 },
      { shop_no: 1, board_no: 6, article_no: 502, parent_article_no: 502, product_no: 1001, member_id: 'm_lee', writer: '이수현', title: '사이즈 문의', content: '<p>168cm 55kg인데 M이랑 L 중에 뭐가 나을까요? 오버핏으로 입고 싶어요.</p>', created_date: '2026-09-17T11:40:00+09:00', reply_status: 'N', reply: 'F', reply_depth: 0, display: 'T', deleted: 'F', notice: 'F', secret: 'F', rating: 0 },
      { shop_no: 1, board_no: 6, article_no: 503, parent_article_no: 503, product_no: 1002, member_id: '', writer: '박지훈', title: '재입고 예정 있나요', content: '<p>이어폰 품절인데 재입고 되나요?</p>', created_date: '2026-09-18T09:05:00+09:00', reply_status: 'N', reply: 'F', reply_depth: 0, display: 'T', deleted: 'F', notice: 'F', secret: 'F', rating: 0 },
      { shop_no: 1, board_no: 6, article_no: 490, parent_article_no: 490, product_no: 1001, member_id: 'm_old', writer: '정하늘', title: '색상 문의', content: '<p>아이보리가 실제로 더 노란가요?</p>', created_date: '2026-09-10T09:05:00+09:00', reply_status: 'C', reply: 'T', reply_depth: 0, display: 'T', deleted: 'F', notice: 'F', secret: 'F', rating: 0 },
    ],
    4: [
      { shop_no: 1, board_no: 4, article_no: 301, parent_article_no: 301, product_no: 1001, member_id: 'm_choi', writer: '최유진', title: '만족해요', content: '<p>핏도 예쁘고 원단도 두툼해서 좋아요. 재구매 의사 있습니다!</p>', created_date: '2026-09-16T20:00:00+09:00', reply_status: 'N', reply: 'F', reply_depth: 0, display: 'T', deleted: 'F', notice: 'F', secret: 'F', rating: 5, comment_count: 0 },
      { shop_no: 1, board_no: 4, article_no: 302, parent_article_no: 302, product_no: 1002, member_id: 'm_kang', writer: '강도윤', title: '연결이 자꾸 끊겨요', content: '<p>왼쪽만 자꾸 끊깁니다. 불량인 것 같은데 교환 되나요?</p>', created_date: '2026-09-17T08:30:00+09:00', reply_status: 'N', reply: 'F', reply_depth: 0, display: 'T', deleted: 'F', notice: 'F', secret: 'F', rating: 2, comment_count: 0 },
    ],
    9: [
      { shop_no: 1, board_no: 9, article_no: 701, parent_article_no: 701, product_no: 0, member_id: 'm_kim', writer: '김민지', title: '주문 취소하고 싶어요', content: '<p>어제 주문한 거 취소 가능할까요? 주소를 잘못 썼어요.</p>', created_date: '2026-09-18T08:00:00+09:00', reply_status: 'N', reply: 'F', reply_depth: 0, display: 'T', deleted: 'F', notice: 'F', secret: 'T', rating: 0 },
    ],
  },
  comments: {},
  orders: [
    { shop_no: 1, order_id: '20260915-0000123', member_id: 'm_kim', order_date: '2026-09-15T14:20:00+09:00', paid: 'T', canceled: 'F', items: [{ product_no: 1001, product_name: '오버핏 코튼 셔츠 (아이보리)', option_value: '사이즈=M', quantity: 1, order_status: 'N30', shipping_company_name: 'CJ대한통운', shipping_code: '6512345678901' }] },
    { shop_no: 1, order_id: '20260917-0000456', member_id: 'm_kim', order_date: '2026-09-17T22:10:00+09:00', paid: 'T', canceled: 'F', items: [{ product_no: 1002, product_name: '무선 블루투스 이어폰 X2', option_value: '', quantity: 1, order_status: 'N10', shipping_company_name: '', shipping_code: '' }] },
    { shop_no: 1, order_id: '20260916-0000789', member_id: 'm_lee', order_date: '2026-09-16T09:00:00+09:00', paid: 'T', canceled: 'F', items: [{ product_no: 1001, product_name: '오버핏 코튼 셔츠 (아이보리)', option_value: '사이즈=L', quantity: 1, order_status: 'N40', shipping_company_name: 'CJ대한통운', shipping_code: '6519999999999' }] },
  ],
  posted: [],
  appstorePayments: [],
  tokenIssued: 0,
  nextArticleNo: 9000,
  nextCommentNo: 100,
};

let calls = 0;
app.use((req, res, next) => {
  calls += 1;
  res.setHeader('X-Api-Call-Limit', `${(calls % 40) + 1}/40`);
  next();
});

// ---- OAuth ----
app.get('/api/v2/oauth/authorize', (req, res) => {
  const { redirect_uri: redirectUri, state } = req.query;
  const url = new URL(redirectUri);
  url.searchParams.set('code', `mock-code-${Date.now()}`);
  url.searchParams.set('state', state || '');
  res.redirect(url.toString());
});

app.post('/api/v2/oauth/token', express.urlencoded({ extended: false }), (req, res) => {
  if (!(req.headers.authorization || '').startsWith('Basic ')) return res.status(401).json({ error: 'invalid_client' });
  state.tokenIssued += 1;
  const grant = req.body.grant_type;
  if (grant === 'authorization_code' && !String(req.body.code || '').startsWith('mock-code-')) {
    return res.status(400).json({ error: 'invalid_grant', error_description: 'bad code' });
  }
  res.json({
    access_token: `mock-access-${state.tokenIssued}`,
    expires_at: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    refresh_token: `mock-refresh-${state.tokenIssued}`,
    refresh_token_expires_at: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
    client_id: 'mock-client',
    mall_id: 'demo',
    user_id: 'demo',
    scopes: ['mall.read_community', 'mall.write_community', 'mall.read_product', 'mall.read_order', 'mall.read_store'],
    issued_at: new Date().toISOString(),
  });
});

// ---- Admin API (Bearer 필요) ----
const admin = express.Router();
admin.use((req, res, next) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer mock-access-')) return res.status(401).json({ error: { code: 401, message: 'Invalid access token' } });
  next();
});

admin.get('/store', (req, res) => res.json({ store: { shop_no: 1, shop_name: '데모 스토어', mall_id: 'demo', base_domain: 'demo.cafe24.com' } }));
admin.get('/boards', (req, res) => res.json({ boards: state.boards }));

admin.get('/boards/:board_no/articles', (req, res) => {
  const list = state.articles[req.params.board_no] || [];
  let out = list;
  if (req.query.reply_status) out = out.filter((a) => a.reply_status === req.query.reply_status);
  if (req.query.comment === 'F') out = out.filter((a) => !(state.comments[a.article_no] || []).length);
  if (req.query.comment === 'T') out = out.filter((a) => (state.comments[a.article_no] || []).length);
  res.json({ articles: out.slice(0, Number(req.query.limit || 10)) });
});

admin.get('/boards/:board_no/articles/:article_no', (req, res) => {
  const a = (state.articles[req.params.board_no] || []).find((x) => String(x.article_no) === req.params.article_no);
  if (!a) return res.status(404).json({ error: { code: 404, message: 'article not found' } });
  res.json({ article: a });
});

admin.post('/boards/:board_no/articles', (req, res) => {
  const boardNo = Number(req.params.board_no);
  const requests = req.body?.requests || [];
  const created = [];
  for (const r of requests) {
    if (!r.writer || !r.title || !r.content || !r.client_ip) {
      return res.status(422).json({ error: { code: 422, message: 'writer, title, content, client_ip are required' } });
    }
    const article = { shop_no: 1, board_no: boardNo, article_no: state.nextArticleNo++, parent_article_no: r.reply_article_no || 0, reply_depth: r.reply_article_no ? 1 : 0, ...r, created_date: new Date().toISOString() };
    state.articles[boardNo] = state.articles[boardNo] || [];
    state.articles[boardNo].push(article);
    if (r.reply_article_no) {
      const parent = state.articles[boardNo].find((x) => x.article_no === Number(r.reply_article_no));
      if (parent) {
        parent.reply_status = 'C';
        parent.reply = 'T';
      }
    }
    state.posted.push({ type: 'reply_article', board_no: boardNo, article });
    created.push(article);
  }
  res.json({ articles: created });
});

admin.post('/boards/:board_no/articles/:article_no/comments', (req, res) => {
  const r = req.body?.request || {};
  if (!r.content || !r.writer || !r.password) return res.status(422).json({ error: { code: 422, message: 'content, writer, password are required' } });
  const comment = { shop_no: 1, board_no: Number(req.params.board_no), article_no: Number(req.params.article_no), comment_no: state.nextCommentNo++, ...r, created_date: new Date().toISOString() };
  state.comments[req.params.article_no] = state.comments[req.params.article_no] || [];
  state.comments[req.params.article_no].push(comment);
  state.posted.push({ type: 'comment', comment });
  res.json({ comment });
});

admin.get('/products/:product_no', (req, res) => {
  const p = state.products[req.params.product_no];
  if (!p) return res.status(404).json({ error: { code: 404, message: 'product not found' } });
  res.json({ product: p });
});

admin.get('/orders', (req, res) => {
  let out = state.orders;
  if (req.query.member_id) out = out.filter((o) => o.member_id === req.query.member_id);
  const embedItems = String(req.query.embed || '').includes('items');
  res.json({ orders: out.map((o) => (embedItems ? o : { ...o, items: undefined })) });
});

admin.get('/appstore/payments', (req, res) => {
  const list = state.appstorePayments.filter((p) => !req.query.order_id || p.order_id === req.query.order_id);
  res.json({ payments: list });
});

admin.post('/appstore/orders', (req, res) => {
  const r = req.body?.request || {};
  const orderId = `mock-ao-${Date.now()}`;
  // 데모에서는 결제창 없이 즉시 결제 완료로 기록한다
  state.appstorePayments.push({ order_id: orderId, payment_status: 'paid', title: r.order_name, payment_amount: r.order_amount, currency: 'KRW', automatic_payment: r.automatic_payment || 'F', pay_date: new Date().toISOString() });
  const url = new URL(r.return_url);
  url.searchParams.set('order_id', orderId);
  res.json({ order: { order_id: orderId, order_name: r.order_name, order_amount: r.order_amount, currency: 'KRW', return_url: r.return_url, automatic_payment: r.automatic_payment || 'F', confirmation_url: url.toString() } });
});

app.use('/api/v2/admin', admin);

// ---- 디버그: 앱이 게시한 내용 확인 ----
app.get('/__mock/state', (req, res) => res.json({ posted: state.posted, tokenIssued: state.tokenIssued, comments: state.comments }));
app.post('/__mock/reset', (req, res) => {
  state.posted = [];
  state.comments = {};
  res.json({ ok: true });
});

app.listen(port, () => console.log(`[mock-cafe24] listening on http://localhost:${port}`));
