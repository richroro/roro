import { stripHtml, truncate } from '../ai/prompt.js';
import { summarizeOrders } from '../cafe24/status.js';

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

/** 상품 응답에서 답변에 필요한 필드만 추린다 (프롬프트 길이·개인정보 최소화) */
export function trimProduct(p) {
  if (!p) return null;
  const options = [];
  for (const opt of p.options?.options || []) {
    const values = (opt.option_value || []).map((v) => v.option_text).filter(Boolean);
    options.push(`${opt.option_name}: ${values.join(', ')}`);
  }
  return {
    product_no: p.product_no,
    product_name: p.product_name,
    price: p.price,
    selling: p.selling,
    display: p.display,
    sold_out: p.sold_out === 'T' || (p.stock_quantity !== undefined && Number(p.stock_quantity) <= 0 && p.use_inventory === 'T'),
    summary_description: stripHtml(p.summary_description || ''),
    simple_description: stripHtml(p.simple_description || ''),
    description_text: truncate(stripHtml(p.description || ''), 1200),
    shipping_info: truncate(stripHtml(p.shipping_info || ''), 400),
    exchange_info: truncate(stripHtml(p.exchange_info || ''), 400),
    options,
  };
}

/**
 * 게시글 하나에 대한 답변 근거 수집: 게시판 설정, 상품, (회원이면) 최근 주문.
 * 각 조회는 실패해도 초안 생성을 막지 않도록 개별적으로 삼킨다.
 */
export async function buildContext({ client, settings, article, shopNo = 1, now = new Date(), logger = console }) {
  const board = settings.boards.find((b) => Number(b.board_no) === Number(article.board_no)) || null;
  const ctx = { board, product: null, orders: [], order_lookup_used: false, warnings: [] };

  if (article.product_no) {
    try {
      const product = await client.getProduct(article.product_no, shopNo);
      ctx.product = trimProduct(product);
    } catch (err) {
      ctx.warnings.push(`product_fetch_failed: ${err.message}`);
      logger.warn?.(`[context] product ${article.product_no} fetch failed: ${err.message}`);
    }
  }

  if (settings.order_lookup && article.member_id) {
    ctx.order_lookup_used = true;
    try {
      const end = isoDate(now);
      const start = isoDate(new Date(now.getTime() - 90 * 24 * 3600 * 1000));
      const orders = await client.listOrders({
        shop_no: shopNo,
        member_id: article.member_id,
        start_date: start,
        end_date: end,
        embed: 'items',
        limit: 5,
      });
      // 작성자 본인의 주문만 남긴다 (다른 회원의 주문이 섞여 들어오는 것을 방지)
      ctx.orders = summarizeOrders(orders, { memberId: article.member_id });
    } catch (err) {
      ctx.warnings.push(`order_fetch_failed: ${err.message}`);
      logger.warn?.(`[context] orders for ${article.member_id} fetch failed: ${err.message}`);
    }
  }

  return ctx;
}
