import { Router } from 'express';
import { verifyLaunchRequest, verifyWebhookSignature } from '../cafe24/hmac.js';
import { buildAuthorizeUrl, createState, exchangeCode, parseState } from '../cafe24/oauth.js';
import { createClientForMall } from '../cafe24/client.js';
import { syncMall, draftOne, publishOne } from '../services/inbox.js';
import { csrfToken, verifyCsrf } from './session.js';
import { billingPage, dashboardPage, errorPage, homePage, inboxPage, notInstalledPage, settingsPage } from './views.js';
import { DRAFT_CATEGORIES } from '../ai/schema.js';
import { PLANS, getPlan, remainingQuota } from '../plans.js';

const WEBHOOK_POST_CREATED = 90033;
const WEBHOOK_APP_DELETED = 90077;
const WEBHOOK_APP_EXPIRED = 90078;
const WEBHOOK_APP_PAYMENT = 90157;

/** 설치 직후 매장명·게시판 목록을 카페24에서 읽어 설정 초안을 채운다 */
export async function prefillSettings({ db, client, mall }) {
  const settings = db.getSettings(mall.mall_id);
  try {
    const store = await client.getStore(mall.shop_no || 1);
    if (store?.shop_name && !settings.store_name) settings.store_name = store.shop_name;
  } catch {
    /* 매장 정보는 선택 사항 */
  }
  const boards = await client.listBoards(mall.shop_no || 1);
  settings.boards = mergeBoards(settings.boards, boards);
  return db.saveSettings(mall.mall_id, settings);
}

/** 카페24 게시판 목록을 설정에 병합. 기존 선택은 유지, 새 게시판은 이름으로 기본값 추정 */
export function mergeBoards(existing = [], boards = []) {
  const byNo = new Map(existing.map((b) => [Number(b.board_no), b]));
  const out = [];
  for (const b of boards) {
    if (b.use_board === 'F') continue;
    const prev = byNo.get(Number(b.board_no));
    const name = b.board_name || '';
    const looksInquiry = /q&a|문의|상담|질문/i.test(name);
    const looksReview = /후기|리뷰|review/i.test(name);
    const canReply = b.reply_feature === 'T';
    out.push({
      board_no: Number(b.board_no),
      board_name: name,
      enabled: prev ? !!prev.enabled : looksInquiry || looksReview,
      mode: prev?.mode || (looksReview || !canReply ? 'comment' : 'reply'),
    });
  }
  return out;
}

export function createRouter(ctx) {
  const { config, db, provider, logger = console } = ctx;
  const secret = config.session.secret;
  const r = Router();
  const clientExtra = ctx.fetchImpl ? { fetchImpl: ctx.fetchImpl } : {};
  const clientFor = (mall) => createClientForMall(db, config, mall, clientExtra);
  const csrf = (req) => csrfToken(req.session, secret);

  function requireMall(req, res, next) {
    const mallId = req.session?.mall_id;
    const mall = mallId ? db.getMall(mallId) : null;
    if (!mall || !mall.access_token) return res.status(401).type('html').send(notInstalledPage());
    req.mall = mall;
    req.settings = db.getSettings(mallId);
    req.client = clientFor(mall);
    next();
  }

  function requireCsrf(req, res, next) {
    if (!verifyCsrf(req.session, secret, req.body?._csrf)) {
      return res.status(403).type('html').send(errorPage({ title: '요청이 거부되었습니다', message: '보안 토큰이 유효하지 않습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.' }));
    }
    next();
  }

  function flashOf(req) {
    const q = req.query || {};
    if (q.ok) return { flash: String(q.ok), flashType: 'ok' };
    if (q.err) return { flash: String(q.err), flashType: 'err' };
    return {};
  }
  const redirectWith = (res, path, key, msg) => res.redirect(`${path}${path.includes('?') ? '&' : '?'}${key}=${encodeURIComponent(msg)}`);

  // ---------- 공개 ----------
  r.get('/', (req, res) => {
    if (req.session?.mall_id && db.getMall(req.session.mall_id)) return res.redirect('/dashboard');
    res.type('html').send(homePage());
  });
  r.get('/healthz', (req, res) => res.json({ ok: true, provider: provider.name, malls: db.listMalls().length }));

  // ---------- 앱 실행 (카페24 관리자 → 앱 URL) ----------
  r.get('/app/launch', (req, res) => {
    const rawQuery = req.originalUrl.split('?')[1] || '';
    const result = verifyLaunchRequest(rawQuery, config.cafe24.clientSecret, { maxSkewSec: config.cafe24.launchMaxSkewSec });
    if (!result.ok) {
      db.logEvent(result.params?.mall_id || null, 'launch_rejected', { reason: result.reason });
      return res.status(403).type('html').send(errorPage({ title: '앱 실행 요청을 확인할 수 없습니다', message: `사유: ${result.reason}. 카페24 관리자에서 다시 실행해 주세요.` }));
    }
    const p = result.params;
    const shopNo = Number(p.shop_no || 1) || 1;
    const mall = db.getMall(p.mall_id);
    const nowSec = Math.floor(Date.now() / 1000);
    const usable = mall?.access_token && mall?.refresh_token && (mall.refresh_expires_at || 0) > nowSec + 60;

    if (usable) {
      db.upsertMall({ mall_id: p.mall_id, shop_no: shopNo, user_id: p.user_id || null });
      res.setSession({ mall_id: p.mall_id, shop_no: shopNo, user_id: p.user_id || '', user_name: p.user_name || '' });
      db.logEvent(p.mall_id, 'launch', { user_id: p.user_id, user_type: p.user_type });
      return res.redirect(db.getSettings(p.mall_id).onboarded ? '/dashboard' : '/settings?welcome=1');
    }

    // 최초 설치 또는 토큰 만료 → OAuth 동의 화면으로
    const state = createState({ mall_id: p.mall_id, shop_no: shopNo, user_id: p.user_id || '', user_name: p.user_name || '' }, secret);
    return res.redirect(
      buildAuthorizeUrl({
        mallId: p.mall_id,
        clientId: config.cafe24.clientId,
        redirectUri: `${config.baseUrl}/oauth/callback`,
        scopes: config.cafe24.scopes,
        state,
        apiHost: config.cafe24.apiHost,
      }),
    );
  });

  r.get('/oauth/callback', async (req, res) => {
    const { code, state, error, error_description: desc } = req.query;
    if (error) return res.status(400).type('html').send(errorPage({ title: '권한 승인이 취소되었습니다', message: `${error}: ${desc || ''}` }));
    const payload = parseState(state, secret);
    if (!payload || !code) return res.status(400).type('html').send(errorPage({ title: '잘못된 요청', message: 'state 검증 실패 또는 code 누락' }));

    const tokens = await exchangeCode({
      mallId: payload.mall_id,
      clientId: config.cafe24.clientId,
      clientSecret: config.cafe24.clientSecret,
      code: String(code),
      redirectUri: `${config.baseUrl}/oauth/callback`,
      apiHost: config.cafe24.apiHost,
      fetchImpl: ctx.fetchImpl,
    });
    const mall = db.upsertMall({ mall_id: payload.mall_id, shop_no: payload.shop_no || 1, user_id: payload.user_id || tokens.user_id, tokens });
    db.logEvent(mall.mall_id, 'installed', { scopes: tokens.scopes });
    res.setSession({ mall_id: mall.mall_id, shop_no: mall.shop_no, user_id: payload.user_id || '', user_name: payload.user_name || '' });

    try {
      await prefillSettings({ db, client: clientFor(mall), mall });
    } catch (err) {
      logger.warn?.(`[install:${mall.mall_id}] prefill failed: ${err.message}`);
    }
    res.redirect('/settings?welcome=1');
  });

  // ---------- 대시보드 ----------
  r.get('/dashboard', requireMall, (req, res) => {
    const mallId = req.mall.mall_id;
    res.type('html').send(
      dashboardPage({
        session: req.session,
        settings: req.settings,
        counts: db.countDrafts(mallId),
        events: db.listEvents(mallId, 20),
        quota: remainingQuota(db, mallId, req.settings),
        provider,
        ...flashOf(req),
      }),
    );
  });

  // ---------- 답변 대기함 ----------
  r.get('/inbox', requireMall, (req, res) => {
    const status = ['pending', 'published', 'failed', 'skipped'].includes(req.query.status) ? req.query.status : 'pending';
    const drafts = db.listDrafts(req.mall.mall_id, { status, limit: 100 });
    res.type('html').send(inboxPage({ session: req.session, drafts, status, csrf: csrf(req), settings: req.settings, ...flashOf(req) }));
  });

  r.post('/inbox/sync', requireMall, requireCsrf, async (req, res) => {
    const quota = remainingQuota(db, req.mall.mall_id, req.settings);
    const stats = await syncMall({ db, client: req.client, config, provider, mall: req.mall, settings: req.settings, logger, maxGenerate: quota.remaining });
    const msg = `동기화 완료: 미답변 ${stats.found}건 확인, 새 글 ${stats.created}건, 초안 ${stats.generated}건 생성${stats.published ? `, 자동 게시 ${stats.published}건` : ''}${stats.errors.length ? ` (오류 ${stats.errors.length}건: ${stats.errors[0]})` : ''}`;
    redirectWith(res, '/inbox', stats.errors.length ? 'err' : 'ok', msg);
  });

  function loadOwnDraft(req, res, next) {
    const row = db.getDraft(Number(req.params.id));
    if (!row || row.mall_id !== req.mall.mall_id) return res.status(404).type('html').send(errorPage({ title: '초안을 찾을 수 없습니다', message: '' }));
    req.draftRow = row;
    next();
  }

  r.post('/drafts/:id/regenerate', requireMall, requireCsrf, loadOwnDraft, async (req, res) => {
    const quota = remainingQuota(db, req.mall.mall_id, req.settings);
    if (quota.remaining <= 0) return redirectWith(res, '/inbox', 'err', `이번 달 초안 생성 한도(${quota.limit}건)를 모두 사용했습니다. 요금제를 확인하세요.`);
    try {
      await draftOne({ db, client: req.client, provider, settings: req.settings, row: req.draftRow, logger });
      redirectWith(res, `/inbox`, 'ok', `#${req.draftRow.article_no} 초안을 다시 생성했습니다.`);
    } catch (err) {
      redirectWith(res, '/inbox', 'err', `초안 생성 실패: ${err.message}`);
    }
  });

  r.post('/drafts/:id/publish', requireMall, requireCsrf, loadOwnDraft, async (req, res) => {
    const replyText = String(req.body.reply_text || '').trim();
    if (!replyText) return redirectWith(res, '/inbox', 'err', '답변 내용이 비어 있습니다.');
    try {
      const result = await publishOne({ db, client: req.client, settings: req.settings, row: req.draftRow, replyText, clientIp: req.ip, logger });
      redirectWith(res, '/inbox', 'ok', `#${req.draftRow.article_no} 답변을 ${result.mode === 'comment' ? '댓글' : '답변글'}로 게시했습니다.`);
    } catch (err) {
      redirectWith(res, '/inbox?status=failed', 'err', `게시 실패: ${err.message}`);
    }
  });

  r.post('/drafts/:id/skip', requireMall, requireCsrf, loadOwnDraft, (req, res) => {
    db.setDraft(req.draftRow.id, { status: 'skipped' });
    db.logEvent(req.mall.mall_id, 'skipped', { id: req.draftRow.id, article_no: req.draftRow.article_no });
    redirectWith(res, '/inbox', 'ok', `#${req.draftRow.article_no} 글을 건너뛰었습니다.`);
  });

  r.post('/drafts/:id/reopen', requireMall, requireCsrf, loadOwnDraft, (req, res) => {
    db.setDraft(req.draftRow.id, { status: 'pending', error: null });
    redirectWith(res, '/inbox', 'ok', `#${req.draftRow.article_no} 글을 대기함으로 되돌렸습니다.`);
  });

  // ---------- 설정 ----------
  r.get('/settings', requireMall, (req, res) => {
    res.type('html').send(settingsPage({ session: req.session, settings: req.settings, csrf: csrf(req), welcome: !!req.query.welcome, ...flashOf(req) }));
  });

  r.post('/settings', requireMall, requireCsrf, (req, res) => {
    const b = req.body;
    const s = req.settings;
    const str = (v, max = 2000) => String(v ?? '').slice(0, max).trim();
    s.store_name = str(b.store_name, 100);
    s.writer_name = str(b.writer_name, 50) || '운영자';
    s.tone = ['friendly', 'formal', 'concise'].includes(b.tone) ? b.tone : 'friendly';
    s.signature = str(b.signature, 200);
    s.reply_title_prefix = str(b.reply_title_prefix, 30) || '[답변]';
    s.policies = {
      shipping: str(b.policy_shipping, 4000),
      exchange_refund: str(b.policy_exchange_refund, 4000),
      hours: str(b.policy_hours, 1000),
      faq: str(b.policy_faq, 8000),
    };
    s.boards = s.boards.map((board) => ({
      ...board,
      enabled: b[`board_enabled_${board.board_no}`] === 'on',
      mode: b[`board_mode_${board.board_no}`] === 'comment' ? 'comment' : 'reply',
    }));
    s.order_lookup = b.order_lookup === 'on';
    const plan = getPlan(s);
    const cats = [].concat(b.auto_categories || []).filter((c) => DRAFT_CATEGORIES.includes(c));
    const minConf = Number(b.auto_min_confidence);
    s.auto_publish = {
      enabled: b.auto_publish_enabled === 'on' && plan.auto_publish,
      min_confidence: Number.isFinite(minConf) ? Math.min(1, Math.max(0, minConf)) : 0.9,
      categories: cats,
    };
    s.onboarded = true;
    db.saveSettings(req.mall.mall_id, s);
    db.logEvent(req.mall.mall_id, 'settings_saved', { boards: s.boards.filter((x) => x.enabled).map((x) => x.board_no) });
    const note = b.auto_publish_enabled === 'on' && !plan.auto_publish ? ' (자동 게시는 프로 요금제에서 사용할 수 있어 꺼진 상태로 저장했습니다)' : '';
    redirectWith(res, '/settings', 'ok', `설정을 저장했습니다.${note}`);
  });

  r.post('/settings/boards/refresh', requireMall, requireCsrf, async (req, res) => {
    try {
      const boards = await req.client.listBoards(req.mall.shop_no || 1);
      req.settings.boards = mergeBoards(req.settings.boards, boards);
      db.saveSettings(req.mall.mall_id, req.settings);
      redirectWith(res, '/settings', 'ok', `게시판 ${req.settings.boards.length}개를 불러왔습니다. 답변할 게시판을 선택하고 저장하세요.`);
    } catch (err) {
      redirectWith(res, '/settings', 'err', `게시판을 불러오지 못했습니다: ${err.message}`);
    }
  });

  // ---------- 요금제 (카페24 과금 API) ----------
  r.get('/billing', requireMall, (req, res) => {
    res.type('html').send(billingPage({ session: req.session, settings: req.settings, quota: remainingQuota(db, req.mall.mall_id, req.settings), csrf: csrf(req), ...flashOf(req) }));
  });

  r.post('/billing/checkout', requireMall, requireCsrf, async (req, res) => {
    const key = String(req.body.plan || '');
    const plan = PLANS[key];
    if (!plan || !plan.price) return redirectWith(res, '/billing', 'err', '알 수 없는 요금제입니다.');
    try {
      const order = await req.client.createAppstoreOrder({
        order_name: `AI 답변 도우미 ${plan.name} (월)`,
        order_amount: String(plan.price),
        return_url: `${config.baseUrl}/billing/return?plan=${key}`,
        automatic_payment: 'T',
      });
      db.logEvent(req.mall.mall_id, 'billing_order_created', { plan: key, order_id: order?.order_id });
      if (!order?.confirmation_url) throw new Error('confirmation_url 이 없습니다');
      res.redirect(order.confirmation_url);
    } catch (err) {
      redirectWith(res, '/billing', 'err', `결제 주문 생성 실패: ${err.message}`);
    }
  });

  r.get('/billing/return', requireMall, async (req, res) => {
    const key = String(req.query.plan || '');
    const orderId = String(req.query.order_id || '');
    if (!PLANS[key]) return redirectWith(res, '/billing', 'err', '알 수 없는 요금제입니다.');
    // 결제 완료는 카페24 결제 내역으로 확인한 뒤 활성화한다 (리턴 URL 파라미터만 믿지 않음)
    let paid = false;
    try {
      const data = await req.client.get('/admin/appstore/payments', { order_id: orderId });
      paid = (data?.payments || []).some((p) => p.payment_status === 'paid' && (!orderId || p.order_id === orderId));
    } catch (err) {
      logger.warn?.(`[billing:${req.mall.mall_id}] payment lookup failed: ${err.message}`);
    }
    if (!paid) {
      db.logEvent(req.mall.mall_id, 'billing_pending', { plan: key, order_id: orderId });
      return redirectWith(res, '/billing', 'err', '결제 확인 중입니다. 결제가 완료되면 웹훅(90157)으로 자동 반영되며, 잠시 후 다시 확인해 주세요.');
    }
    req.settings.plan = key;
    db.saveSettings(req.mall.mall_id, req.settings);
    db.logEvent(req.mall.mall_id, 'billing_activated', { plan: key, order_id: orderId });
    redirectWith(res, '/billing', 'ok', `${PLANS[key].name} 요금제가 활성화되었습니다.`);
  });

  // ---------- 웹훅 ----------
  r.post('/webhooks/cafe24', (req, res) => {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));
    const signature = req.get('x-cafe24-hmac-sha256') || '';
    if (config.webhook.requireSignature && !verifyWebhookSignature(raw, signature, config.cafe24.clientSecret)) {
      return res.status(401).json({ ok: false, error: 'bad signature' });
    }
    let payload;
    try {
      payload = JSON.parse(raw.toString('utf8'));
    } catch {
      return res.status(400).json({ ok: false, error: 'invalid json' });
    }
    // 카페24는 빠른 응답을 기대하므로 먼저 200을 돌려주고 비동기로 처리한다
    res.json({ ok: true });
    handleWebhook(payload).catch((err) => logger.error?.(`[webhook] ${err.message}`));
  });

  async function handleWebhook(payload) {
    const eventNo = Number(payload?.event_no);
    const resource = payload?.resource || {};
    const mallId = resource.mall_id;
    if (!mallId) return;
    const mall = db.getMall(mallId);
    db.logEvent(mallId, 'webhook', { event_no: eventNo, board_no: resource.board_no, no: resource.no });

    if (eventNo === WEBHOOK_APP_DELETED) {
      if (mall) db.deleteMall(mallId);
      return;
    }
    if (!mall || !mall.access_token) return;
    if (eventNo === WEBHOOK_APP_EXPIRED) {
      db.logEvent(mallId, 'app_expired', null);
      return;
    }
    if (eventNo === WEBHOOK_APP_PAYMENT) {
      db.logEvent(mallId, 'app_payment', resource);
      return;
    }
    if (eventNo === WEBHOOK_POST_CREATED) {
      const settings = db.getSettings(mallId);
      if (!settings.onboarded) return;
      const boardNo = Number(resource.board_no);
      if (!settings.boards.some((b) => b.enabled && Number(b.board_no) === boardNo)) return;
      const quota = remainingQuota(db, mallId, settings);
      await syncMall({ db, client: clientFor(mall), config, provider, mall, settings, logger, boardFilter: boardNo, maxGenerate: quota.remaining });
    }
  }

  return r;
}
