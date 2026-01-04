// ==== GPT-5 nano API 설정 ====
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-5-nano";
const API_KEY_STORAGE = "OPENAI_API_KEY";

function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) || "";
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
  const response = await fetchGPTPortfolio(prompt);
  loadingDiv.style.display = "none";

  // ===== 응답 후처리 (스타일 적용 및 코드블록 제거) =====
  const cleaned = response
    .replace(/```html|```/g, "")                     // 코드블록 제거
    .replace(/<table>/g, '<table class="result-table">'); // 테이블 스타일 적용
  resultDiv.innerHTML = cleaned;
  
} catch (err) {
  loadingDiv.style.display = "none";
  resultDiv.innerHTML = "오류 발생: " + err.message;
}
});

