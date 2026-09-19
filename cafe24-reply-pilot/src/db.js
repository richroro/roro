import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export const DEFAULT_SETTINGS = Object.freeze({
  store_name: '',
  writer_name: '운영자',
  tone: 'friendly', // friendly | formal | concise
  signature: '',
  reply_title_prefix: '[답변]',
  policies: {
    shipping: '',
    exchange_refund: '',
    hours: '',
    faq: '',
  },
  boards: [], // [{ board_no, board_name, enabled, mode: 'reply'|'comment' }]
  order_lookup: true,
  auto_publish: { enabled: false, min_confidence: 0.9, categories: ['shipping'] },
  onboarded: false,
});

const SCHEMA = `
CREATE TABLE IF NOT EXISTS malls (
  mall_id TEXT PRIMARY KEY,
  shop_no INTEGER NOT NULL DEFAULT 1,
  user_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  access_expires_at INTEGER,
  refresh_expires_at INTEGER,
  scopes TEXT,
  installed_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  mall_id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mall_id TEXT NOT NULL,
  shop_no INTEGER NOT NULL,
  board_no INTEGER NOT NULL,
  article_no INTEGER NOT NULL,
  article_json TEXT NOT NULL,
  context_json TEXT,
  draft_json TEXT,
  reply_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  published_ref TEXT,
  published_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(mall_id, shop_no, board_no, article_no)
);
CREATE INDEX IF NOT EXISTS idx_drafts_mall_status ON drafts(mall_id, status, updated_at);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mall_id TEXT,
  type TEXT NOT NULL,
  detail TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_mall ON events(mall_id, created_at);
`;

const now = () => Math.floor(Date.now() / 1000);

function mergeSettings(stored) {
  const s = stored || {};
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    policies: { ...DEFAULT_SETTINGS.policies, ...(s.policies || {}) },
    auto_publish: { ...DEFAULT_SETTINGS.auto_publish, ...(s.auto_publish || {}) },
    boards: Array.isArray(s.boards) ? s.boards : [],
  };
}

export class Db {
  constructor(file = ':memory:') {
    if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
    this.sql = new DatabaseSync(file);
    this.sql.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    this.sql.exec(SCHEMA);
  }

  close() {
    this.sql.close();
  }

  // ---------- malls / tokens ----------
  upsertMall({ mall_id, shop_no = 1, user_id = null, tokens = null }) {
    const t = now();
    this.sql
      .prepare(
        `INSERT INTO malls (mall_id, shop_no, user_id, access_token, refresh_token, access_expires_at, refresh_expires_at, scopes, installed_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(mall_id) DO UPDATE SET
           shop_no = excluded.shop_no,
           user_id = COALESCE(excluded.user_id, malls.user_id),
           access_token = COALESCE(excluded.access_token, malls.access_token),
           refresh_token = COALESCE(excluded.refresh_token, malls.refresh_token),
           access_expires_at = COALESCE(excluded.access_expires_at, malls.access_expires_at),
           refresh_expires_at = COALESCE(excluded.refresh_expires_at, malls.refresh_expires_at),
           scopes = COALESCE(excluded.scopes, malls.scopes),
           updated_at = excluded.updated_at`,
      )
      .run(
        mall_id,
        shop_no,
        user_id,
        tokens?.access_token ?? null,
        tokens?.refresh_token ?? null,
        tokens?.access_expires_at ?? null,
        tokens?.refresh_expires_at ?? null,
        tokens ? JSON.stringify(tokens.scopes || []) : null,
        t,
        t,
      );
    return this.getMall(mall_id);
  }

  updateTokens(mall_id, tokens) {
    this.sql
      .prepare(
        `UPDATE malls SET access_token = ?, refresh_token = COALESCE(?, refresh_token), access_expires_at = ?, refresh_expires_at = ?, scopes = ?, updated_at = ? WHERE mall_id = ?`,
      )
      .run(
        tokens.access_token,
        tokens.refresh_token ?? null,
        tokens.access_expires_at,
        tokens.refresh_expires_at,
        JSON.stringify(tokens.scopes || []),
        now(),
        mall_id,
      );
  }

  getMall(mall_id) {
    const row = this.sql.prepare('SELECT * FROM malls WHERE mall_id = ?').get(mall_id);
    if (!row) return null;
    return { ...row, scopes: row.scopes ? JSON.parse(row.scopes) : [] };
  }

  listMalls() {
    return this.sql
      .prepare('SELECT * FROM malls ORDER BY installed_at')
      .all()
      .map((row) => ({ ...row, scopes: row.scopes ? JSON.parse(row.scopes) : [] }));
  }

  deleteMall(mall_id) {
    this.sql.prepare('DELETE FROM drafts WHERE mall_id = ?').run(mall_id);
    this.sql.prepare('DELETE FROM settings WHERE mall_id = ?').run(mall_id);
    this.sql.prepare('DELETE FROM malls WHERE mall_id = ?').run(mall_id);
  }

  // ---------- settings ----------
  getSettings(mall_id) {
    const row = this.sql.prepare('SELECT json FROM settings WHERE mall_id = ?').get(mall_id);
    return mergeSettings(row ? JSON.parse(row.json) : null);
  }

  saveSettings(mall_id, settings) {
    const merged = mergeSettings(settings);
    this.sql
      .prepare(
        `INSERT INTO settings (mall_id, json, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(mall_id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at`,
      )
      .run(mall_id, JSON.stringify(merged), now());
    return merged;
  }

  // ---------- drafts ----------
  /** 게시글을 초안 대기열에 등록. 이미 있으면 기존 행을 돌려준다. */
  upsertArticle({ mall_id, shop_no, board_no, article_no, article }) {
    const existing = this.getDraftByArticle(mall_id, shop_no, board_no, article_no);
    if (existing) return { row: existing, inserted: false };
    const t = now();
    const info = this.sql
      .prepare(
        `INSERT INTO drafts (mall_id, shop_no, board_no, article_no, article_json, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
      )
      .run(mall_id, shop_no, board_no, article_no, JSON.stringify(article), t, t);
    return { row: this.getDraft(Number(info.lastInsertRowid)), inserted: true };
  }

  hydrate(row) {
    if (!row) return null;
    return {
      ...row,
      article: JSON.parse(row.article_json),
      context: row.context_json ? JSON.parse(row.context_json) : null,
      draft: row.draft_json ? JSON.parse(row.draft_json) : null,
    };
  }

  getDraft(id) {
    return this.hydrate(this.sql.prepare('SELECT * FROM drafts WHERE id = ?').get(id));
  }

  getDraftByArticle(mall_id, shop_no, board_no, article_no) {
    return this.hydrate(
      this.sql
        .prepare('SELECT * FROM drafts WHERE mall_id = ? AND shop_no = ? AND board_no = ? AND article_no = ?')
        .get(mall_id, shop_no, board_no, article_no),
    );
  }

  listDrafts(mall_id, { status = null, limit = 50, offset = 0 } = {}) {
    const rows = status
      ? this.sql
          .prepare('SELECT * FROM drafts WHERE mall_id = ? AND status = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?')
          .all(mall_id, status, limit, offset)
      : this.sql
          .prepare('SELECT * FROM drafts WHERE mall_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?')
          .all(mall_id, limit, offset);
    return rows.map((r) => this.hydrate(r));
  }

  /** 초안이 아직 생성되지 않은 대기 글 */
  listPendingWithoutDraft(mall_id, limit = 20) {
    return this.sql
      .prepare(
        `SELECT * FROM drafts WHERE mall_id = ? AND status = 'pending' AND draft_json IS NULL AND (error IS NULL OR error = '') ORDER BY created_at ASC LIMIT ?`,
      )
      .all(mall_id, limit)
      .map((r) => this.hydrate(r));
  }

  countDrafts(mall_id) {
    const rows = this.sql
      .prepare('SELECT status, COUNT(*) AS n FROM drafts WHERE mall_id = ? GROUP BY status')
      .all(mall_id);
    const out = { pending: 0, published: 0, skipped: 0, failed: 0 };
    for (const r of rows) out[r.status] = Number(r.n);
    return out;
  }

  setDraft(id, { draft = undefined, context = undefined, status = undefined, reply_text = undefined, error = undefined }) {
    const sets = [];
    const args = [];
    if (draft !== undefined) {
      sets.push('draft_json = ?');
      args.push(draft === null ? null : JSON.stringify(draft));
    }
    if (context !== undefined) {
      sets.push('context_json = ?');
      args.push(context === null ? null : JSON.stringify(context));
    }
    if (status !== undefined) {
      sets.push('status = ?');
      args.push(status);
    }
    if (reply_text !== undefined) {
      sets.push('reply_text = ?');
      args.push(reply_text);
    }
    if (error !== undefined) {
      sets.push('error = ?');
      args.push(error);
    }
    sets.push('updated_at = ?');
    args.push(now());
    args.push(id);
    this.sql.prepare(`UPDATE drafts SET ${sets.join(', ')} WHERE id = ?`).run(...args);
    return this.getDraft(id);
  }

  markPublished(id, { published_ref, reply_text }) {
    const t = now();
    this.sql
      .prepare(`UPDATE drafts SET status = 'published', published_ref = ?, reply_text = ?, published_at = ?, error = NULL, updated_at = ? WHERE id = ?`)
      .run(published_ref, reply_text, t, t, id);
    return this.getDraft(id);
  }

  /** 이번 달 AI 초안 생성 횟수 (플랜 사용량 표시용) */
  countGeneratedThisMonth(mall_id, date = new Date()) {
    const start = Math.floor(new Date(date.getFullYear(), date.getMonth(), 1).getTime() / 1000);
    const row = this.sql
      .prepare(`SELECT COUNT(*) AS n FROM events WHERE mall_id = ? AND type = 'draft_generated' AND created_at >= ?`)
      .get(mall_id, start);
    return Number(row?.n || 0);
  }

  // ---------- events ----------
  logEvent(mall_id, type, detail = null) {
    this.sql
      .prepare('INSERT INTO events (mall_id, type, detail, created_at) VALUES (?, ?, ?, ?)')
      .run(mall_id, type, detail == null ? null : typeof detail === 'string' ? detail : JSON.stringify(detail), now());
  }

  listEvents(mall_id, limit = 30) {
    return this.sql
      .prepare('SELECT * FROM events WHERE mall_id = ? ORDER BY id DESC LIMIT ?')
      .all(mall_id, limit);
  }
}

export function openDb(file) {
  return new Db(file);
}
