// usage.js — 토큰 사용량·비용 추적 (기기 공통 저장, 프로필별 집계)
// 주의: 가격표는 앱에 하드코딩된 추정치입니다. 실제 청구는 console.anthropic.com의 Usage/Billing이 기준입니다.
const Usage = (() => {
  // USD per 1M tokens (입력/출력). 모델 id 패턴 매칭, 위에서부터 먼저 맞는 것.
  const PRICES = [
    [/opus-4[-.]5|opus-5/i,        { in: 5,    out: 25 }],
    [/opus/i,                      { in: 15,   out: 75 }],
    [/sonnet/i,                    { in: 3,    out: 15 }],
    [/haiku-3[-.]5/i,              { in: 0.80, out: 4 }],
    [/haiku/i,                     { in: 1,    out: 5 }],
  ];
  const SEARCH_PER_1K = 10; // 웹검색 $10 / 1,000회
  function price(model) { for (const [re, p] of PRICES) if (re.test(model || '')) return p; return { in: 3, out: 15 }; }
  function db() { const d = Store.device(); d.usage = d.usage || { days: {}, budget: 0 }; return d.usage; }
  function month(day) { return (day || Store.today()).slice(0, 7); }

  // API 응답의 usage 객체를 받아 비용 계산 후 기록
  function record(model, u, feature) {
    if (!u) return 0;
    const p = price(model);
    const inTok = (u.input_tokens || 0), outTok = (u.output_tokens || 0);
    const cacheW = (u.cache_creation_input_tokens || 0), cacheR = (u.cache_read_input_tokens || 0);
    const searches = (u.server_tool_use && u.server_tool_use.web_search_requests) || 0;
    const cost = (inTok * p.in + outTok * p.out + cacheW * p.in * 1.25 + cacheR * p.in * 0.1) / 1e6
               + searches * SEARCH_PER_1K / 1000;
    const D = db(); const t = Store.today();
    const day = D.days[t] = D.days[t] || { cost: 0, in: 0, out: 0, calls: 0, searches: 0, by: {}, who: {} };
    day.cost += cost; day.in += inTok + cacheW + cacheR; day.out += outTok; day.calls++; day.searches += searches;
    const f = feature || 'etc'; day.by[f] = (day.by[f] || 0) + cost;
    const who = (Store.active() && Store.active().settings.name) || '(이름 없음)';
    day.who[who] = (day.who[who] || 0) + cost;
    // 400일치만 보관
    const keys = Object.keys(D.days).sort(); while (keys.length > 400) delete D.days[keys.shift()];
    Store.save();
    return cost;
  }
  function sum(fromDay) {
    const D = db(); let cost = 0, inTok = 0, out = 0, calls = 0, searches = 0; const by = {}, who = {};
    for (const [d, v] of Object.entries(D.days)) {
      if (fromDay && d < fromDay) continue;
      cost += v.cost; inTok += v.in; out += v.out; calls += v.calls; searches += v.searches || 0;
      for (const [k, c] of Object.entries(v.by || {})) by[k] = (by[k] || 0) + c;
      for (const [k, c] of Object.entries(v.who || {})) who[k] = (who[k] || 0) + c;
    }
    return { cost, in: inTok, out, calls, searches, by, who };
  }
  const today = () => sum(Store.today());
  const thisMonth = () => sum(month() + '-01');
  function budget() { return db().budget || 0; }
  function setBudget(v) { db().budget = Math.max(0, Number(v) || 0); Store.save(); }
  // 호출 전 예산 확인 — 초과 시 예외
  function check() {
    const b = budget(); if (!b) return;
    const m = thisMonth().cost;
    if (m >= b) throw new Error(`이번 달 사용액이 설정한 예산($${b})을 넘었습니다 (현재 약 $${m.toFixed(2)}). 설정 → 사용량에서 예산을 올리거나 다음 달까지 기다리세요. 레슨·카드·내 노트는 계속 쓸 수 있습니다.`);
  }
  const fmt = c => c < 0.01 ? '$0.01 미만' : '$' + c.toFixed(2);
  const krw = c => '약 ' + Math.round(c * 1400).toLocaleString() + '원';
  const label = { tutor: '튜터', scan: '종목 스캔', disclosure: '공시 해석', market: '시장 브리핑', word: '단어 정의', level: '레벨 판정', test: '연결 테스트', etc: '기타' };
  return { record, sum, today, thisMonth, budget, setBudget, check, fmt, krw, label, price, db };
})();
