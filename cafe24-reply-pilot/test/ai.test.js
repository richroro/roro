import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateDraft, DRAFT_JSON_SCHEMA } from '../src/ai/schema.js';
import { buildSystemPrompt, buildUserPrompt, stripHtml, truncate } from '../src/ai/prompt.js';
import { createMockProvider } from '../src/ai/mock.js';
import { createClaudeProvider } from '../src/ai/claude.js';
import { DEFAULT_SETTINGS } from '../src/db.js';

const settings = { ...DEFAULT_SETTINGS, store_name: '로로', signature: '로로 드림', policies: { ...DEFAULT_SETTINGS.policies, shipping: '오후 2시 이전 결제 시 당일 출고' } };

test('validateDraft는 형식이 맞는 초안을 통과시키고 값을 정규화한다', () => {
  const r = validateDraft({ category: 'shipping', confidence: 0.93, needs_human: false, reason_for_human: '', reply: ' 안녕하세요 ', internal_note: '', used_facts: ['a', 1] });
  assert.equal(r.ok, true);
  assert.equal(r.value.reply, '안녕하세요');
  assert.deepEqual(r.value.used_facts, ['a']);
});

test('validateDraft는 잘못된 필드를 보고한다', () => {
  const r = validateDraft({ category: 'nope', confidence: 3, needs_human: 'yes', reply: '' });
  assert.equal(r.ok, false);
  assert.deepEqual(r.errors.sort(), ['category', 'confidence', 'needs_human', 'reply'].sort());
  assert.equal(r.value.category, 'other');
  assert.equal(r.value.confidence, 1);
});

test('JSON 스키마는 strict 형태(additionalProperties=false, 전체 required)다', () => {
  assert.equal(DRAFT_JSON_SCHEMA.additionalProperties, false);
  assert.deepEqual(DRAFT_JSON_SCHEMA.required.sort(), Object.keys(DRAFT_JSON_SCHEMA.properties).sort());
});

test('stripHtml/truncate', () => {
  assert.equal(stripHtml('<p>안녕<br>하세요</p><script>x()</script>&amp;'), '안녕\n하세요\n&');
  assert.equal(truncate('abcdef', 3), 'abc…(이하 생략)');
});

test('시스템 프롬프트는 정책과 서명을 담고 요청 간 동일하다 (캐시 친화)', () => {
  const a = buildSystemPrompt(settings);
  const b = buildSystemPrompt(settings);
  assert.equal(a, b);
  assert.match(a, /오후 2시 이전 결제 시 당일 출고/);
  assert.match(a, /로로 드림/);
  assert.match(a, /needs_human/);
});

test('사용자 프롬프트는 게시글·상품·주문 근거를 포함한다', () => {
  const article = { board_no: 6, title: '배송 언제 오나요', content: '<p>3일 전 주문</p>', writer: '김민지', member_id: 'm_kim', created_date: '2026-09-17' };
  const context = {
    board: { board_no: 6, board_name: '상품 Q&A', mode: 'reply' },
    product: { product_name: '셔츠', price: '39000', options: ['사이즈: S, M'] },
    orders: [{ order_id: '2026-1', order_date: '2026-09-15', paid: true, canceled: false, items: [{ product_name: '셔츠', option: 'M', quantity: 1, status: '배송중', carrier: 'CJ', tracking_no: '123' }] }],
    order_lookup_used: true,
  };
  const p = buildUserPrompt({ article, context, settings });
  assert.match(p, /상품 Q&A/);
  assert.match(p, /3일 전 주문/);
  assert.match(p, /셔츠/);
  assert.match(p, /배송중 \(CJ 123\)/);
  assert.match(p, /회원 ID: m_kim/);
});

test('mock 제공자는 주문 상태가 있으면 배송 답변에 송장을 넣는다', async () => {
  const provider = createMockProvider();
  const article = { board_no: 6, title: '배송 언제 오나요', content: '언제 도착하나요', member_id: 'm_kim' };
  const context = { board: { mode: 'reply' }, orders: [{ order_id: 'o1', items: [{ product_name: '셔츠', status: '배송중', status_code: 'N30', carrier: 'CJ대한통운', tracking_no: '651' }] }] };
  const { draft } = await provider.draft({ article, context, settings });
  assert.equal(draft.category, 'shipping');
  assert.equal(draft.needs_human, false);
  assert.match(draft.reply, /배송중/);
  assert.match(draft.reply, /651/);
  assert.match(draft.reply, /로로 드림/);
  assert.equal(validateDraft(draft).ok, true);
});

test('mock 제공자는 정책이 없는 교환 문의를 사람 확인으로 돌린다', async () => {
  const provider = createMockProvider();
  const { draft } = await provider.draft({ article: { board_no: 6, title: '교환', content: '불량이라 교환 원해요' }, context: { board: { mode: 'reply' } }, settings: { ...settings, policies: {} } });
  assert.equal(draft.category, 'exchange_refund');
  assert.equal(draft.needs_human, true);
});

test('claude 제공자는 구조화 출력·fallbacks 파라미터로 호출하고 JSON을 돌려준다', async () => {
  let captured;
  const fakeClient = {
    beta: {
      messages: {
        create: async (params) => {
          captured = params;
          return { model: 'claude-opus-5', stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 5 }, content: [{ type: 'text', text: JSON.stringify({ category: 'shipping', confidence: 0.9, needs_human: false, reason_for_human: '', reply: '안녕하세요', internal_note: '', used_facts: [] }) }] };
        },
      },
    },
  };
  const provider = createClaudeProvider({ apiKey: 'k', model: 'claude-opus-5', effort: 'medium', fallbacks: true, client: fakeClient });
  const { draft, meta } = await provider.draft({ system: 'SYS', user: 'USER' });
  assert.equal(draft.category, 'shipping');
  assert.equal(meta.provider, 'claude');
  assert.equal(captured.model, 'claude-opus-5');
  assert.equal(captured.fallbacks, 'default');
  assert.deepEqual(captured.betas, ['server-side-fallback-2026-07-01']);
  assert.equal(captured.output_config.format.type, 'json_schema');
  assert.equal(captured.output_config.effort, 'medium');
  assert.equal(captured.system[0].cache_control.type, 'ephemeral');
});

test('claude 제공자는 refusal을 사람 확인 초안으로 바꾼다', async () => {
  const fakeClient = { messages: { create: async () => ({ model: 'claude-opus-5', stop_reason: 'refusal', stop_details: { type: 'refusal', category: 'x', explanation: 'no' }, content: [], usage: {} }) } };
  const provider = createClaudeProvider({ apiKey: 'k', fallbacks: false, client: fakeClient });
  const { draft, meta } = await provider.draft({ system: 's', user: 'u' });
  assert.equal(draft.needs_human, true);
  assert.equal(meta.refusal.category, 'x');
});
