import { apiBase, refreshAccessToken } from './oauth.js';

export class Cafe24ApiError extends Error {
  constructor(message, { status, code, body, path } = {}) {
    super(message);
    this.name = 'Cafe24ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
    this.path = path;
  }
}

const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 카페24 Admin API 클라이언트.
 * - Bearer 토큰 자동 첨부, 만료 임박/401 시 리프레시 후 1회 재시도
 * - 429(호출 한도) 시 Retry-After 기반 백오프 재시도
 * - 응답 오류를 Cafe24ApiError로 정규화
 */
export class Cafe24Client {
  constructor({
    mallId,
    tokens,
    onTokens = () => {},
    clientId,
    clientSecret,
    apiHost = '',
    apiVersion = '',
    fetchImpl = fetch,
    sleep = defaultSleep,
    logger = console,
    maxRetries = 3,
  }) {
    this.mallId = mallId;
    this.tokens = { ...tokens };
    this.onTokens = onTokens;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.apiHost = apiHost;
    this.apiVersion = apiVersion;
    this.fetchImpl = fetchImpl;
    this.sleep = sleep;
    this.logger = logger;
    this.maxRetries = maxRetries;
    this.base = apiBase(mallId, apiHost);
    this.refreshing = null;
  }

  async ensureFreshToken(force = false) {
    const nowSec = Math.floor(Date.now() / 1000);
    const nearExpiry = !this.tokens.access_expires_at || this.tokens.access_expires_at - nowSec < 300;
    if (!force && !nearExpiry) return;
    if (!this.tokens.refresh_token) {
      if (force) throw new Cafe24ApiError('access token rejected and no refresh token available (재설치 필요)', { status: 401, code: 'reauth_required' });
      return;
    }
    if (!this.refreshing) {
      this.refreshing = refreshAccessToken({
        mallId: this.mallId,
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        refreshToken: this.tokens.refresh_token,
        apiHost: this.apiHost,
        fetchImpl: this.fetchImpl,
      })
        .then(async (fresh) => {
          this.tokens = { ...this.tokens, ...fresh, refresh_token: fresh.refresh_token || this.tokens.refresh_token };
          await this.onTokens(this.tokens);
        })
        .finally(() => {
          this.refreshing = null;
        });
    }
    await this.refreshing;
  }

  buildUrl(path, query) {
    const url = new URL(`${this.base}${path.startsWith('/') ? path : `/${path}`}`);
    for (const [k, v] of Object.entries(query || {})) {
      if (v === undefined || v === null || v === '') continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(',') : String(v));
    }
    return url.toString();
  }

  async request(method, path, { query, body } = {}, attempt = 0, refreshed = false) {
    await this.ensureFreshToken();
    const headers = {
      Authorization: `Bearer ${this.tokens.access_token}`,
      Accept: 'application/json',
    };
    if (this.apiVersion) headers['X-Cafe24-Api-Version'] = this.apiVersion;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const res = await this.fetchImpl(this.buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (res.status === 401 && !refreshed) {
      await this.ensureFreshToken(true);
      return this.request(method, path, { query, body }, attempt, true);
    }
    if ((res.status === 429 || res.status >= 500) && attempt < this.maxRetries) {
      const retryAfter = Number(res.headers.get('retry-after')) || 0;
      const wait = retryAfter ? retryAfter * 1000 : 500 * 2 ** attempt;
      this.logger.warn?.(`[cafe24] ${res.status} on ${path}; retrying in ${wait}ms`);
      await this.sleep(wait);
      return this.request(method, path, { query, body }, attempt + 1, refreshed);
    }
    if (!res.ok) {
      const err = data?.error || {};
      throw new Cafe24ApiError(`cafe24 api ${method} ${path} failed (${res.status}): ${err.message || text}`, {
        status: res.status,
        code: err.code,
        body: data,
        path,
      });
    }
    return data;
  }

  get(path, query) {
    return this.request('GET', path, { query });
  }
  post(path, body, query) {
    return this.request('POST', path, { body, query });
  }
  put(path, body, query) {
    return this.request('PUT', path, { body, query });
  }

  // ---------- 리소스 헬퍼 ----------
  async getStore(shopNo = 1) {
    return (await this.get('/admin/store', { shop_no: shopNo })).store;
  }

  async listBoards(shopNo = 1) {
    return (await this.get('/admin/boards', { shop_no: shopNo })).boards || [];
  }

  async listArticles(boardNo, query = {}) {
    return (await this.get(`/admin/boards/${boardNo}/articles`, query)).articles || [];
  }

  async getArticle(boardNo, articleNo, shopNo = 1) {
    return (await this.get(`/admin/boards/${boardNo}/articles/${articleNo}`, { shop_no: shopNo })).article;
  }

  /** 답변글 등록: POST /admin/boards/{board_no}/articles  { shop_no, requests: [ { ..., reply_article_no } ] } */
  async createArticles(boardNo, requests, shopNo = 1) {
    return (await this.post(`/admin/boards/${boardNo}/articles`, { shop_no: shopNo, requests })).articles || [];
  }

  /** 댓글 등록: POST /admin/boards/{board_no}/articles/{article_no}/comments { shop_no, request: {...} } */
  async createComment(boardNo, articleNo, request, shopNo = 1) {
    return (await this.post(`/admin/boards/${boardNo}/articles/${articleNo}/comments`, { shop_no: shopNo, request })).comment;
  }

  async getProduct(productNo, shopNo = 1) {
    return (await this.get(`/admin/products/${productNo}`, { shop_no: shopNo })).product;
  }

  async listOrders(query = {}) {
    return (await this.get('/admin/orders', query)).orders || [];
  }

  /** 앱스토어 결제 주문 생성 (유료 플랜 결제): 응답의 confirmation_url로 이동시키면 카페24 결제창이 뜬다 */
  async createAppstoreOrder(request) {
    return (await this.post('/admin/appstore/orders', { request })).order;
  }
}

/** DB에 저장된 몰 레코드로 클라이언트를 만들고, 토큰 갱신 시 DB에 반영한다 */
export function createClientForMall(db, config, mall, extra = {}) {
  return new Cafe24Client({
    mallId: mall.mall_id,
    tokens: {
      access_token: mall.access_token,
      refresh_token: mall.refresh_token,
      access_expires_at: mall.access_expires_at,
      refresh_expires_at: mall.refresh_expires_at,
    },
    onTokens: (tokens) => db.updateTokens(mall.mall_id, tokens),
    clientId: config.cafe24.clientId,
    clientSecret: config.cafe24.clientSecret,
    apiHost: config.cafe24.apiHost,
    apiVersion: config.cafe24.apiVersion,
    ...extra,
  });
}
