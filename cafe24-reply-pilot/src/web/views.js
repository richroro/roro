import { CATEGORY_LABELS, DRAFT_CATEGORIES } from '../ai/schema.js';
import { stripHtml, truncate } from '../ai/prompt.js';
import { PLANS } from '../plans.js';

export function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const CSS = `
:root{--bg:#f6f7f9;--card:#fff;--line:#e5e7eb;--text:#111827;--muted:#6b7280;--brand:#2563eb;--ok:#16a34a;--warn:#d97706;--bad:#dc2626}
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Pretendard","Noto Sans KR",sans-serif;background:var(--bg);color:var(--text);font-size:15px;line-height:1.55}
a{color:var(--brand);text-decoration:none}a:hover{text-decoration:underline}
header{background:#fff;border-bottom:1px solid var(--line)}header .in{max-width:1080px;margin:0 auto;padding:12px 20px;display:flex;align-items:center;gap:20px}
header .logo{font-weight:700;font-size:17px;color:var(--text)}header nav a{margin-right:14px;color:var(--muted)}header nav a.on{color:var(--brand);font-weight:600}
header .mall{margin-left:auto;color:var(--muted);font-size:13px}
main{max-width:1080px;margin:0 auto;padding:24px 20px}
h1{font-size:22px;margin:0 0 16px}h2{font-size:17px;margin:24px 0 10px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:18px;margin-bottom:14px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
.stat{padding:14px 16px}.stat .n{font-size:26px;font-weight:700}.stat .l{color:var(--muted);font-size:13px}
.badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;background:#eef2ff;color:#3730a3;margin-right:6px}
.badge.ok{background:#dcfce7;color:#166534}.badge.warn{background:#fef3c7;color:#92400e}.badge.bad{background:#fee2e2;color:#991b1b}.badge.gray{background:#f3f4f6;color:#374151}
.muted{color:var(--muted);font-size:13px}
.btn{display:inline-block;border:1px solid var(--line);background:#fff;color:var(--text);padding:7px 14px;border-radius:8px;font-size:14px;cursor:pointer}
.btn.primary{background:var(--brand);border-color:var(--brand);color:#fff}.btn.danger{color:var(--bad)}.btn:disabled{opacity:.5;cursor:not-allowed}
form.inline{display:inline}
textarea,input[type=text],input[type=number],select{width:100%;border:1px solid var(--line);border-radius:8px;padding:9px 10px;font:inherit;background:#fff}
textarea{min-height:120px;resize:vertical}
label{display:block;font-weight:600;margin:12px 0 6px;font-size:14px}label.check{display:flex;align-items:center;gap:8px;font-weight:500}
.row{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media(max-width:720px){.row{grid-template-columns:1fr}}
.flash{background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;padding:10px 14px;border-radius:8px;margin-bottom:14px}
.flash.err{background:#fef2f2;border-color:#fecaca;color:#991b1b}
.article{background:#f9fafb;border:1px solid var(--line);border-radius:8px;padding:12px 14px;white-space:pre-wrap;font-size:14px}
.conf{height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;margin:6px 0}.conf i{display:block;height:100%;background:var(--ok)}
.tabs a{display:inline-block;padding:6px 12px;border-radius:8px;margin-right:6px;color:var(--muted)}.tabs a.on{background:#fff;border:1px solid var(--line);color:var(--text);font-weight:600}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:8px 6px;border-bottom:1px solid var(--line)}th{color:var(--muted);font-weight:600;font-size:13px}
details summary{cursor:pointer;color:var(--muted);font-size:13px}
.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.chips span{display:inline-block;background:#f3f4f6;border-radius:6px;padding:2px 8px;font-size:12px;margin:2px 4px 2px 0}
`;

export function layout({ title, body, session = null, active = '', flash = null, flashType = 'ok' }) {
  const nav = session
    ? `<nav>
        <a href="/dashboard" class="${active === 'dashboard' ? 'on' : ''}">대시보드</a>
        <a href="/inbox" class="${active === 'inbox' ? 'on' : ''}">답변 대기함</a>
        <a href="/settings" class="${active === 'settings' ? 'on' : ''}">설정</a>
        <a href="/billing" class="${active === 'billing' ? 'on' : ''}">요금제</a>
      </nav><span class="mall">${esc(session.mall_id)}${session.user_name ? ` · ${esc(session.user_name)}` : ''}</span>`
    : '';
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · AI 답변 도우미</title><style>${CSS}</style></head><body>
<header><div class="in"><a class="logo" href="/">AI 답변 도우미</a>${nav}</div></header>
<main>${flash ? `<div class="flash ${flashType === 'err' ? 'err' : ''}">${esc(flash)}</div>` : ''}${body}</main>
</body></html>`;
}

export function homePage() {
  return layout({
    title: '소개',
    body: `<h1>AI 답변 도우미</h1>
<div class="card"><p>카페24 쇼핑몰의 <b>상품문의·후기·1:1 게시판</b>에 올라온 글을 모아, 매장 정책과 상품·주문 정보를 근거로 답변 초안을 만들어 드립니다. 운영자가 확인하고 버튼 한 번으로 게시하세요.</p>
<p class="muted">이 페이지는 카페24 관리자 &gt; 앱 &gt; AI 답변 도우미 에서 실행했을 때 동작합니다. 직접 접속하면 로그인 세션이 없어 기능을 사용할 수 없습니다.</p></div>`,
  });
}

export function notInstalledPage() {
  return layout({
    title: '세션 없음',
    body: `<h1>카페24 관리자에서 앱을 실행해 주세요</h1><div class="card"><p>세션이 없거나 만료되었습니다. 카페24 쇼핑몰 관리자 &gt; 앱 &gt; 마이앱에서 <b>AI 답변 도우미</b>를 다시 실행하면 자동으로 로그인됩니다.</p></div>`,
  });
}

export function errorPage({ title, message }) {
  return layout({ title, body: `<h1>${esc(title)}</h1><div class="card"><p class="muted">${esc(message || '')}</p><p><a href="/dashboard">대시보드로</a></p></div>` });
}

function confidenceClass(c) {
  if (c >= 0.85) return 'ok';
  if (c >= 0.6) return 'warn';
  return 'bad';
}

function fmtTime(sec) {
  if (!sec) return '';
  return new Date(sec * 1000).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });
}

export function dashboardPage({ session, settings, counts, events, quota, provider }) {
  const eventRows = events
    .map((e) => `<tr><td class="muted">${esc(fmtTime(e.created_at))}</td><td>${esc(e.type)}</td><td class="muted">${esc(truncate(e.detail || '', 120))}</td></tr>`)
    .join('');
  const boards = settings.boards.filter((b) => b.enabled);
  return layout({
    title: '대시보드',
    session,
    active: 'dashboard',
    body: `<h1>대시보드</h1>
<div class="grid">
  <div class="card stat"><div class="n">${counts.pending}</div><div class="l">답변 대기</div></div>
  <div class="card stat"><div class="n">${counts.published}</div><div class="l">게시 완료</div></div>
  <div class="card stat"><div class="n">${quota.used} / ${quota.limit}</div><div class="l">이번 달 초안 생성 (${esc(quota.plan.name)})</div></div>
  <div class="card stat"><div class="n">${boards.length}</div><div class="l">연결된 게시판</div></div>
</div>
<div class="card">
  <b>연결 상태</b> · AI: <span class="badge ${provider.name === 'claude' ? 'ok' : 'warn'}">${esc(provider.name)} ${esc(provider.model)}</span>
  ${boards.length ? boards.map((b) => `<span class="badge gray">${esc(b.board_name)} · ${b.mode === 'comment' ? '댓글' : '답변글'}</span>`).join('') : '<span class="badge bad">게시판 미설정</span>'}
  ${settings.auto_publish?.enabled ? `<span class="badge ok">자동 게시 ON (≥${settings.auto_publish.min_confidence})</span>` : '<span class="badge gray">자동 게시 OFF</span>'}
  <div class="actions"><a class="btn primary" href="/inbox">답변 대기함 열기</a><a class="btn" href="/settings">설정</a></div>
</div>
<h2>최근 활동</h2>
<div class="card"><table><thead><tr><th>시각</th><th>이벤트</th><th>내용</th></tr></thead><tbody>${eventRows || '<tr><td colspan="3" class="muted">아직 활동이 없습니다.</td></tr>'}</tbody></table></div>`,
  });
}

function draftCard(d, { csrf, settings }) {
  const a = d.article;
  const board = settings.boards.find((b) => Number(b.board_no) === Number(d.board_no));
  const draft = d.draft;
  const ctx = d.context;
  const conf = draft ? Number(draft.confidence) : 0;
  const head = `<div><span class="badge gray">${esc(board?.board_name || `게시판 #${d.board_no}`)}</span>
    ${draft ? `<span class="badge">${esc(CATEGORY_LABELS[draft.category] || draft.category)}</span>` : ''}
    ${draft?.needs_human ? '<span class="badge bad">사람 확인 필요</span>' : ''}
    ${d.status === 'published' ? '<span class="badge ok">게시 완료</span>' : ''}
    ${d.status === 'failed' ? '<span class="badge bad">게시 실패</span>' : ''}
    ${d.status === 'skipped' ? '<span class="badge gray">건너뜀</span>' : ''}
    </div>
    <h3 style="margin:8px 0 2px">${esc(a.title || '(제목 없음)')}</h3>
    <div class="muted">${esc(a.writer || a.member_id || '비회원')}${a.member_id ? ` (${esc(a.member_id)})` : ''} · ${esc(String(a.created_date || '').replace('T', ' ').slice(0, 16))}${a.rating ? ` · 평점 ${a.rating}/5` : ''}${a.secret === 'T' ? ' · 비밀글' : ''}</div>`;

  const body = `<div class="article" style="margin-top:10px">${esc(truncate(stripHtml(a.content || ''), 800))}</div>`;

  const ctxHtml = ctx
    ? `<details style="margin-top:8px"><summary>근거 정보 (상품 ${ctx.product ? 1 : 0}, 주문 ${ctx.orders?.length || 0})</summary>
        ${ctx.product ? `<p><b>상품</b> ${esc(ctx.product.product_name)} · ${esc(ctx.product.price || '')}원 ${ctx.product.sold_out ? '<span class="badge bad">품절</span>' : ''}</p>` : ''}
        ${(ctx.orders || []).map((o) => `<p><b>주문 ${esc(o.order_id)}</b> (${esc(o.order_date)})<br>${o.items.map((it) => `${esc(it.product_name)}${it.option ? ` / ${esc(it.option)}` : ''} × ${it.quantity} — <b>${esc(it.status)}</b>${it.tracking_no ? ` (${esc(it.carrier)} ${esc(it.tracking_no)})` : ''}`).join('<br>')}</p>`).join('')}
        ${ctx.warnings?.length ? `<p class="muted">${esc(ctx.warnings.join(' / '))}</p>` : ''}
      </details>`
    : '';

  let draftHtml = '';
  if (draft) {
    draftHtml = `<div style="margin-top:12px">
      <div class="muted">확신도 ${(conf * 100).toFixed(0)}%</div><div class="conf"><i style="width:${Math.round(conf * 100)}%;background:${confidenceClass(conf) === 'ok' ? 'var(--ok)' : confidenceClass(conf) === 'warn' ? 'var(--warn)' : 'var(--bad)'}"></i></div>
      ${draft.needs_human && draft.reason_for_human ? `<div class="flash err">${esc(draft.reason_for_human)}</div>` : ''}
      ${draft.internal_note ? `<p class="muted">메모: ${esc(draft.internal_note)}</p>` : ''}
      ${draft.used_facts?.length ? `<div class="chips">${draft.used_facts.map((f) => `<span>${esc(f)}</span>`).join('')}</div>` : ''}
    </div>`;
  } else if (d.error) {
    draftHtml = `<div class="flash err" style="margin-top:10px">초안 생성 실패: ${esc(d.error)}</div>`;
  } else {
    draftHtml = `<p class="muted" style="margin-top:10px">초안이 아직 생성되지 않았습니다.</p>`;
  }

  let actions = '';
  if (d.status === 'pending' || d.status === 'failed') {
    actions = `<form method="post" action="/drafts/${d.id}/publish">
      <input type="hidden" name="_csrf" value="${csrf}">
      <label>답변 내용 (수정 후 게시)</label>
      <textarea name="reply_text" required>${esc(d.reply_text || draft?.reply || '')}</textarea>
      <div class="actions">
        <button class="btn primary" type="submit">${board?.mode === 'comment' ? '댓글로 게시' : '답변글로 게시'}</button>
        <button class="btn" type="submit" formaction="/drafts/${d.id}/regenerate">다시 생성</button>
        <button class="btn danger" type="submit" formaction="/drafts/${d.id}/skip">건너뛰기</button>
      </div>
      ${d.status === 'failed' && d.error ? `<p class="muted">마지막 오류: ${esc(d.error)}</p>` : ''}
    </form>`;
  } else if (d.status === 'published') {
    actions = `<div class="article" style="margin-top:10px">${esc(d.reply_text || '')}</div><p class="muted">게시: ${esc(fmtTime(d.published_at))} · ${esc(d.published_ref || '')}</p>`;
  } else if (d.status === 'skipped') {
    actions = `<form method="post" action="/drafts/${d.id}/reopen" class="inline"><input type="hidden" name="_csrf" value="${csrf}"><button class="btn" type="submit">다시 대기함으로</button></form>`;
  }

  return `<div class="card" id="draft-${d.id}">${head}${body}${ctxHtml}${draftHtml}${actions}</div>`;
}

export function inboxPage({ session, drafts, status, csrf, settings, flash, flashType }) {
  const tabs = [
    ['pending', '대기'],
    ['published', '게시됨'],
    ['failed', '실패'],
    ['skipped', '건너뜀'],
  ]
    .map(([k, l]) => `<a href="/inbox?status=${k}" class="${status === k ? 'on' : ''}">${l}</a>`)
    .join('');
  return layout({
    title: '답변 대기함',
    session,
    active: 'inbox',
    flash,
    flashType,
    body: `<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><h1 style="margin:0">답변 대기함</h1>
      <form method="post" action="/inbox/sync" class="inline"><input type="hidden" name="_csrf" value="${csrf}"><button class="btn" type="submit">지금 동기화</button></form></div>
      <div class="tabs" style="margin:14px 0">${tabs}</div>
      ${drafts.length ? drafts.map((d) => draftCard(d, { csrf, settings })).join('') : `<div class="card muted">표시할 글이 없습니다. ${status === 'pending' ? '"지금 동기화"를 눌러 게시판의 미답변 글을 불러오세요.' : ''}</div>`}`,
  });
}

export function settingsPage({ session, settings, csrf, flash, flashType, welcome }) {
  const tones = [
    ['friendly', '친근한 존댓말'],
    ['formal', '격식 있는 비즈니스체'],
    ['concise', '간결하게 핵심만'],
  ];
  const boardsRows = settings.boards.length
    ? settings.boards
        .map(
          (b) => `<tr>
        <td><label class="check" style="margin:0"><input type="checkbox" name="board_enabled_${b.board_no}" ${b.enabled ? 'checked' : ''}> ${esc(b.board_name)} <span class="muted">#${b.board_no}</span></label></td>
        <td><select name="board_mode_${b.board_no}"><option value="reply" ${b.mode !== 'comment' ? 'selected' : ''}>답변글로 등록</option><option value="comment" ${b.mode === 'comment' ? 'selected' : ''}>댓글로 등록</option></select></td>
      </tr>`,
        )
        .join('')
    : '<tr><td colspan="2" class="muted">게시판 목록이 없습니다. "게시판 불러오기"를 눌러 주세요.</td></tr>';
  const cats = DRAFT_CATEGORIES.map(
    (c) => `<label class="check"><input type="checkbox" name="auto_categories" value="${c}" ${(settings.auto_publish.categories || []).includes(c) ? 'checked' : ''}> ${esc(CATEGORY_LABELS[c])}</label>`,
  ).join('');

  return layout({
    title: '설정',
    session,
    active: 'settings',
    flash,
    flashType,
    body: `<h1>설정</h1>
${welcome ? `<div class="card"><b>설치를 환영합니다!</b> 아래 3가지만 채우면 바로 시작할 수 있습니다: ① 답변할 게시판 선택 ② 배송/교환 정책 입력 ③ 저장. 이후 "답변 대기함"에서 첫 초안을 확인하세요.</div>` : ''}
<form method="post" action="/settings">
<input type="hidden" name="_csrf" value="${csrf}">
<div class="card">
  <h2 style="margin-top:0">기본</h2>
  <div class="row">
    <div><label>쇼핑몰 이름</label><input type="text" name="store_name" value="${esc(settings.store_name)}" placeholder="예: 로로 스토어"></div>
    <div><label>답변 작성자명</label><input type="text" name="writer_name" value="${esc(settings.writer_name)}"></div>
  </div>
  <div class="row">
    <div><label>말투</label><select name="tone">${tones.map(([v, l]) => `<option value="${v}" ${settings.tone === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div><label>답변글 제목 접두어</label><input type="text" name="reply_title_prefix" value="${esc(settings.reply_title_prefix)}"></div>
  </div>
  <label>서명 (답변 마지막에 붙습니다)</label><input type="text" name="signature" value="${esc(settings.signature)}" placeholder="예: 로로 스토어 고객센터 드림">
</div>

<div class="card">
  <h2 style="margin-top:0">답변할 게시판</h2>
  <table><thead><tr><th>게시판</th><th>답변 방식</th></tr></thead><tbody>${boardsRows}</tbody></table>
  <p class="muted">상품 Q&amp;A·1:1 문의는 보통 "답변글", 상품 후기는 "댓글"이 자연스럽습니다. 게시판에 답변 기능이 없으면 댓글을 선택하세요.</p>
  <button class="btn" type="submit" formaction="/settings/boards/refresh">카페24에서 게시판 불러오기</button>
</div>

<div class="card">
  <h2 style="margin-top:0">매장 정책 (AI가 답변 근거로 사용)</h2>
  <label>배송 정책</label><textarea name="policy_shipping" placeholder="예: 오후 2시 이전 결제 시 당일 출고, CJ대한통운, 평균 1~2일 소요. 제주/도서산간 추가 3,000원.">${esc(settings.policies.shipping)}</textarea>
  <label>교환/반품/환불 정책</label><textarea name="policy_exchange_refund" placeholder="예: 수령 후 7일 이내, 미착용·택 미제거 시 교환/반품 가능. 단순 변심 반품 배송비 6,000원 고객 부담. 불량은 무료.">${esc(settings.policies.exchange_refund)}</textarea>
  <label>고객센터 운영시간</label><textarea name="policy_hours" style="min-height:60px" placeholder="예: 평일 10:00~17:00 (점심 12~13시), 주말·공휴일 휴무">${esc(settings.policies.hours)}</textarea>
  <label>자주 묻는 질문과 답 (자유 형식)</label><textarea name="policy_faq" placeholder="Q: 선물 포장 되나요? A: 네, 주문 시 요청사항에 적어 주시면 무료로 해드립니다.">${esc(settings.policies.faq)}</textarea>
</div>

<div class="card">
  <h2 style="margin-top:0">주문 연동</h2>
  <label class="check"><input type="checkbox" name="order_lookup" ${settings.order_lookup ? 'checked' : ''}> 회원 문의 시 최근 90일 주문·배송 상태를 조회해 답변에 반영 (mall.read_order 권한 필요)</label>
  <p class="muted">글 작성자 본인의 주문만 조회하며, 주소·연락처·결제수단은 AI에 전달하지 않습니다.</p>
</div>

<div class="card">
  <h2 style="margin-top:0">자동 게시 (프로 요금제)</h2>
  <label class="check"><input type="checkbox" name="auto_publish_enabled" ${settings.auto_publish.enabled ? 'checked' : ''}> 아래 조건을 모두 만족하는 초안은 운영자 승인 없이 자동 게시</label>
  <div class="row">
    <div><label>최소 확신도 (0~1)</label><input type="number" step="0.05" min="0" max="1" name="auto_min_confidence" value="${esc(String(settings.auto_publish.min_confidence))}"></div>
    <div><label>허용 카테고리</label>${cats}</div>
  </div>
  <p class="muted">"사람 확인 필요"로 표시된 초안은 조건과 무관하게 자동 게시되지 않습니다.</p>
</div>

<div class="actions"><button class="btn primary" type="submit">저장</button><a class="btn" href="/dashboard">취소</a></div>
</form>`,
  });
}

export function billingPage({ session, settings, quota, csrf, flash, flashType }) {
  const cards = Object.entries(PLANS)
    .map(
      ([key, p]) => `<div class="card">
      <h2 style="margin-top:0">${esc(p.name)} ${settings.plan === key || (!settings.plan && key === 'free') ? '<span class="badge ok">사용 중</span>' : ''}</h2>
      <div style="font-size:22px;font-weight:700">${p.price ? `₩${p.price.toLocaleString('ko-KR')} <span class="muted" style="font-size:13px;font-weight:400">/ 월</span>` : '무료'}</div>
      <p class="muted">${esc(p.description)}</p>
      ${p.price && settings.plan !== key ? `<form method="post" action="/billing/checkout"><input type="hidden" name="_csrf" value="${csrf}"><input type="hidden" name="plan" value="${key}"><button class="btn primary" type="submit">이 요금제로 결제</button></form>` : ''}
    </div>`,
    )
    .join('');
  return layout({
    title: '요금제',
    session,
    active: 'billing',
    flash,
    flashType,
    body: `<h1>요금제</h1><div class="card">이번 달 사용량: <b>${quota.used}</b> / ${quota.limit}건 (${esc(quota.plan.name)})</div><div class="grid">${cards}</div>
    <p class="muted">결제는 카페24 앱스토어 결제창(과금 API)을 통해 진행되며, 결제 완료 후 이 화면으로 돌아옵니다.</p>`,
  });
}
