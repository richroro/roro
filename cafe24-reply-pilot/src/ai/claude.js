import Anthropic from '@anthropic-ai/sdk';
import { DRAFT_JSON_SCHEMA } from './schema.js';

/**
 * Claude 제공자. 구조화 출력(JSON Schema)으로 초안을 받고,
 * 안전 분류기 거절(stop_reason: refusal) 시 서버측 대체 모델로 자동 재시도(fallbacks)한다.
 */
export function createClaudeProvider({ apiKey, model = 'claude-opus-5', effort = 'medium', fallbacks = true, client = null }) {
  const anthropic = client || new Anthropic(apiKey ? { apiKey } : {});

  async function draft({ system, user }) {
    const params = {
      model,
      max_tokens: 4096,
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: user }],
      output_config: {
        effort,
        format: { type: 'json_schema', schema: DRAFT_JSON_SCHEMA },
      },
    };

    const response = fallbacks
      ? await anthropic.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
      : await anthropic.messages.create(params);

    const meta = {
      provider: 'claude',
      model: response.model,
      stop_reason: response.stop_reason,
      usage: response.usage,
    };

    if (response.stop_reason === 'refusal') {
      meta.refusal = response.stop_details || { type: 'refusal' };
      return {
        draft: {
          category: 'other',
          confidence: 0,
          needs_human: true,
          reason_for_human: 'AI가 이 문의에 대한 답변 생성을 거부했습니다. 직접 답변해 주세요.',
          reply: '',
          internal_note: `refusal: ${response.stop_details?.category || ''} ${response.stop_details?.explanation || ''}`.trim(),
          used_facts: [],
        },
        meta,
      };
    }

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      const e = new Error(`AI 응답을 JSON으로 해석할 수 없습니다: ${err.message}`);
      e.raw = text;
      throw e;
    }
    return { draft: parsed, meta };
  }

  return { name: 'claude', model, draft };
}
