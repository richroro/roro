import { stripHtml } from './prompt.js';

/**
 * 규칙 기반 목 제공자. API 키 없이 로컬 데모·테스트를 돌리기 위한 것으로,
 * 운영에서는 반드시 claude 제공자를 사용한다.
 */
const RULES = [
  { category: 'exchange_refund', re: /교환|반품|환불|하자|불량/ },
  { category: 'order_change', re: /취소|변경|옵션\s*바꾸|주소\s*변경/ },
  { category: 'shipping', re: /배송|언제\s*(와|오|도착)|도착|출고|송장|택배/ },
  { category: 'stock', re: /재입고|품절|입고|재고/ },
  { category: 'size_fit', re: /사이즈|치수|핏|기장|허리|발\s*크기|mm|cm/ },
  { category: 'payment', re: /결제|입금|카드|영수증|현금영수증|무통장/ },
  { category: 'product_info', re: /성분|소재|재질|사용법|용량|색상|호환|무게/ },
];

const TONE_OPEN = {
  friendly: '안녕하세요, 고객님! 문의 남겨 주셔서 감사합니다.',
  formal: '안녕하십니까, 고객님. 문의해 주셔서 감사합니다.',
  concise: '안녕하세요.',
};

function closing(settings) {
  const base = '추가로 궁금하신 점이 있으면 언제든 문의해 주세요.';
  return settings.signature ? `${base}\n\n${settings.signature}` : base;
}

export function createMockProvider() {
  async function draft({ article, context, settings }) {
    const text = `${article.title || ''}\n${stripHtml(article.content || '')}`;
    const isReview = context?.board?.mode === 'comment' || Number(article.rating) > 0;
    let category = isReview ? 'review_thanks' : 'other';
    if (!isReview) {
      for (const rule of RULES) {
        if (rule.re.test(text)) {
          category = rule.category;
          break;
        }
      }
    }
    const p = settings.policies || {};
    const open = TONE_OPEN[settings.tone] || TONE_OPEN.friendly;
    const used = [];
    let body = '';
    let confidence = 0.55;
    let needsHuman = false;
    let reason = '';

    const orders = context?.orders || [];
    const shippedItem = orders.flatMap((o) => o.items).find((it) => it.tracking_no || it.status_code);

    switch (category) {
      case 'shipping':
        if (shippedItem) {
          body = `주문하신 상품(${shippedItem.product_name})은 현재 "${shippedItem.status}" 상태입니다.`;
          if (shippedItem.tracking_no) body += ` ${shippedItem.carrier} 송장번호 ${shippedItem.tracking_no}로 배송 조회가 가능합니다.`;
          used.push(`주문 ${orders[0].order_id} 상태`);
          confidence = 0.92;
        } else if (p.shipping) {
          body = p.shipping;
          used.push('배송 정책');
          confidence = 0.8;
        } else {
          body = '주문번호를 남겨 주시면 배송 상태를 확인해 안내드리겠습니다.';
          confidence = 0.5;
        }
        break;
      case 'exchange_refund':
        if (p.exchange_refund) {
          body = p.exchange_refund;
          used.push('교환/환불 정책');
          confidence = 0.75;
        } else {
          needsHuman = true;
          reason = '교환/환불 정책이 등록되어 있지 않습니다.';
          body = '교환/반품 접수 도와드리겠습니다. 담당자가 확인 후 안내드리겠습니다.';
          confidence = 0.3;
        }
        break;
      case 'stock':
        body = context?.product?.sold_out
          ? `문의하신 상품(${context.product.product_name})은 현재 품절 상태입니다. 재입고 일정이 확정되면 상품 페이지의 재입고 알림을 통해 안내드리겠습니다.`
          : '해당 상품은 현재 구매 가능한 상태입니다.';
        if (context?.product) used.push('상품 판매 상태');
        confidence = context?.product ? 0.7 : 0.4;
        break;
      case 'review_thanks':
        body = `소중한 후기 감사합니다. ${Number(article.rating) >= 4 ? '만족하셨다니 저희도 기쁩니다.' : '불편을 드린 점 죄송합니다. 개선하겠습니다.'}`;
        confidence = 0.85;
        break;
      case 'product_info':
      case 'size_fit':
        if (context?.product?.description_text) {
          body = `문의하신 ${context.product.product_name}에 대해 안내드립니다. 상품 상세 정보를 확인해 보시면 도움이 되실 것 같습니다: ${context.product.description_text.slice(0, 200)}`;
          used.push('상품 상세 설명');
          confidence = 0.6;
        } else {
          needsHuman = true;
          reason = '상품 정보를 확인할 수 없어 담당자 확인이 필요합니다.';
          body = '담당자가 확인 후 정확히 안내드리겠습니다.';
          confidence = 0.35;
        }
        break;
      case 'order_change':
      case 'payment':
        needsHuman = true;
        reason = '주문 변경/결제 관련 처리는 운영자 확인이 필요합니다.';
        body = '요청하신 내용은 담당자가 확인 후 처리해 드리겠습니다.';
        confidence = 0.4;
        break;
      default:
        if (p.faq) {
          body = '문의하신 내용은 담당자가 확인 후 답변드리겠습니다.';
          used.push('FAQ');
        } else {
          body = '문의하신 내용은 담당자가 확인 후 답변드리겠습니다.';
        }
        needsHuman = true;
        reason = '분류되지 않은 문의입니다.';
        confidence = 0.3;
    }

    const reply = [open, '', body, '', closing(settings)].join('\n');
    return {
      draft: {
        category,
        confidence,
        needs_human: needsHuman,
        reason_for_human: reason,
        reply,
        internal_note: '(mock 제공자) 규칙 기반 초안입니다. 운영에서는 AI_PROVIDER=claude를 사용하세요.',
        used_facts: used,
      },
      meta: { provider: 'mock', model: 'rules' },
    };
  }

  return { name: 'mock', model: 'rules', draft };
}
