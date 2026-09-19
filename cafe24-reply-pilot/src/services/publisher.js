import crypto from 'node:crypto';

export function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 평문 답변 → 게시판용 HTML (줄바꿈 유지) */
export function textToHtml(text = '') {
  return escapeHtml(text.trim())
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/** 답변글(POST /boards/{no}/articles requests[]) 요청 본문 */
export function buildReplyArticleRequest({ article, replyText, settings, clientIp = '127.0.0.1' }) {
  const prefix = settings.reply_title_prefix || '[답변]';
  const title = `${prefix} ${article.title || ''}`.trim().slice(0, 256);
  const req = {
    writer: settings.writer_name || '운영자',
    title,
    content: textToHtml(replyText),
    client_ip: clientIp,
    reply_article_no: article.article_no,
    reply: 'T',
    reply_status: 'C',
    secret: article.secret === 'T' ? 'T' : 'F',
    input_channel: 'P',
  };
  if (article.product_no) req.product_no = article.product_no;
  if (article.board_category_no) req.board_category_no = article.board_category_no;
  return req;
}

/** 댓글(POST /boards/{no}/articles/{article_no}/comments request) 요청 본문 */
export function buildCommentRequest({ article, replyText, settings }) {
  return {
    content: textToHtml(replyText),
    writer: settings.writer_name || '운영자',
    password: crypto.randomBytes(8).toString('hex').slice(0, 16),
    secret: article.secret === 'T' ? 'T' : 'F',
    input_channel: 'P',
  };
}

/**
 * 초안을 카페24에 게시. 게시판 설정 mode에 따라 답변글 또는 댓글로 등록한다.
 * @returns {{ mode: 'reply'|'comment', ref: string }}
 */
export async function publishReply({ client, settings, draftRow, replyText, clientIp }) {
  const article = draftRow.article;
  const boardCfg = settings.boards.find((b) => Number(b.board_no) === Number(draftRow.board_no));
  const mode = boardCfg?.mode === 'comment' ? 'comment' : 'reply';
  const text = (replyText ?? draftRow.reply_text ?? draftRow.draft?.reply ?? '').trim();
  if (!text) throw new Error('게시할 답변 내용이 비어 있습니다.');

  if (mode === 'comment') {
    const comment = await client.createComment(
      draftRow.board_no,
      draftRow.article_no,
      buildCommentRequest({ article, replyText: text, settings }),
      draftRow.shop_no,
    );
    return { mode, ref: `comment:${comment?.comment_no ?? ''}`, text };
  }

  const created = await client.createArticles(
    draftRow.board_no,
    [buildReplyArticleRequest({ article, replyText: text, settings, clientIp })],
    draftRow.shop_no,
  );
  const first = Array.isArray(created) ? created[0] : created;
  return { mode, ref: `article:${first?.article_no ?? ''}`, text };
}
