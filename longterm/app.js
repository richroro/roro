/* 장기투자 노트 — data.json을 읽어 화면을 그린다.
   외부 라이브러리 없이 동작하며, 차트는 인라인 SVG로 직접 그린다. */

const GROUP_LABEL = { index: "지수", etf: "ETF", us: "미국", kr: "국내" };
const CHECK_KEY = "longterm.checklist";

let DATA = { items: [], news: [] };
let filterGroup = "all";
let searchTerm = "";
let sortKey = "c10";
let sortAsc = false;
let openSymbol = null;

/* ---------------------------------------------------------------- 포맷 */
const fmtNum = (value, digits = 0) =>
  value === null || value === undefined || Number.isNaN(value)
    ? "-"
    : value.toLocaleString("ko-KR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

function fmtPrice(value, currency) {
  if (value === null || value === undefined) return "-";
  if (currency === "KRW") return fmtNum(Math.round(value)) + "원";
  if (currency === "JPY") return "¥" + fmtNum(Math.round(value));
  if (currency === "USD") return "$" + fmtNum(value, 2);
  return fmtNum(value, 2);
}

function fmtPct(value, digits = 1) {
  if (value === null || value === undefined) return '<span class="muted">-</span>';
  const cls = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const sign = value > 0 ? "+" : "";
  return `<span class="${cls}">${sign}${value.toFixed(digits)}%</span>`;
}

function fmtPlain(value, digits = 1, suffix = "") {
  if (value === null || value === undefined) return '<span class="muted">-</span>';
  return value.toFixed(digits) + suffix;
}

function fmtCap(value, currency) {
  if (!value) return null;
  if (currency === "KRW" || currency === "JPY") {
    if (value >= 1e12) return (value / 1e12).toFixed(1) + "조";
    return (value / 1e8).toFixed(0) + "억";
  }
  if (value >= 1e12) return "$" + (value / 1e12).toFixed(2) + "T";
  if (value >= 1e9) return "$" + (value / 1e9).toFixed(1) + "B";
  return "$" + (value / 1e6).toFixed(0) + "M";
}

/* ---------------------------------------------------------------- 스파크라인 */
function sparkSvg(values, width, height, forceColor) {
  if (!values || values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = width / (values.length - 1);
  const points = values.map((v, i) => {
    const x = (i * stepX).toFixed(1);
    const y = (height - ((v - min) / span) * (height - 2) - 1).toFixed(1);
    return `${x},${y}`;
  });
  const rising = values[values.length - 1] >= values[0];
  const color = forceColor || (rising ? "var(--up)" : "var(--down)");
  const area = `0,${height} ${points.join(" ")} ${width},${height}`;
  const id = "g" + Math.random().toString(36).slice(2, 8);
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </linearGradient></defs>
    <polygon points="${area}" fill="url(#${id})"/>
    <polyline points="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="1.5"
      stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  </svg>`;
}

/* ---------------------------------------------------------------- 기준선 카드 */
function renderIndices() {
  const grid = document.getElementById("indexGrid");
  const items = DATA.items.filter((it) => it.group === "index");
  if (!items.length) {
    grid.innerHTML = '<p class="empty">지수 데이터를 불러오지 못했습니다.</p>';
    return;
  }
  grid.innerHTML = items
    .map(
      (it) => `<div class="index-card">
      <div class="ic-name"><span>${it.name}</span>${fmtPct(it.changePercent, 2)}</div>
      <div class="ic-price">${fmtPrice(it.price, it.currency)}</div>
      <div class="ic-spark">${sparkSvg(it.spark, 200, 40)}</div>
      <div class="ic-cagr">
        <div>10년 누적<b>${it.returns["10y"] === null ? "-" : fmtPct(it.returns["10y"], 0)}</b></div>
        <div>연평균<b>${it.cagr["10y"] === null ? "-" : fmtPct(it.cagr["10y"], 1)}</b></div>
        <div>최대낙폭<b>${fmtPct(it.mdd10y, 0)}</b></div>
      </div>
    </div>`
    )
    .join("");
}

/* ---------------------------------------------------------------- 스크리너 */
const SORT_VALUE = {
  name: (it) => it.name,
  price: (it) => it.changePercent,
  r1: (it) => it.returns["1y"],
  c3: (it) => it.cagr["3y"],
  c5: (it) => it.cagr["5y"],
  c10: (it) => it.cagr["10y"],
  dy: (it) => it.dividendYield,
  per: (it) => it.valuation.per ?? it.valuation.forwardPer,
  roe: (it) => it.valuation.roe,
  fromHigh: (it) => it.fromHigh,
  mdd: (it) => it.mdd10y,
};

function visibleItems() {
  const term = searchTerm.trim().toLowerCase();
  return DATA.items
    .filter((it) => filterGroup === "all" || it.group === filterGroup)
    .filter(
      (it) =>
        !term ||
        it.name.toLowerCase().includes(term) ||
        it.symbol.toLowerCase().includes(term) ||
        it.tag.toLowerCase().includes(term)
    )
    .sort((a, b) => {
      const va = SORT_VALUE[sortKey](a);
      const vb = SORT_VALUE[sortKey](b);
      // 값이 없는 항목은 정렬 방향과 관계없이 항상 뒤로 보낸다
      if (va === null || va === undefined) return vb === null || vb === undefined ? 0 : 1;
      if (vb === null || vb === undefined) return -1;
      if (typeof va === "string") return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });
}

function detailHtml(it) {
  const v = it.valuation;
  const metrics = [
    ["PER", v.per !== undefined ? v.per.toFixed(1) : v.forwardPer !== undefined ? v.forwardPer.toFixed(1) + " (선행)" : null],
    ["PBR", v.pbr !== undefined ? v.pbr.toFixed(2) : null],
    ["PSR", v.psr !== undefined ? v.psr.toFixed(2) : null],
    ["ROE", v.roe !== undefined ? v.roe.toFixed(1) + "%" : null],
    ["순이익률", v.margin !== undefined ? v.margin.toFixed(1) + "%" : null],
    ["배당성향", v.payout !== undefined ? v.payout.toFixed(0) + "%" : null],
    ["5년 평균 배당률", v.avgYield5y !== undefined ? v.avgYield5y.toFixed(2) + "%" : null],
    ["베타", v.beta !== undefined ? v.beta.toFixed(2) : null],
    ["시가총액", fmtCap(v.marketCap, it.currency)],
    ["1년 수익률", it.returns["1y"] !== null ? it.returns["1y"].toFixed(1) + "%" : null],
    ["5년 누적", it.returns["5y"] !== null ? it.returns["5y"].toFixed(1) + "%" : null],
    ["10년 누적", it.returns["10y"] !== null ? it.returns["10y"].toFixed(1) + "%" : null],
  ]
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([label, value]) => `<div class="metric"><span>${label}</span><b>${value}</b></div>`)
    .join("");

  const w = it.week52;
  const rangeBar =
    w && w.position !== null && w.position !== undefined
      ? `<div class="range-bar"><i style="left:${Math.min(100, Math.max(0, w.position))}%"></i></div>
         <div class="range-label"><span>52주 최저 ${fmtPrice(w.low, it.currency)}</span>
         <span>최고 ${fmtPrice(w.high, it.currency)}</span></div>`
      : "";

  let divBlock = '<p class="muted" style="font-size:.82rem">배당 이력이 없습니다.</p>';
  if (it.dividend && it.dividend.history && it.dividend.history.length > 1) {
    const history = it.dividend.history.slice(-10);
    const max = Math.max(...history.map((h) => h.amount)) || 1;
    divBlock = `
      <div class="div-bars">${history
        .map((h) => `<div style="height:${Math.max(2, (h.amount / max) * 100)}%" title="${h.year}년 ${fmtNum(h.amount, it.currency === "KRW" ? 0 : 2)}"></div>`)
        .join("")}</div>
      <div class="div-years">${history.map((h) => `<span>${String(h.year).slice(2)}</span>`).join("")}</div>
      <div class="range-label" style="margin-top:8px">
        <span>최근 1년 배당 ${fmtPrice(it.dividend.ttm, it.currency)}</span>
        <span>5년 배당성장 ${it.dividend.growth5y === null ? "-" : it.dividend.growth5y.toFixed(1) + "%/년"}</span>
      </div>`;
  }

  const isKr = it.symbol.endsWith(".KS");
  const code = it.symbol.replace(".KS", "");
  const links = [
    `<a href="https://finance.yahoo.com/quote/${encodeURIComponent(it.symbol)}" target="_blank" rel="noopener">Yahoo Finance</a>`,
  ];
  if (isKr) {
    links.push(`<a href="https://finance.naver.com/item/main.naver?code=${code}" target="_blank" rel="noopener">네이버 증권</a>`);
    links.push(`<a href="https://dart.fss.or.kr/dsab007/main.do?textCrpNm=${encodeURIComponent(it.name)}" target="_blank" rel="noopener">DART 공시</a>`);
  } else if (it.group === "us") {
    links.push(`<a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&ticker=${encodeURIComponent(it.symbol)}&type=10-K" target="_blank" rel="noopener">SEC 10-K</a>`);
  }

  return `<tr class="detail-row" data-detail="${it.symbol}"><td colspan="12"><div class="detail-inner">
    <div class="detail-block">
      <h4>10년 주가 흐름 · 52주 위치</h4>
      ${sparkSvg(it.spark, 400, 90)}
      ${rangeBar}
      <div class="metric-grid" style="margin-top:14px">${metrics}</div>
      <div class="detail-links">${links.join("")}</div>
    </div>
    <div class="detail-block">
      <h4>연도별 배당금</h4>
      ${divBlock}
    </div>
  </div></td></tr>`;
}

function rowHtml(it) {
  const per = it.valuation.per ?? it.valuation.forwardPer;
  const perSuffix = it.valuation.per === undefined && it.valuation.forwardPer !== undefined ? "*" : "";
  return `<tr class="row${openSymbol === it.symbol ? " is-open" : ""}" data-symbol="${it.symbol}">
    <td class="cell-name">
      <div class="name-main"><b>${it.name}</b><span class="badge">${GROUP_LABEL[it.group]}</span></div>
      <div class="name-sub">${it.symbol} · ${it.tag}</div>
    </td>
    <td>${fmtPrice(it.price, it.currency)}<span class="chg">${fmtPct(it.changePercent, 2)}</span></td>
    <td class="col-spark" style="width:110px">${sparkSvg(it.spark, 110, 28)}</td>
    <td>${fmtPct(it.returns["1y"])}</td>
    <td>${fmtPct(it.cagr["3y"])}</td>
    <td>${fmtPct(it.cagr["5y"])}</td>
    <td>${fmtPct(it.cagr["10y"])}</td>
    <td>${it.dividendYield ? it.dividendYield.toFixed(2) + "%" : '<span class="muted">-</span>'}</td>
    <td>${per !== undefined ? per.toFixed(1) + perSuffix : '<span class="muted">-</span>'}</td>
    <td>${fmtPlain(it.valuation.roe, 1, "%")}</td>
    <td>${fmtPct(it.fromHigh)}</td>
    <td>${fmtPct(it.mdd10y, 0)}</td>
  </tr>`;
}

function renderScreener() {
  const body = document.getElementById("screenerBody");
  const items = visibleItems();
  if (!items.length) {
    body.innerHTML = '<tr><td colspan="12" class="empty">조건에 맞는 종목이 없습니다.</td></tr>';
    return;
  }
  body.innerHTML = items
    .map((it) => rowHtml(it) + (openSymbol === it.symbol ? detailHtml(it) : ""))
    .join("");

  document.querySelectorAll("#screenerTable thead th[data-sort]").forEach((th) => {
    th.classList.toggle("is-sorted", th.dataset.sort === sortKey);
    th.classList.toggle("asc", th.dataset.sort === sortKey && sortAsc);
  });
}

/* ---------------------------------------------------------------- 배당 랭킹 */
function renderDividend() {
  const payers = DATA.items.filter((it) => it.dividendYield && it.group !== "index");

  const byYield = [...payers].sort((a, b) => b.dividendYield - a.dividendYield).slice(0, 8);
  document.getElementById("yieldRank").innerHTML = byYield
    .map(
      (it) => `<li><span class="rank-name">${it.name}<span class="rank-sub"> · ${it.tag}</span></span>
        <span class="rank-value">${it.dividendYield.toFixed(2)}%</span></li>`
    )
    .join("") || '<li class="muted">데이터 없음</li>';

  // 분배금이 들쭉날쭉한 저배당 ETF는 성장률이 의미 없이 튀므로 제외한다
  const byGrowth = payers
    .filter((it) => it.dividendYield >= 1)
    .filter((it) => it.dividend && it.dividend.growth5y !== null && it.dividend.growth5y !== undefined)
    .sort((a, b) => b.dividend.growth5y - a.dividend.growth5y)
    .slice(0, 8);
  document.getElementById("growthRank").innerHTML = byGrowth
    .map(
      (it) => `<li><span class="rank-name">${it.name}<span class="rank-sub"> · 현재 배당률 ${it.dividendYield.toFixed(2)}%</span></span>
        <span class="rank-value">+${it.dividend.growth5y.toFixed(1)}%/년</span></li>`
    )
    .join("") || '<li class="muted">데이터 없음</li>';
}

/* ---------------------------------------------------------------- 뉴스 */
function renderNews() {
  const list = document.getElementById("newsList");
  if (!DATA.news.length) {
    list.innerHTML = '<p class="empty">뉴스를 불러오지 못했습니다.</p>';
    return;
  }
  list.innerHTML = DATA.news
    .map((n) => {
      const when = n.pubDate ? new Date(n.pubDate) : null;
      const stamp =
        when && !Number.isNaN(when.getTime())
          ? when.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
          : "";
      return `<a class="news-item" href="${n.link}" target="_blank" rel="noopener">${n.title}
        <span class="news-meta">${n.source}${stamp ? " · " + stamp : ""}</span></a>`;
    })
    .join("");
}

/* ---------------------------------------------------------------- 복리 계산기 */
function runCalculator() {
  const initial = Number(document.getElementById("calcInitial").value) || 0;
  const monthly = Number(document.getElementById("calcMonthly").value) || 0;
  const rate = Number(document.getElementById("calcRate").value) || 0;
  const years = Math.max(1, Math.min(50, Number(document.getElementById("calcYears").value) || 1));

  const monthlyRate = Math.pow(1 + rate / 100, 1 / 12) - 1;
  const series = [];
  let balance = initial;
  let principal = initial;
  for (let month = 1; month <= years * 12; month += 1) {
    balance = balance * (1 + monthlyRate) + monthly;
    principal += monthly;
    if (month % 12 === 0) series.push({ year: month / 12, balance, principal });
  }

  const money = (value) =>
    value >= 10000 ? (value / 10000).toFixed(2) + "억원" : Math.round(value).toLocaleString("ko-KR") + "만원";

  document.getElementById("calcTotal").textContent = money(balance);
  document.getElementById("calcPrincipal").textContent = money(principal);
  document.getElementById("calcProfit").textContent = money(balance - principal);
  document.getElementById("calcMultiple").textContent = principal ? (balance / principal).toFixed(2) + "배" : "-";

  // 원금(회색)과 평가액(초록)을 겹쳐 그린다 — 벌어지는 간격이 곧 복리 효과
  const width = 400;
  const height = 150;
  const max = Math.max(...series.map((s) => s.balance)) || 1;
  const stepX = width / Math.max(1, series.length - 1);
  const toPoints = (key) =>
    series.map((s, i) => `${(i * stepX).toFixed(1)},${(height - (s[key] / max) * (height - 8) - 4).toFixed(1)}`).join(" ");
  document.getElementById("calcChart").innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" preserveAspectRatio="none">
      <polyline points="${toPoints("principal")}" fill="none" stroke="var(--text-faint)" stroke-width="1.5"
        stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>
      <polyline points="${toPoints("balance")}" fill="none" stroke="var(--accent)" stroke-width="2"
        vector-effect="non-scaling-stroke"/>
    </svg>
    <div class="range-label"><span>0년</span><span>원금(점선) vs 평가액(초록)</span><span>${years}년</span></div>`;
}

/* ---------------------------------------------------------------- 체크리스트 */
function initChecklist() {
  const list = document.getElementById("checklist");
  let saved = [];
  try {
    saved = JSON.parse(localStorage.getItem(CHECK_KEY) || "[]");
  } catch (err) {
    saved = [];
  }
  const items = Array.from(list.children);
  items.forEach((li, index) => {
    if (saved.includes(index)) li.classList.add("done");
    li.addEventListener("click", () => {
      li.classList.toggle("done");
      const done = items.reduce((acc, node, i) => (node.classList.contains("done") ? acc.concat(i) : acc), []);
      try {
        localStorage.setItem(CHECK_KEY, JSON.stringify(done));
      } catch (err) {
        /* 저장 불가(시크릿 모드 등)여도 체크 자체는 동작해야 한다 */
      }
    });
  });
}

/* ---------------------------------------------------------------- 로딩 */
async function load() {
  const stamp = document.getElementById("updatedAt");
  stamp.textContent = "불러오는 중...";
  try {
    const res = await fetch("data.json?t=" + Date.now());
    if (!res.ok) throw new Error("HTTP " + res.status);
    DATA = await res.json();
    const when = new Date(DATA.updatedAt);
    stamp.textContent =
      "갱신 " +
      when.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
    renderIndices();
    renderScreener();
    renderDividend();
    renderNews();
  } catch (err) {
    stamp.textContent = "데이터를 불러오지 못했습니다";
    document.getElementById("indexGrid").innerHTML =
      '<p class="empty">data.json을 읽지 못했습니다. 정적 서버로 열었는지 확인하세요.</p>';
    console.error(err);
  }
}

/* ---------------------------------------------------------------- 이벤트 */
document.getElementById("refreshBtn").addEventListener("click", load);

document.getElementById("groupChips").addEventListener("click", (event) => {
  const chip = event.target.closest(".chip");
  if (!chip) return;
  filterGroup = chip.dataset.group;
  openSymbol = null;
  document.querySelectorAll("#groupChips .chip").forEach((c) => c.classList.toggle("is-active", c === chip));
  renderScreener();
});

document.getElementById("searchInput").addEventListener("input", (event) => {
  searchTerm = event.target.value;
  renderScreener();
});

document.querySelector("#screenerTable thead").addEventListener("click", (event) => {
  const th = event.target.closest("th[data-sort]");
  if (!th) return;
  const key = th.dataset.sort;
  if (key === sortKey) sortAsc = !sortAsc;
  else {
    sortKey = key;
    sortAsc = key === "name"; // 이름만 오름차순이 자연스럽다
  }
  renderScreener();
});

document.getElementById("screenerBody").addEventListener("click", (event) => {
  const row = event.target.closest("tr.row");
  if (!row) return;
  openSymbol = openSymbol === row.dataset.symbol ? null : row.dataset.symbol;
  renderScreener();
});

document.querySelectorAll(".calc-inputs input").forEach((input) => {
  input.addEventListener("input", runCalculator);
});

initChecklist();
runCalculator();
load();
