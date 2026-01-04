const API_KEY_STORAGE = "ALPHAVANTAGE_API_KEY";

function getAlphaVantageKey() {
  return localStorage.getItem(API_KEY_STORAGE) || "";
}
let chart, allDates = [], allPrices = [], currentSymbol = "", currentRange = "1y";

const simState = {
  totalInvestUSD: null,
  totalShares: null,
  currentValueUSD: null,
  profitUSD: null,
  profitRatePct: null,
  avgFx: null
};

// ====== Alpha Vantage 주가 불러오기 ======
async function fetchData(symbol) {
  const apiKey = getAlphaVantageKey();
  if (!apiKey) {
    alert("Alpha Vantage API 키가 없습니다. localStorage의 ALPHAVANTAGE_API_KEY에 키를 저장하세요.");
    return;
  }
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=full&apikey=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  const key = Object.keys(data).find(k => k.toLowerCase().includes("time series"));
  const ts = data[key];
  if (!ts) {
    alert("데이터를 가져올 수 없습니다.");
    return;
  }
  allDates = Object.keys(ts).sort();
  allPrices = allDates.map(d => parseFloat(ts[d]["5. adjusted close"] || ts[d]["4. close"]));
  filterRange(currentRange);
}

// ====== 차트 렌더링 ======
function renderChart(symbol, dates, closes) {
  const ctx = document.getElementById("chart").getContext("2d");
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: dates,
      datasets: [{
        label: symbol,
        data: closes,
        borderColor: "#5aa9ff",
        borderWidth: 2,
        fill: false,
        tension: 0.25,
        pointRadius: 0
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

// ====== 기간 필터 ======
function filterRange(range) {
  let days = 0;
  switch (range) {
    case "1y": days = 252; break;
    case "2y": days = 504; break;
    case "3y": days = 756; break;
    case "4y": days = 1008; break;
    case "5y": days = 1260; break;
    case "max": days = allDates.length; break;
  }
  const d = allDates.slice(-days);
  const p = allPrices.slice(-days);
  renderChart(currentSymbol, d, p);
}

// ====== 이벤트 ======
document.getElementById("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const t = document.getElementById("ticker").value.trim().toUpperCase();
  if (!t) return;
  currentSymbol = t;
  await fetchData(currentSymbol);
});

document.querySelectorAll("#range-buttons button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#range-buttons button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentRange = btn.dataset.range;
    if (currentSymbol && allDates.length) filterRange(currentRange);
  });
});

// ====== 주기 선택 ======
document.getElementById("interval").addEventListener("change", (e) => {
  const value = e.target.value;
  const weekRow = document.getElementById("weekday-row");
  const monthRow = document.getElementById("monthday-row");
  weekRow.classList.add("hidden");
  monthRow.classList.add("hidden");
  if (value === "weekly") weekRow.classList.remove("hidden");
  if (value === "monthly") monthRow.classList.remove("hidden");
});

// ====== 월 투자일 옵션 ======
const monthSelect = document.getElementById("monthday");
for (let i = 1; i <= 31; i++) {
  const opt = document.createElement("option");
  opt.value = i;
  opt.textContent = `${i}일`;
  monthSelect.appendChild(opt);
}

// ====== 포맷 ======
function fmtUSD(n) { return `$${Math.round(n).toLocaleString()}`; }
function fmtKRW(n) {
  const abs = Math.abs(n);
  if (abs >= 1e8) return `${(n/1e8).toFixed(2)}억원`;
  if (abs >= 1e4) return `${(n/1e4).toFixed(2)}만원`;
  return `${Math.round(n).toLocaleString()}원`;
}

// ====== 시뮬레이션 ======
document.getElementById("investment-form").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!currentSymbol || allDates.length === 0) {
    alert("먼저 주식 차트를 조회하세요.");
    return;
  }

  const start = new Date(document.getElementById("start-date").value);
  const end = new Date(document.getElementById("end-date").value);
  const interval = document.getElementById("interval").value;
  const weekday = parseInt(document.getElementById("weekday").value || 1, 10);
  const monthday = parseInt(document.getElementById("monthday").value || 1, 10);
  const investPer = parseFloat(document.getElementById("investment").value);

  let totalInvest = 0, totalShares = 0;
  for (let i = 0; i < allDates.length; i++) {
    const d = new Date(allDates[i]);
    if (d < start || d > end) continue;

    let invest = false;
    if (interval === "daily") invest = true;
    else if (interval === "weekly" && d.getDay() === weekday) invest = true;
    else if (interval === "monthly" && d.getDate() === monthday) invest = true;

    if (invest) {
      totalInvest += investPer;
      totalShares += investPer / allPrices[i];
    }
  }

  if (totalInvest === 0) {
    alert("설정한 구간에 투자일이 없습니다.");
    return;
  }

  const lastPrice = allPrices[allPrices.length - 1];
  const currentValue = totalShares * lastPrice;
  const profit = currentValue - totalInvest;
  const profitRate = (profit / totalInvest) * 100;

  simState.totalInvestUSD = totalInvest;
  simState.totalShares = totalShares;
  simState.currentValueUSD = currentValue;
  simState.profitUSD = profit;
  simState.profitRatePct = profitRate;

  document.getElementById("res-total-invest").textContent = fmtUSD(totalInvest);
  document.getElementById("res-total-shares").textContent = `${totalShares.toFixed(4)}주`;
  document.getElementById("res-current-value").textContent = fmtUSD(currentValue);
  document.getElementById("res-profit").textContent = `${profit >= 0 ? "+" : ""}${fmtUSD(profit)}`;
  document.getElementById("res-profit-rate").textContent = `${profitRate.toFixed(2)}%`;

  if (simState.avgFx) applyFxToResult();
});

// ====== 평균 환율 계산 ======
async function computeAverageFx(fxStartISO, fxEndISO) {
  const apiKey = getAlphaVantageKey();
  if (!apiKey) throw new Error("Alpha Vantage API 키가 없습니다. localStorage의 ALPHAVANTAGE_API_KEY에 키를 저장하세요.");

  const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=USD&to_symbol=KRW&outputsize=full&apikey=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  const series = data["Time Series FX (Daily)"];
  if (!series) throw new Error("환율 데이터를 가져올 수 없습니다.");

  const days = Object.keys(series).filter(d => d >= fxStartISO && d <= fxEndISO);
  if (days.length === 0) throw new Error("해당 구간의 환율 데이터가 없습니다.");

  const avg = days.reduce((acc, d) => acc + parseFloat(series[d]["4. close"]), 0) / days.length;
  return avg;
}

document.getElementById("fx-btn").addEventListener("click", async () => {
  const s = document.getElementById("start-date").value;
  const e = document.getElementById("end-date").value;
  if (!s || !e) {
    alert("시작일과 종료일을 먼저 입력하세요.");
    return;
  }
  try {
    const avg = await computeAverageFx(s, e);
    simState.avgFx = avg;
    document.getElementById("fx-result").textContent = `평균 환율: ${avg.toFixed(2)} KRW/USD`;
    if (simState.totalInvestUSD !== null) applyFxToResult();
  } catch (err) {
    document.getElementById("fx-result").textContent = "평균 환율: 계산 실패";
    alert(err.message || "평균 환율 계산 중 오류가 발생했습니다.");
  }
});

document.getElementById("apply-fx").addEventListener("click", () => {
  if (!simState.avgFx) {
    alert("먼저 평균 환율을 계산하세요.");
    return;
  }
  if (simState.totalInvestUSD === null) {
    alert("먼저 시뮬레이션을 실행하세요.");
    return;
  }
  applyFxToResult();
});

function applyFxToResult() {
  const fx = simState.avgFx;
  const investKRW = simState.totalInvestUSD * fx;
  const valueKRW  = simState.currentValueUSD * fx;
  const profitKRW = simState.profitUSD * fx;
  const rateKRW   = ((profitKRW / investKRW) * 100);

  document.getElementById("res-total-invest-krw").textContent = `(${fmtKRW(investKRW)})`;
  document.getElementById("res-current-value-krw").textContent = `(${fmtKRW(valueKRW)})`;
  document.getElementById("res-profit-krw").textContent       = `(${fmtKRW(profitKRW)})`;
  document.getElementById("res-profit-rate-krw").textContent  = `(${rateKRW.toFixed(2)}%)`;
}
