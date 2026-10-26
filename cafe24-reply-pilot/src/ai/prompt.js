import { CATEGORY_LABELS, DRAFT_CATEGORIES } from './schema.js';

export function stripHtml(html = '') {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function truncate(text = '', max = 1500) {
  const t = String(text);
  return t.length > max ? `${t.slice(0, max)}…(이하 생략)` : t;
}

const TONE_GUIDE = {
  friendly: '따뜻하고 친근한 존댓말. 이모지는 쓰지 않는다.',
  formal: '격식 있는 비즈니스 존댓말. 간결하고 정중하게.',
  concise: '핵심만 2~4문장으로 짧게. 불필요한 인사말은 최소화.',
};

/**
 * 시스템 프롬프트는 매장 설정에서만 만들어져 요청 간에 동일하다 → 프롬프트 캐시에 유리.
 * 게시글·주문 등 요청마다 바뀌는 내용은 user 메시지에 넣는다.
 */
export function buildSystemPrompt(settings) {
  const p = settings.policies || {};
  const policyBlock = [
    p.shipping && `### 배송 정책\n${p.shipping}`,
    p.exchange_refund && `### 교환/반품/환불 정책\n${p.exchange_refund}`,
    p.hours && `### 고객센터 운영시간\n${p.hours}`,
    p.faq && `### 자주 묻는 질문과 답\n${p.faq}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  return [
    `당신은 온라인 쇼핑몰 "${settings.store_name || '우리 쇼핑몰'}"의 고객 문의 답변 담당자입니다.`,
    `게시판(상품문의, 후기, 1:1 문의)에 올라온 고객 글에 대해 운영자가 검토 후 게시할 답변 초안을 작성합니다.`,
    '',
    '## 답변 원칙',
    `- 말투: ${TONE_GUIDE[settings.tone] || TONE_GUIDE.friendly}`,
    '- 아래 "매장 정책"과 함께 제공되는 상품 정보·주문 정보에 있는 사실만 근거로 답합니다. 없는 내용은 지어내지 않습니다.',
    '- 정책에 없는 배송일 약속, 보상, 할인, 법적 판단이 필요한 내용은 답변하지 말고 needs_human을 true로 두고 사유를 적습니다.',
    '- 주문 정보가 제공되면 해당 고객의 주문 상태(예: 배송중, 송장번호)를 구체적으로 안내합니다. 주문 정보가 없는데 주문 관련 질문이면 주문번호를 알려 달라고 요청합니다.',
    '- 후기(리뷰) 글에는 구매 감사 인사와 후기 내용에 대한 짧은 공감을 담고, 불만이 있으면 해결 의지를 표현합니다.',
    '- 개인정보(주소, 연락처, 결제수단)는 답변에 절대 쓰지 않습니다.',
    '- 답변은 한국어 존댓말로, 마지막에 서명이 있으면 붙입니다.',
    settings.signature ? `- 서명: "${settings.signature}"` : '- 서명: 없음',
    '',
    '## 분류 카테고리',
    DRAFT_CATEGORIES.map((c) => `- ${c}: ${CATEGORY_LABELS[c]}`).join('\n'),
    '',
    '## confidence 기준',
    '- 0.9 이상: 정책/주문 정보에 답이 명확히 있어 그대로 게시 가능',
    '- 0.6~0.9: 대체로 맞지만 운영자가 한 번 확인하면 좋음',
    '- 0.6 미만: 정보가 부족하거나 사람이 판단해야 함',
    '',
    '## 매장 정책',
    policyBlock || '(등록된 정책이 없습니다. 정책이 필요한 질문은 needs_human을 true로 두세요.)',
  ].join('\n');
}

export function buildUserPrompt({ article, context, settings }) {
  const board = context?.board;
  const lines = [];
  lines.push(`## 게시글`);
  lines.push(`- 게시판: ${board?.board_name || `#${article.board_no}`} (${board?.mode === 'comment' ? '댓글로 답변' : '답변글로 답변'})`);
  lines.push(`- 제목: ${article.title || '(제목 없음)'}`);
  lines.push(`- 작성자: ${article.writer || article.member_id || '비회원'}${article.member_id ? ` (회원 ID: ${article.member_id})` : ''}`);
  if (article.rating) lines.push(`- 평점: ${article.rating}/5`);
  lines.push(`- 작성일: ${article.created_date || ''}`);
  lines.push(`- 내용:\n${truncate(stripHtml(article.content), 2000) || '(내용 없음)'}`);

  const product = context?.product;
  if (product) {
    lines.push('', '## 문의 대상 상품');
    lines.push(`- 상품명: ${product.product_name}`);
    if (product.price) lines.push(`- 판매가: ${product.price}원`);
    if (product.selling === 'F') lines.push('- 현재 판매 중지 상태');
    if (product.sold_out) lines.push('- 현재 품절');
    if (product.summary_description) lines.push(`- 요약 설명: ${product.summary_description}`);
    if (product.simple_description) lines.push(`- 간략 설명: ${product.simple_description}`);
    if (product.options?.length) lines.push(`- 옵션: ${product.options.join(' / ')}`);
    if (product.description_text) lines.push(`- 상세 설명(발췌):\n${product.description_text}`);
    if (product.shipping_info) lines.push(`- 상품 배송 안내: ${product.shipping_info}`);
    if (product.exchange_info) lines.push(`- 상품 교환 안내: ${product.exchange_info}`);
  } else if (article.product_no) {
    lines.push('', `## 문의 대상 상품\n- 상품번호 ${article.product_no} (상세 정보를 불러오지 못했습니다)`);
  }

  const orders = context?.orders;
  if (settings.order_lookup) {
    lines.push('', '## 이 고객의 최근 주문 (최근 90일)');
    if (orders?.length) {
      for (const o of orders) {
        lines.push(`- 주문번호 ${o.order_id} (${o.order_date})${o.canceled ? ' [취소됨]' : ''}${o.paid ? '' : ' [미결제]'}`);
        for (const it of o.items) {
          lines.push(`  - ${it.product_name}${it.option ? ` / ${it.option}` : ''} x${it.quantity}: ${it.status}${it.tracking_no ? ` (${it.carrier} ${it.tracking_no})` : ''}`);
        }
      }
    } else {
      lines.push(context?.order_lookup_used ? '- 조회된 주문이 없습니다.' : '- (비회원이거나 조회하지 않음)');
    }
  }

  lines.push('', '위 게시글에 대한 답변 초안을 JSON으로 작성하세요.');
  return lines.join('\n');
}
