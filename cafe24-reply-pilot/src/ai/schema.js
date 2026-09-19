/** 답변 초안의 구조. Claude 구조화 출력(JSON Schema)과 mock 제공자가 공통으로 따른다. */
export const DRAFT_CATEGORIES = [
  'shipping', // 배송 일정/조회
  'stock', // 재입고/품절
  'product_info', // 상품 사양·사용법·성분 등
  'size_fit', // 사이즈/핏
  'exchange_refund', // 교환/반품/환불
  'order_change', // 주문 취소/변경/옵션 변경
  'payment', // 결제/입금/영수증
  'review_thanks', // 후기 감사 답글
  'complaint', // 불만/클레임
  'other',
];

export const CATEGORY_LABELS = {
  shipping: '배송',
  stock: '재입고/품절',
  product_info: '상품 정보',
  size_fit: '사이즈',
  exchange_refund: '교환/환불',
  order_change: '주문 변경',
  payment: '결제',
  review_thanks: '후기 답글',
  complaint: '클레임',
  other: '기타',
};

export const DRAFT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['category', 'confidence', 'needs_human', 'reason_for_human', 'reply', 'internal_note', 'used_facts'],
  properties: {
    category: { type: 'string', enum: DRAFT_CATEGORIES },
    confidence: { type: 'number', minimum: 0, maximum: 1, description: '답변을 그대로 게시해도 될 확신도' },
    needs_human: { type: 'boolean', description: '정책에 없는 약속·보상·법적 이슈 등 사람이 봐야 하면 true' },
    reason_for_human: { type: 'string', description: 'needs_human이 true인 이유. 아니면 빈 문자열' },
    reply: { type: 'string', description: '고객에게 게시할 답변 본문(한국어, 존댓말)' },
    internal_note: { type: 'string', description: '운영자에게만 보이는 메모(확인 필요 사항 등)' },
    used_facts: { type: 'array', items: { type: 'string' }, description: '답변에 사용한 근거(정책/상품/주문 항목)' },
  },
};

/** 최소 검증기: 필수 필드·타입·범위. (외부 스키마 라이브러리 없이 동작) */
export function validateDraft(input) {
  const errors = [];
  const d = input && typeof input === 'object' ? input : {};
  const value = {};

  if (!DRAFT_CATEGORIES.includes(d.category)) errors.push('category');
  value.category = DRAFT_CATEGORIES.includes(d.category) ? d.category : 'other';

  const c = Number(d.confidence);
  if (!Number.isFinite(c) || c < 0 || c > 1) errors.push('confidence');
  value.confidence = Number.isFinite(c) ? Math.min(1, Math.max(0, c)) : 0;

  if (typeof d.needs_human !== 'boolean') errors.push('needs_human');
  value.needs_human = d.needs_human === true;

  value.reason_for_human = typeof d.reason_for_human === 'string' ? d.reason_for_human : '';

  if (typeof d.reply !== 'string' || d.reply.trim().length === 0) errors.push('reply');
  value.reply = typeof d.reply === 'string' ? d.reply.trim() : '';

  value.internal_note = typeof d.internal_note === 'string' ? d.internal_note : '';
  value.used_facts = Array.isArray(d.used_facts) ? d.used_facts.filter((x) => typeof x === 'string') : [];

  return { ok: errors.length === 0, errors, value };
}
