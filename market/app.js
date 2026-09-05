const DATA_URL = "data.json";
const AUTO_REFRESH_MS = 5 * 60 * 1000; // data.json only changes hourly server-side; this just re-polls for it

const updatedAtEl = document.getElementById("updatedAt");
const refreshBtn = document.getElementById("refreshBtn");
const indicesGrid = document.getElementById("indicesGrid");
const stocksGrid = document.getElementById("stocksGrid");
const newsList = document.getElementById("newsList");

function formatPrice(value, currency) {
  if (typeof value !== "number") return "-";
  const decimals = currency === "KRW" && value >= 1000 ? 0 : 2;
  return value.toLocaleString("ko-KR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function changeClass(change) {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "flat";
}

function changeSign(change) {
  if (change > 0) return "+";
  return ""; // negative numbers already carry a minus sign
}

function renderTickerCard(item) {
  const cls = changeClass(item.change);
  const sign = changeSign(item.change);
  return `
    <div class="ticker-card">
      <div class="ticker-name">${item.name}</div>
      <div class="ticker-price">${formatPrice(item.price, item.currency)}</div>
      <div class="ticker-change ${cls}">${sign}${formatPrice(item.change, item.currency)} (${sign}${item.changePercent.toFixed(2)}%)</div>
    </div>
  `;
}

function renderTickers(container, items) {
  if (!items || items.length === 0) {
    container.innerHTML = '<div class="empty-state">데이터를 불러오지 못했습니다.</div>';
    return;
  }
  container.innerHTML = items.map(renderTickerCard).join("");
}

function timeAgo(pubDate) {
  const then = new Date(pubDate);
  if (isNaN(then.getTime())) return "";
  const diffMs = Date.now() - then.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

function renderNews(items) {
  if (!items || items.length === 0) {
    newsList.innerHTML = '<div class="empty-state">뉴스를 불러오지 못했습니다.</div>';
    return;
  }
  newsList.innerHTML = items.map((item) => `
    <a class="news-item" href="${item.link}" target="_blank" rel="noopener noreferrer">
      <span class="news-title">${item.title}</span>
      <span class="news-meta">
        <span class="news-source">${item.source}</span>
        <span>${timeAgo(item.pubDate)}</span>
      </span>
    </a>
  `).join("");
}

function renderUpdatedAt(isoString) {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    updatedAtEl.textContent = "업데이트 시각 알 수 없음";
    return;
  }
  const formatted = date.toLocaleString("ko-KR", {
    month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
  updatedAtEl.textContent = `업데이트: ${formatted}`;
}

async function loadData() {
  try {
    const res = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    renderUpdatedAt(data.updatedAt);
    renderTickers(indicesGrid, [...(data.indices || []), ...(data.fx || [])]);
    renderTickers(stocksGrid, data.stocks);
    renderNews(data.news);
  } catch (err) {
    updatedAtEl.textContent = "데이터를 불러오는 중 오류가 발생했습니다.";
    console.error("failed to load market data", err);
    if (!indicesGrid.innerHTML) indicesGrid.innerHTML = '<div class="error-state">로드 실패</div>';
    if (!stocksGrid.innerHTML) stocksGrid.innerHTML = '<div class="error-state">로드 실패</div>';
    if (!newsList.innerHTML) newsList.innerHTML = '<div class="error-state">로드 실패</div>';
  }
}

refreshBtn.addEventListener("click", () => {
  refreshBtn.classList.add("spinning");
  loadData().finally(() => setTimeout(() => refreshBtn.classList.remove("spinning"), 600));
});

loadData();
setInterval(loadData, AUTO_REFRESH_MS);
