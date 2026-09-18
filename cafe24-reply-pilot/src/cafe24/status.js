/** 카페24 주문 품목 상태 코드 → 고객에게 보여줄 한국어 */
export const ORDER_STATUS_TEXT = {
  N00: '입금 전',
  N10: '상품 준비중',
  N20: '배송 준비중',
  N21: '배송 대기',
  N22: '배송 보류',
  N30: '배송중',
  N40: '배송 완료',
  N50: '구매 확정',
  C00: '취소 신청',
  C10: '취소 접수',
  C40: '취소 완료',
  R00: '반품 신청',
  R10: '반품 접수',
  R40: '반품 완료',
  E00: '교환 신청',
  E10: '교환 접수',
  E40: '교환 완료',
};

export function orderStatusText(code) {
  if (!code) return '처리중';
  if (ORDER_STATUS_TEXT[code]) return ORDER_STATUS_TEXT[code];
  const head = String(code)[0];
  if (head === 'C') return '취소 처리중';
  if (head === 'R') return '반품 처리중';
  if (head === 'E') return '교환 처리중';
  return '처리중';
}

/**
 * 주문 목록 응답(embed=items)을 AI 프롬프트·화면용 요약으로 축약.
 * 개인정보 최소화: 주소·연락처·결제수단은 포함하지 않는다.
 */
export function summarizeOrders(orders = [], { memberId } = {}) {
  return orders
    .filter((o) => !memberId || o.member_id === memberId)
    .map((o) => ({
      order_id: o.order_id,
      order_date: String(o.order_date || '').slice(0, 10),
      paid: o.paid === 'T',
      canceled: o.canceled === 'T',
      items: (o.items || []).map((it) => ({
        product_no: it.product_no,
        product_name: it.product_name,
        option: it.option_value || '',
        quantity: it.quantity,
        status_code: it.order_status,
        status: orderStatusText(it.order_status),
        carrier: it.shipping_company_name || '',
        tracking_no: it.shipping_code || '',
      })),
    }));
}
