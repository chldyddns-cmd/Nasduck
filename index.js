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

function hashToUnit(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h / 4294967296;
}

function formatSigned(n, digits = 2) {
  const num = Number(n);
  const sign = num >= 0 ? "+" : "";
  return `${sign}${num.toFixed(digits)}`;
}

function renderAsset(asset, { priceText, changeText, percentText, updateText, up }) {
  const priceEl = document.getElementById(`price-${asset.name}`);
  const changeEl = document.getElementById(`change-${asset.name}`);
  const percentEl = document.getElementById(`percent-${asset.name}`);
  const updateEl = document.getElementById(`update-${asset.name}`);
  const card = priceEl?.closest(".asset-card");

  if (card) {
    card.classList.remove("up", "down");
    if (typeof up === "boolean") card.classList.add(up ? "up" : "down");
  }
  if (priceEl) priceEl.textContent = priceText;
  if (changeEl) changeEl.textContent = changeText;
  if (percentEl) percentEl.textContent = percentText;
  if (updateEl) updateEl.textContent = updateText;
}

function renderDemoAsset(asset, now, reason = "데모") {
  const t = Date.now() / 600000; // 10분 단위로 천천히 변동
  const seed = hashToUnit(asset.name) * Math.PI * 2;
  const waveNow = Math.sin(t + seed);
  const wavePrev = Math.sin((t - 1) + seed);

  const baseBySymbol = {
    SPY: 485.32,
    QQQ: 412.87,
    GLD: 187.56,
    TLT: 95.12,
    BTCUSD: 43850.0
  };

  const volPctBySymbol = {
    SPY: 0.35,
    QQQ: 0.5,
    GLD: 0.25,
    TLT: 0.2,
    BTCUSD: 1.8,
    FX: 0.12
  };

  const base = asset.fx ? 1328.4 : (baseBySymbol[asset.symbol] ?? 100);
  const volPct = asset.fx ? volPctBySymbol.FX : (volPctBySymbol[asset.symbol] ?? 0.4);

  const current = base * (1 + (waveNow * volPct) / 100);
  const prev = base * (1 + (wavePrev * volPct) / 100);
  const change = current - prev;
  const percent = (change / prev) * 100;
  const up = change >= 0;

  renderAsset(asset, {
    priceText: asset.fx ? `환율: ${current.toFixed(2)}` : `가격: $${current.toFixed(2)}`,
    changeText: `변동: ${formatSigned(change, 2)}`,
    percentText: `등락률: ${formatSigned(percent, 2)}%`,
    updateText: `갱신: ${now.toLocaleTimeString("ko-KR", { hour12: false })} (${reason})`,
    up
  });
}

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
    if (!apiKey) {
      renderDemoAsset(asset, now);
      return;
    }

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
  } catch {
    renderDemoAsset(asset, now, "데모(대체)");
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
