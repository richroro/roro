/** 앱스토어 판매용 요금제. 금액은 KRW, 한도는 월간 AI 초안 생성 건수. */
export const PLANS = {
  free: { name: '무료', price: 0, monthly_drafts: 30, auto_publish: false, description: '월 30건 초안, 수동 승인 게시' },
  starter: { name: '스타터', price: 29000, monthly_drafts: 300, auto_publish: false, description: '월 300건 초안, 주문 연동 답변' },
  pro: { name: '프로', price: 89000, monthly_drafts: 1000, auto_publish: true, description: '월 1,000건 초안, 조건부 자동 게시, 웹훅 실시간 처리' },
};

export function getPlan(settings) {
  return PLANS[settings?.plan] || PLANS.free;
}

/** 이번 달 남은 초안 생성 한도 */
export function remainingQuota(db, mallId, settings) {
  const plan = getPlan(settings);
  const used = db.countGeneratedThisMonth(mallId);
  return { plan, used, limit: plan.monthly_drafts, remaining: Math.max(0, plan.monthly_drafts - used) };
}
