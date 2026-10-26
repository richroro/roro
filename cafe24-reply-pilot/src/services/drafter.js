import { buildSystemPrompt, buildUserPrompt } from '../ai/prompt.js';
import { validateDraft } from '../ai/schema.js';

/** 게시글 + 근거 → 검증된 초안 */
export async function generateDraft({ provider, settings, article, context }) {
  const system = buildSystemPrompt(settings);
  const user = buildUserPrompt({ article, context, settings });
  const { draft, meta } = await provider.draft({ system, user, article, context, settings });
  const { ok, errors, value } = validateDraft(draft);
  if (!ok) {
    // 형식이 어긋나도 답변 본문이 있으면 사람 검토용으로 남기고, 본문마저 없으면 실패 처리
    if (!value.reply) {
      const e = new Error(`AI 초안 형식 오류: ${errors.join(', ')}`);
      e.meta = meta;
      throw e;
    }
    value.needs_human = true;
    value.reason_for_human = value.reason_for_human || `초안 형식 오류(${errors.join(', ')})로 확인이 필요합니다.`;
  }
  return { draft: value, meta };
}

/** 자동 게시 조건: 설정 on + 사람 검토 불필요 + 확신도 임계값 + 허용 카테고리 */
export function shouldAutoPublish(draft, settings) {
  const ap = settings.auto_publish || {};
  if (!ap.enabled) return false;
  if (!draft || draft.needs_human) return false;
  if (!draft.reply) return false;
  if (Number(draft.confidence) < Number(ap.min_confidence ?? 0.9)) return false;
  const allowed = Array.isArray(ap.categories) ? ap.categories : [];
  return allowed.length === 0 || allowed.includes(draft.category);
}
