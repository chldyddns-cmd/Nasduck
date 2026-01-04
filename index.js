$(function() {
  $(".headC").click(function() {
    $(".headB").slideToggle();
  });
});

const API_KEY_STORAGE = "ALPHAVANTAGE_API_KEY";

function getAlphaVantageKey() {
  return localStorage.getItem(API_KEY_STORAGE) || "";
}
const RATE_DELAY = 15000;

const assets = [
  { name: "S&P 500 (SPY)", symbol: "SPY", link: "https://finviz.com/map.ashx" },
  { name: "NASDAQ (QQQ)", symbol: "QQQ", link: "https://www.nasdaq.com/market-activity/indexes" },
  { name: "Gold (GLD)", symbol: "GLD", link: "https://www.gold.org/goldhub/data/gold-prices" },
  { name: "미국 10년물 국채 (TLT)", symbol: "TLT", link: "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve" },
  { name: "Bitcoin (BTC/USD)", symbol: "BTCUSD", link: "https://coinmarketcap.com/" },
  { name: "USD/KRW", fx: true, from: "USD", to: "KRW", link: "https://snapshot.bok.or.kr/dashboard/B1" }
];

const dashboard = document.getElementById("dashboard");

assets.forEach(asset => {
  const div = document.createElement("div");
  div.className = "asset-card";
  div.innerHTML = `
    <a href="${asset.link}" target="_blank" rel="noopener noreferrer">
      <div class="asset-title">${asset.name}</div>
      <div class="asset-price" id="price-${asset.name}">가격: —</div>
      <div class="asset-change" id="change-${asset.name}">변동: —</div>
      <div class="asset-change" id="percent-${asset.name}">등락률: —</div>
      <div class="update-time" id="update-${asset.name}">갱신 중...</div>
    </a>`;
  dashboard.appendChild(div);
});

async function fetchAsset(asset) {
  const now = new Date();
  try {
    const apiKey = getAlphaVantageKey();
    if (!apiKey) throw new Error("API 키 없음");

    const card = document.getElementById(`price-${asset.name}`).closest(".asset-card");
    card.classList.remove("up", "down");

    if (asset.fx) {
      const fxRes = await fetch(`https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${asset.from}&to_symbol=${asset.to}&apikey=${apiKey}`);
      const fxData = await fxRes.json();
      const ts = fxData["Time Series FX (Daily)"];
      if (!ts) throw new Error("FX 데이터 없음");

      const dates = Object.keys(ts).sort();
      const latest = dates.at(-1);
      const prev = dates.at(-2);
      const latestRate = parseFloat(ts[latest]["4. close"]);
      const prevRate = parseFloat(ts[prev]["4. close"]);
      const change = latestRate - prevRate;
      const percent = ((change / prevRate) * 100).toFixed(2);
      const up = change >= 0;

      card.classList.add(up ? "up" : "down");

      document.getElementById(`price-${asset.name}`).textContent   = `환율: ₩${latestRate.toFixed(2)}`;
      document.getElementById(`change-${asset.name}`).textContent  = `변동: ${up ? "+" : ""}${change.toFixed(2)}`;
      document.getElementById(`percent-${asset.name}`).textContent = `등락률: ${up ? "+" : ""}${percent}%`;
      document.getElementById(`update-${asset.name}`).textContent  = `갱신: ${now.toLocaleTimeString("ko-KR",{hour12:false})}`;
      return;
    }

    const res = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${asset.symbol}&apikey=${apiKey}`);
    const data = await res.json();
    const q = data["Global Quote"];
    if (!q) throw new Error("데이터 없음");

    const price   = parseFloat(q["05. price"]).toFixed(2);
    const change  = parseFloat(q["09. change"]).toFixed(2);
    const percent = q["10. change percent"];
    const up = change >= 0;

    card.classList.add(up ? "up" : "down");
    document.getElementById(`price-${asset.name}`).textContent   = `가격: $${price}`;
    document.getElementById(`change-${asset.name}`).textContent  = `변동: ${up ? "+" : ""}${change}`;
    document.getElementById(`percent-${asset.name}`).textContent = `등락률: ${up ? "+" : ""}${percent}`;
    document.getElementById(`update-${asset.name}`).textContent  = `갱신: ${now.toLocaleTimeString("ko-KR",{hour12:false})}`;
  } catch (err) {
    const msg = err?.message === "API 키 없음" ? "API 키 없음" : "데이터 오류";
    document.getElementById(`update-${asset.name}`).textContent = msg;
  }
}

async function updateAll() {
  for (const a of assets) {
    await fetchAsset(a);
    await new Promise(r => setTimeout(r, RATE_DELAY));
  }
}

updateAll();
setInterval(updateAll, 5 * 60 * 1000);
