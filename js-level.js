// level.js — 학습자 레벨 엔진
// 두 가지 레벨을 계산한다.
//  (1) 시스템 레벨: 진도·퀴즈 정확도·용어 숙련·실전 적용·튜터 대화를 점수화(0~1000)하고, 객관적 관문(게이트)을 통과해야 올라간다.
//  (2) AI 판정 레벨: Claude가 최근 튜터 대화의 '답변 품질'을 보고 매기는 레벨 (설정한 API 키 필요). 시스템 레벨이 "얼마나 했나"라면 AI 판정은 "실제로 아는가".
// 튜터 프롬프트는 이 두 레벨과 약점 목록을 받아 난이도를 조절한다.
const Level = (() => {
  // 레벨 사다리 — 현업 직급에 빗댄 기준. 각 레벨의 gate는 '점수가 돼도 이걸 못 채우면 못 올라감'.
  const LADDER = [
    { n: 0, min: 0,   title: '금융 문외한',            job: '용어를 들으면 검색부터',
      desc: '주식·매출·이익 정도는 알지만 재무제표 3종을 연결해서 읽지 못한다.', gate: {} },
    { n: 1, min: 60,  title: '개인투자자 입문',         job: '뉴스 헤드라인으로 투자',
      desc: 'PER·시총·매출성장 같은 기본 용어를 알고, 손익계산서의 위에서 아래로 흐름을 설명할 수 있다.',
      gate: { lessons: 5 } },
    { n: 2, min: 180, title: '재무제표 읽는 개미',        job: '10-K를 열어본 개인투자자 상위 10%',
      desc: '손익·재무상태·현금흐름 3표를 연결해 한 회사의 이야기를 세 줄로 말할 수 있다. ROE·FCF를 직접 계산한다.',
      gate: { lessons: 15, acc: 0.6 } },
    { n: 3, min: 320, title: '증권사 RA 1년차',          job: '리서치 어시스턴트 (Research Associate)',
      desc: '듀폰 분해, 멀티플 비교, ARR·NRR 같은 성장주 지표를 실제 공시 숫자로 뽑아낼 수 있다. 실적발표 보도자료를 GAAP/Non-GAAP 구분해 읽는다.',
      gate: { lessons: 25, acc: 0.7, mature: 40 } },
    { n: 4, min: 470, title: '증권사 애널리스트 3년차',    job: '섹터 담당 애널리스트',
      desc: 'DCF와 역DCF로 "시장이 반영한 기대"를 역산하고, 컨퍼런스콜 Q&A에서 경영진이 피한 질문을 잡아낸다. 회계 회색지대를 안다.',
      gate: { lessons: 35, acc: 0.75, mature: 80, analyses: 3 } },
    { n: 5, min: 620, title: '펀드매니저 5년차',         job: '운용역 (Portfolio Manager)',
      desc: '해자·자본배분·경영진 품질을 공시 원문으로 판단하고, 거시(금리·유동성·사이클)를 개별 종목 밸류에이션과 연결한다. 포지션 사이징 원칙이 있다.',
      gate: { lessons: 45, acc: 0.8, mature: 120, analyses: 6, tutorTurns: 60 } },
    { n: 6, min: 770, title: '사모펀드 이사급',           job: 'PE Director / VP',
      desc: '9칸 사업모델을 회사 IR 없이도 스스로 채우고, 주주서한·리스크팩터 연도 비교로 사업 변화를 먼저 읽는다. 자기 투자 원칙 문서가 있다.',
      gate: { lessons: 62, acc: 0.85, mature: 180, analyses: 10, tutorTurns: 100, aiMin: 5 } },
    { n: 7, min: 900, title: '사모펀드 파트너 · 임원급',   job: '투자위원회 의사결정자',
      desc: '경영자 수준으로 회사를 이해한다. 튜터의 반론을 근거(공시·숫자)로 되받아치고, 자기 종목의 핵심 변수 3개와 그것이 틀렸을 때의 행동을 문서로 갖고 있다.',
      gate: { lessons: 78, acc: 0.9, mature: 240, analyses: 15, tutorTurns: 150, aiMin: 6 } }
  ];
  const GATE_LABEL = { lessons: '레슨 완료', acc: '퀴즈 정확도', mature: '숙련 용어(21일+)', analyses: '종목·공시 분석', tutorTurns: '튜터 대화(내 발언)', aiMin: 'AI 판정 레벨' };

  // ── 원천 지표 수집
  function metrics() {
    const S = Store.get(); const P = S.progress;
    const lessons = App.allLessons();   // 두 트랙 모두 (기업 이해 60 + 자산배분 24)
    const completed = lessons.filter(l => P.completed[l.id]);
    // 주차 가중치: 각 트랙 안에서 뒤로 갈수록 어렵다 (첫 주 1.0 → 마지막 주 2.0)
    const wOf = l => { const n = App.track(l.track).weeks.length; return 1 + (l.week - 1) / Math.max(1, n - 1); };
    const wsum = lessons.reduce((a, l) => a + wOf(l), 0);
    const wdone = completed.reduce((a, l) => a + wOf(l), 0);
    const quizzes = Object.values(P.quiz || {});
    const qTot = quizzes.reduce((a, q) => a + q.total, 0), qOk = quizzes.reduce((a, q) => a + q.score, 0);
    const acc = qTot ? qOk / qTot : 0;
    let mature = 0, learning = 0; for (const t of window.TERMS) { const c = S.cards[t.id]; if (!c || !c.last) continue; if (c.ivl >= 21) mature++; else learning++; }
    const cs = { mature, learning, all: window.TERMS.length };
    const analyses = (S.chats.analyses || []).length;
    const briefings = Object.keys(S.marketCache || {}).length;
    const notes = Object.values(S.marketCache || {}).filter(d => d.note && d.note.trim().length > 20).length;
    let tutorTurns = 0; for (const k in S.chats) if (k.startsWith('tutor_')) tutorTurns += S.chats[k].filter(m => m.role === 'user' && !/^\(시작\)/.test(m.content)).length;
    const ai = (S.level && S.level.ai) || null;
    return { lessons: completed.length, lessonsAll: lessons.length, lessonWeight: wdone / wsum, quizTaken: quizzes.length, acc, mature: cs.mature, learning: cs.learning, termsAll: cs.all, analyses, briefings, notes, tutorTurns, ai, days: App.daysSinceStart() };
  }

  // ── 점수 (0~1000)
  function score(m = metrics()) {
    const parts = {
      breadth:  Math.round(m.lessonWeight * 300),                                   // 지식 폭
      accuracy: Math.round(m.acc * Math.min(1, m.quizTaken / 40) * 200),           // 정확도 (표본 적으면 할인)
      terms:    Math.round((m.mature + 0.4 * m.learning) / m.termsAll * 200),       // 용어 숙련
      practice: Math.min(100, m.analyses * 12) + Math.min(50, m.briefings * 4) + Math.min(50, m.notes * 10), // 실전 적용
      tutor:    Math.min(100, m.tutorTurns * 1.5)                                   // 튜터 대화
    };
    const total = Math.round(Object.values(parts).reduce((a, b) => a + b, 0));
    return { total: Math.min(1000, total), parts, max: { breadth: 300, accuracy: 200, terms: 200, practice: 200, tutor: 100 } };
  }

  // ── 게이트 검사: 어떤 항목이 부족한지 반환 ([] 이면 통과)
  function gateMiss(lv, m) {
    const miss = [];
    for (const [k, need] of Object.entries(lv.gate)) {
      const have = k === 'acc' ? m.acc : k === 'aiMin' ? (m.ai ? m.ai.level : -1) : m[k];
      if (have < need) miss.push({ key: k, label: GATE_LABEL[k], need, have });
    }
    return miss;
  }
  const fmt = (k, v) => k === 'acc' ? Math.round(v * 100) + '%' : k === 'aiMin' ? (v < 0 ? '미판정' : 'Lv.' + v) : String(v);

  // ── 현재 레벨 (점수 + 게이트 모두 충족하는 최고 레벨)
  function current() {
    const m = metrics(); const sc = score(m);
    let lv = LADDER[0];
    for (const L of LADDER) { if (sc.total >= L.min && gateMiss(L, m).length === 0) lv = L; else break; }
    const next = LADDER[lv.n + 1] || null;
    let toNext = null;
    if (next) {
      const miss = gateMiss(next, m).map(x => `${x.label} ${fmt(x.key, x.have)} → ${fmt(x.key, x.need)}`);
      if (sc.total < next.min) miss.unshift(`점수 ${sc.total} → ${next.min}`);
      const pct = Math.min(1, Math.max(0, (sc.total - lv.min) / (next.min - lv.min)));
      toNext = { level: next, miss, pct };
    }
    return { level: lv, score: sc, metrics: m, next: toNext, ai: m.ai };
  }

  // ── 약점 추출 (튜터 프롬프트용)
  function weaknesses() {
    const S = Store.get(); const P = S.progress;
    // 틀린 퀴즈: 최근 것부터
    const wrong = [];
    for (const [id, q] of Object.entries(P.quiz || {})) { const L = App.lessonById(id); if (!L || !q.wrong) continue; for (const w of q.wrong) wrong.push({ date: q.date, lesson: `${L.track === 'alloc' ? '자산배분 ' : ''}${L.week}${L.unit} ${L.title}`, q: w.q, chosen: w.chosen, correct: w.correct }); }
    wrong.sort((a, b) => b.date.localeCompare(a.date));
    // 약한 용어: 틀린 횟수·낮은 ease
    const weakTerms = window.TERMS.map(t => ({ t, c: S.cards[t.id] })).filter(x => x.c && x.c.last && (x.c.lapses >= 1 || x.c.ease <= 1.9))
      .sort((a, b) => (b.c.lapses - a.c.lapses) || (a.c.ease - b.c.ease)).slice(0, 12).map(x => `${x.t.ko}(${x.t.en}, 틀림 ${x.c.lapses}회)`);
    // 강점: 완전히 끝낸 주차, 숙련 용어 많은 주차
    const strongWeeks = App.tracks().flatMap(t => t.weeks.filter(w => App.weekProgress(w.week, t.id) === 1).map(w => `${t.short} ${w.week}${t.unit} ${w.title}`));
    const recent = (S.chats.analyses || []).slice(-5).map(a => `${a.date} ${a.title}`);
    return { wrong: wrong.slice(0, 10), weakTerms, strongWeeks, recentAnalyses: recent };
  }

  // ── 튜터·분석 프롬프트에 붙일 학습자 수준 블록
  function context() {
    const c = current(); const w = weaknesses(); const m = c.metrics;
    const lines = [];
    lines.push(`## 학습자 수준 (앱이 자동 측정)`);
    lines.push(`- 시스템 레벨: **Lv.${c.level.n} ${c.level.title}** (${c.level.job}) — 점수 ${c.score.total}/1000. 기준: ${c.level.desc}`);
    if (c.ai) lines.push(`- AI 판정 레벨(최근 대화 품질 기준, ${c.ai.date}): Lv.${c.ai.level} ${LADDER[c.ai.level].title} — ${c.ai.reason}`);
    if (c.next) lines.push(`- 다음 레벨(Lv.${c.next.level.n} ${c.next.level.title})까지 부족한 것: ${c.next.miss.join(' / ') || '점수만 채우면 됨'}`);
    lines.push(`- 지표: 레슨 ${m.lessons}/${m.lessonsAll}, 퀴즈 정확도 ${Math.round(m.acc * 100)}% (${m.quizTaken}개 레슨), 숙련 용어 ${m.mature}/${m.termsAll}, 종목·공시 분석 ${m.analyses}회, 시장 브리핑 ${m.briefings}회, 튜터 대화 ${m.tutorTurns}턴, 학습 ${m.days}일째`);
    if (w.strongWeeks.length) lines.push(`- 강점(완주한 주차): ${w.strongWeeks.join(', ')}`);
    if (w.weakTerms.length) lines.push(`- 약한 용어: ${w.weakTerms.join(', ')}`);
    if (w.wrong.length) { lines.push(`- 최근 틀린 퀴즈 (이 개념들은 아직 흔들린다):`); for (const x of w.wrong) lines.push(`  · [${x.lesson}] ${x.q} → 학습자 답 "${x.chosen}" / 정답 "${x.correct}"`); }
    if (w.recentAnalyses.length) lines.push(`- 최근 분석 기록: ${w.recentAnalyses.join(' / ')}`);
    return lines.join('\n');
  }

  // ── 난이도 규칙 (레벨에 따라 튜터가 달라지는 부분)
  function tutorRules() {
    const c = current(); const n = Math.max(c.level.n, c.ai ? c.ai.level : 0);
    let mode;
    if (n <= 2) mode = `- 지금은 **기초 다지기 모드**. 새 용어마다 한 줄 정의를 붙이고, 비유(외식업)를 먼저 쓴 뒤 숫자로. 계산은 한 단계씩.`;
    else if (n <= 4) mode = `- 지금은 **실무자 모드**. 기본 용어 정의는 생략하고 바로 공시 숫자로 들어가라. 설명하지 말고 **계산을 시켜라** ("직접 ROIC를 구해보세요"). 학습자가 낸 숫자의 가정을 물어라.`;
    else mode = `- 지금은 **투자위원회 모드**. 당신은 우호적 튜터가 아니라 **반대편 위원**이다. 학습자 답에 반론을 제기하고("그 가정이 틀리면?"), 엣지케이스를 던지고, 근거를 공시 원문 어디에서 봤는지 요구하라. 매 세션 최소 한 번은 학습자가 틀릴 만한 질문을 포함하라.`;
    return `## 난이도 적응 규칙
${mode}
- **약점 우선**: 위 '약한 용어'·'틀린 퀴즈'의 개념이 대화 주제와 조금이라도 닿으면 그 개념을 먼저 파고들어 다시 검증하라. 맞히면 "이제 이건 됐습니다"라고 짚어 줘라.
- **자동 심화**: 학습자가 3턴 연속 정확하게 답하면 다음 턴부터 한 단계 어렵게(정의→계산→가정 공격→반론 순). 반대로 2턴 연속 막히면 한 단계 쉽게. 난이도를 바꿀 때는 한 줄로 알려라 (예: "한 단계 올립니다").
- **다음 레벨 목표**: 다음 레벨에 부족한 항목이 대화로 채울 수 있는 것(개념 이해·계산·공시 해석)이면 그쪽으로 질문을 유도하라.`;
  }

  // ── AI 판정 프롬프트: 최근 튜터 대화를 보고 레벨을 매긴다
  function judgePrompt() {
    const S = Store.get(); const c = current();
    const convo = [];
    for (const k of Object.keys(S.chats).filter(k => k.startsWith('tutor_'))) for (const m of S.chats[k].slice(-12)) convo.push(`[${k.replace('tutor_', '')} ${m.role === 'user' ? '학습자' : '튜터'}] ${m.content.slice(0, 700)}`);
    const sample = convo.slice(-40).join('\n');
    const ladder = LADDER.map(l => `Lv.${l.n} ${l.title} (${l.job}): ${l.desc}`).join('\n');
    return {
      system: `당신은 금융 교육 프로그램의 **냉정한 심사위원**이다. 학습자의 튜터 대화 기록만 보고, 학습자가 실제로 무엇을 이해하고 있는지를 아래 레벨 사다리에 대응시켜 판정한다. 관대하지 마라. 앱의 진도 점수는 참고만 하고, 판정 근거는 반드시 학습자 본인의 발언에서 찾아라. 학습자 발언이 너무 적으면(10턴 미만) 판정 가능 범위를 낮게 잡고 그 사실을 reason에 적어라.
## 레벨 사다리
${ladder}
## 앱이 측정한 참고 정보
${context()}
## 출력
JSON만 출력하라. 마크다운 코드펜스·서론 금지.
{"level": 0~7 정수, "confidence": "낮음|보통|높음", "reason": "판정 근거 2~3문장 (학습자 발언 인용 포함)", "strengths": ["실제 발언에서 확인된 강점 1~3개"], "gaps": ["다음 레벨로 가기 위해 메워야 할 구체적 구멍 1~3개"], "next": ["이번 주에 할 구체적 행동 1~3개 (어느 공시의 어느 섹션을 열어 무엇을 계산할지)"]}`,
      user: `## 최근 튜터 대화 기록 (${convo.length}턴 중 최근 ${Math.min(40, convo.length)}턴)\n${sample || '(대화 없음)'}\n\n위 사다리 기준으로 판정해 주세요.`
    };
  }
  async function judge() {
    const p = judgePrompt();
    const r = await Claude.complete({ system: p.system, messages: [{ role: 'user', content: p.user }], maxTokens: 900, temperature: 0.2, feature: 'level' });
    const clean = r.text.replace(/```json|```/g, '').trim(); const j = JSON.parse(clean.slice(clean.indexOf('{'), clean.lastIndexOf('}') + 1));
    j.level = Math.max(0, Math.min(7, parseInt(j.level, 10) || 0)); j.date = Store.today();
    const S = Store.get(); S.level = S.level || {}; S.level.ai = j; S.level.history = (S.level.history || []).concat([{ date: j.date, level: j.level, score: current().score.total }]).slice(-60); Store.save();
    return j;
  }
  return { LADDER, GATE_LABEL, metrics, score, current, weaknesses, context, tutorRules, judge, judgePrompt, gateMiss, fmt };
})();
