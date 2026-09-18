import { buildContext } from './context.js';
import { generateDraft, shouldAutoPublish } from './drafter.js';
import { publishReply } from './publisher.js';

/** 답변 대상이 아닌 글 걸러내기: 답변글 자체, 공지, 삭제·비노출 글 */
export function isAnswerable(article) {
  if (!article) return false;
  if (article.deleted && article.deleted !== 'F') return false;
  if (article.display === 'F') return false;
  if (article.notice === 'T') return false;
  if (Number(article.reply_depth) > 0) return false;
  if (Number(article.parent_article_no) > 0 && Number(article.parent_article_no) !== Number(article.article_no)) return false;
  if (article.reply === 'T' && article.reply_status === 'C') return false;
  return true;
}

/** 게시판 mode에 맞는 미답변 조회 파라미터 */
export function unansweredQuery(board, shopNo, limit = 50) {
  const q = { shop_no: shopNo, limit, is_display: 'T' };
  if (board.mode === 'comment') q.comment = 'F';
  else q.reply_status = 'N';
  return q;
}

/**
 * 한 몰의 미답변 글을 가져와 대기열에 넣고, 초안을 생성하고, 조건이 맞으면 자동 게시한다.
 */
export async function syncMall({ db, client, config, provider, mall, settings = null, logger = console, boardFilter = null, maxGenerate = null }) {
  const mallId = mall.mall_id;
  const shopNo = mall.shop_no || 1;
  const s = settings || db.getSettings(mallId);
  const stats = { found: 0, created: 0, generated: 0, published: 0, errors: [] };

  const boards = s.boards.filter((b) => b.enabled && (boardFilter == null || Number(b.board_no) === Number(boardFilter)));
  for (const board of boards) {
    try {
      const articles = await client.listArticles(board.board_no, unansweredQuery(board, shopNo));
      for (const article of articles) {
        if (!isAnswerable(article)) continue;
        stats.found += 1;
        const { inserted } = db.upsertArticle({
          mall_id: mallId,
          shop_no: shopNo,
          board_no: board.board_no,
          article_no: article.article_no,
          article: { ...article, board_no: board.board_no },
        });
        if (inserted) stats.created += 1;
      }
    } catch (err) {
      stats.errors.push(`board ${board.board_no}: ${err.message}`);
      logger.error?.(`[sync:${mallId}] board ${board.board_no} failed: ${err.message}`);
    }
  }

  const cap = Math.min(config.poll.maxDraftsPerSync, maxGenerate == null ? Infinity : Math.max(0, maxGenerate));
  const pending = cap > 0 ? db.listPendingWithoutDraft(mallId, cap) : [];
  if (cap === 0) stats.errors.push('이번 달 초안 생성 한도를 모두 사용했습니다. 요금제를 확인하세요.');
  for (const row of pending) {
    try {
      const result = await draftOne({ db, client, provider, settings: s, row, logger });
      stats.generated += 1;
      if (shouldAutoPublish(result.draft, s)) {
        await publishOne({ db, client, settings: s, row: db.getDraft(row.id), logger, auto: true });
        stats.published += 1;
      }
    } catch (err) {
      stats.errors.push(`article ${row.article_no}: ${err.message}`);
    }
  }

  db.logEvent(mallId, 'sync', stats);
  return stats;
}

/** 초안 1건 생성(또는 재생성) */
export async function draftOne({ db, client, provider, settings, row, logger = console }) {
  try {
    const context = await buildContext({ client, settings, article: row.article, shopNo: row.shop_no, logger });
    const { draft, meta } = await generateDraft({ provider, settings, article: row.article, context });
    db.setDraft(row.id, { draft, context, reply_text: draft.reply, error: null, status: 'pending' });
    db.logEvent(row.mall_id, 'draft_generated', { id: row.id, article_no: row.article_no, provider: meta.provider, model: meta.model, category: draft.category, confidence: draft.confidence });
    return { draft, context, meta };
  } catch (err) {
    db.setDraft(row.id, { error: err.message });
    db.logEvent(row.mall_id, 'draft_failed', { id: row.id, article_no: row.article_no, error: err.message });
    logger.error?.(`[draft:${row.mall_id}] article ${row.article_no} failed: ${err.message}`);
    throw err;
  }
}

/** 초안 1건 게시 */
export async function publishOne({ db, client, settings, row, replyText, clientIp, logger = console, auto = false }) {
  try {
    const result = await publishReply({ client, settings, draftRow: row, replyText, clientIp });
    db.markPublished(row.id, { published_ref: result.ref, reply_text: result.text });
    db.logEvent(row.mall_id, auto ? 'auto_published' : 'published', { id: row.id, article_no: row.article_no, ref: result.ref, mode: result.mode });
    return result;
  } catch (err) {
    db.setDraft(row.id, { status: 'failed', error: err.message, reply_text: replyText ?? row.reply_text });
    db.logEvent(row.mall_id, 'publish_failed', { id: row.id, article_no: row.article_no, error: err.message });
    logger.error?.(`[publish:${row.mall_id}] article ${row.article_no} failed: ${err.message}`);
    throw err;
  }
}
