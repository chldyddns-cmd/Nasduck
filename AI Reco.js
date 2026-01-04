// ==== GPT-5 nano API 설정 ====
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-5-nano";
const API_KEY_STORAGE = "OPENAI_API_KEY";

function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) || "";
}

function escapeHtml(unsafe) {
  return String(unsafe)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmtKRW(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "-";
  return `${Math.round(num).toLocaleString("ko-KR")}원`;
}

function parseKrwNumber(value) {
  const n = Number(String(value).replaceAll(",", "").trim());
  return Number.isFinite(n) ? n : 0;
}

function getUrlFlag(name) {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  } catch {
    return null;
  }
}

function buildDemoPortfolio({ age, interest, seedKrw, monthlyKrw, risk }) {
  const ageNum = Number(age);
  const normalizedRisk = String(risk || "").trim();
  const normalizedInterest = String(interest || "").trim();

  const universes = {
    "기술": [
      { ticker: "AAPL", name: "Apple", sector: "기술" },
      { ticker: "MSFT", name: "Microsoft", sector: "기술" },
      { ticker: "NVDA", name: "NVIDIA", sector: "기술" },
      { ticker: "QQQ", name: "Invesco QQQ Trust", sector: "ETF (NASDAQ 100)" }
    ],
    "소비자 서비스": [
      { ticker: "AMZN", name: "Amazon", sector: "소비자 서비스" },
      { ticker: "META", name: "Meta Platforms", sector: "커뮤니케이션" },
      { ticker: "TSLA", name: "Tesla", sector: "소비자 서비스" },
      { ticker: "QQQ", name: "Invesco QQQ Trust", sector: "ETF (NASDAQ 100)" }
    ],
    "헬스케어": [
      { ticker: "AMGN", name: "Amgen", sector: "헬스케어" },
      { ticker: "ISRG", name: "Intuitive Surgical", sector: "헬스케어" },
      { ticker: "GILD", name: "Gilead Sciences", sector: "헬스케어" },
      { ticker: "QQQ", name: "Invesco QQQ Trust", sector: "ETF (NASDAQ 100)" }
    ],
    "금융": [
      { ticker: "PYPL", name: "PayPal", sector: "금융/핀테크" },
      { ticker: "INTU", name: "Intuit", sector: "금융/소프트웨어" },
      { ticker: "COIN", name: "Coinbase", sector: "금융/크립토" },
      { ticker: "QQQ", name: "Invesco QQQ Trust", sector: "ETF (NASDAQ 100)" }
    ],
    "산업": [
      { ticker: "HON", name: "Honeywell", sector: "산업" },
      { ticker: "CSX", name: "CSX", sector: "산업" },
      { ticker: "GEHC", name: "GE HealthCare", sector: "산업/헬스케어" },
      { ticker: "QQQ", name: "Invesco QQQ Trust", sector: "ETF (NASDAQ 100)" }
    ],
    "자원 및 에너지": [
      { ticker: "ENPH", name: "Enphase Energy", sector: "에너지(신재생)" },
      { ticker: "FSLR", name: "First Solar", sector: "에너지(신재생)" },
      { ticker: "TSLA", name: "Tesla", sector: "에너지(전기차)" },
      { ticker: "QQQ", name: "Invesco QQQ Trust", sector: "ETF (NASDAQ 100)" }
    ],
    "소비재": [
      { ticker: "COST", name: "Costco", sector: "소비재" },
      { ticker: "PEP", name: "PepsiCo", sector: "소비재" },
      { ticker: "SBUX", name: "Starbucks", sector: "소비재" },
      { ticker: "QQQ", name: "Invesco QQQ Trust", sector: "ETF (NASDAQ 100)" }
    ],
    "통신 서비스": [
      { ticker: "GOOGL", name: "Alphabet", sector: "통신 서비스" },
      { ticker: "META", name: "Meta Platforms", sector: "통신 서비스" },
      { ticker: "NFLX", name: "Netflix", sector: "통신 서비스" },
      { ticker: "QQQ", name: "Invesco QQQ Trust", sector: "ETF (NASDAQ 100)" }
    ]
  };

  const base = universes[normalizedInterest] || universes["기술"];

  const includeLeveraged = (ageNum && ageNum <= 35) && (normalizedRisk === "공격적" || normalizedRisk === "도박");
  const addOns = includeLeveraged ? [{ ticker: "TQQQ", name: "ProShares UltraPro QQQ", sector: "레버리지 ETF" }] : [];
  const picks = [...base, ...addOns].slice(0, 5);

  // 간단 규칙 기반 비중
  let weights;
  if (normalizedRisk === "보수적") {
    weights = picks.map(p => (p.ticker === "QQQ" ? 55 : 15));
  } else if (normalizedRisk === "중립") {
    weights = picks.map(p => (p.ticker === "QQQ" ? 45 : 18));
  } else if (normalizedRisk === "공격적") {
    weights = picks.map(p => (p.ticker === "TQQQ" ? 25 : p.ticker === "QQQ" ? 30 : 15));
  } else {
    // 도박
    weights = picks.map(p => (p.ticker === "TQQQ" ? 35 : p.ticker === "QQQ" ? 25 : 13));
  }

  // 합이 100이 되도록 보정
  const sum = weights.reduce((a, b) => a + b, 0);
  const normalized = weights.map(w => Math.round((w / sum) * 100));
  const diff = 100 - normalized.reduce((a, b) => a + b, 0);
  normalized[0] += diff;

  const monthlyAlloc = normalized.map(pct => Math.round((monthlyKrw * pct) / 100));

  const rowsList = picks.map((p, idx) =>
    `<tr><td>${escapeHtml(p.ticker)}</td><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.sector)}</td></tr>`
  ).join("");

  const rowsWeights = picks.map((p, idx) =>
    `<tr><td>${escapeHtml(p.ticker)}</td><td>${normalized[idx]}%</td></tr>`
  ).join("");

  const rowsMonthly = picks.map((p, idx) =>
    `<tr><td>${escapeHtml(p.ticker)}</td><td>${fmtKRW(monthlyAlloc[idx])}</td></tr>`
  ).join("");

  const note = `
    <p>※ 데모 모드(샘플 데이터)입니다. OpenAI API 키가 없거나 호출이 실패할 때 포트폴리오 예시를 로컬에서 생성해 보여줍니다.</p>
    <p>학습용 예시이며 실제 투자 판단의 책임은 사용자에게 있습니다.</p>
  `;

  const title = `<p><strong>입력 요약</strong>: 나이 ${escapeHtml(age)} / 관심 ${escapeHtml(interest)} / 시드 ${fmtKRW(seedKrw)} / 월 ${fmtKRW(monthlyKrw)} / 성향 ${escapeHtml(risk)}</p>`;

  const why = (() => {
    if (normalizedRisk === "보수적") return "<p>변동성을 낮추기 위해 QQQ 비중을 높이고, 섹터/대표 대형주로 분산했습니다.</p><p>월 투자금은 비중대로 단순 분배해 꾸준히 적립식으로 접근합니다.</p>";
    if (normalizedRisk === "중립") return "<p>QQQ로 시장 베타를 확보하고, 관심 섹터 대표 종목으로 초과수익 가능성을 노립니다.</p><p>리밸런싱은 분기 1회 수준의 보수적 운영을 권장합니다.</p>";
    if (normalizedRisk === "공격적") return "<p>관심 섹터 중심의 성장주 + QQQ 기반 분산으로 공격적으로 구성했습니다.</p><p>젊은 연령대의 경우 TQQQ 같은 레버리지 ETF를 소량 포함해 기대수익을 높였습니다.</p>";
    return "<p>높은 변동성을 감수하고 성장/모멘텀 중심으로 구성했습니다.</p><p>레버리지 비중이 있어 손실 확대 가능성이 크며, 손절/비중관리 기준이 필요합니다.</p>";
  })();

  return `
    ${title}
    <h3>추천 종목 목록</h3>
    <table class="result-table">
      <tr><th>티커</th><th>기업명/ETF</th><th>섹터</th></tr>
      ${rowsList}
    </table>

    <h3>종목별 투자 비중(%)</h3>
    <table class="result-table">
      <tr><th>티커</th><th>비중</th></tr>
      ${rowsWeights}
    </table>

    <h3>월별 투자 분배안(₩)</h3>
    <table class="result-table">
      <tr><th>티커</th><th>월 투자 금액</th></tr>
      ${rowsMonthly}
    </table>

    <h3>포트폴리오 구성 이유 요약</h3>
    ${why}
    ${note}
  `.trim();
}

async function fetchGPTPortfolio(prompt) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("OpenAI API 키가 없습니다. localStorage의 OPENAI_API_KEY에 키를 저장하세요.");
  }
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: "You are a financial assistant that recommends stock portfolios." },
        { role: "user", content: prompt }
      ]
    })
  });

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "응답을 불러오지 못했습니다.";
}

// ===== 폼 처리 =====
document.getElementById("portfolio-form").addEventListener("submit", async e => {
  e.preventDefault();
  const age = document.getElementById("age").value;
  const interest = document.getElementById("interest").value;
  const seed = document.getElementById("seed").value;
  const monthly = document.getElementById("monthly").value;
  const risk = document.getElementById("risk").value;
  const resultDiv = document.getElementById("result");
  const loadingDiv = document.getElementById("loading");

  resultDiv.innerHTML = "";
  loadingDiv.style.display = "block";

const prompt = `
다음 조건에 맞는 나스닥 상장 주식 또는 ETF로만 구성된 포트폴리오를 만들어라.
- 나이: ${age}
- 관심 분야: ${interest}
- 시드 금액: ${seed} Won
- 월 투자 가능 금액: ${monthly} Won
- 투자 성향: ${risk}
- 원칙: 나이가 젊을수록 배당주는 제외하고, 성장형 혹은 레버리지 ETF를 포함시킬 수 있음. 반대로 나이가 많을수록 저위험 배당주 위주로 추천.
- 나이와 투자 성향 모두를 고려할 것.
- 출력 형식:
  1. <h3>추천 종목 목록</h3> 아래에 <table class="result-table"> 형식으로 티커/기업명/섹터 표시
  2. <h3>종목별 투자 비중(%)</h3> 표로 표시
  3. <h3>월별 투자 분배안(₩)</h3>은 각 종목별 “한 달 기준 투자 금액”만 한 번 표시.
  4. <h3>포트폴리오 구성 이유 요약</h3> 2줄 <p>로 표시
- 출력은 반드시 HTML 형식으로 작성하며, 마크다운(-, *, 1.) 기호는 절대 사용하지 말 것.
`;



try {
  const demoFlag = getUrlFlag("demo");
  if (demoFlag === "1") {
    const demoHtml = buildDemoPortfolio({
      age,
      interest,
      seedKrw: parseKrwNumber(seed),
      monthlyKrw: parseKrwNumber(monthly),
      risk
    });
    loadingDiv.style.display = "none";
    resultDiv.innerHTML = demoHtml;
    return;
  }

  const response = await fetchGPTPortfolio(prompt);
  loadingDiv.style.display = "none";

  // ===== 응답 후처리 (스타일 적용 및 코드블록 제거) =====
  const cleaned = response
    .replace(/```html|```/g, "")                     // 코드블록 제거
    .replace(/<table>/g, '<table class="result-table">'); // 테이블 스타일 적용
  resultDiv.innerHTML = cleaned;
  
} catch (err) {
  loadingDiv.style.display = "none";
  const apiKey = getApiKey();
  if (!apiKey) {
    const demoHtml = buildDemoPortfolio({
      age,
      interest,
      seedKrw: parseKrwNumber(seed),
      monthlyKrw: parseKrwNumber(monthly),
      risk
    });
    resultDiv.innerHTML = demoHtml;
  } else {
    resultDiv.innerHTML = "오류 발생: " + (err?.message || String(err));
  }
}
});

