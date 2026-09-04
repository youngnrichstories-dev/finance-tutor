// views.js — 화면들: 오늘 / 커리큘럼 / 레슨 / 용어 카드 / 튜터 / 종목분석 / 오늘의 시장 / 설정
(() => {
const { h, register, go, toast } = App;

// ───────────────────────── 오늘 (홈)
register('home', (view) => {
  const S = Store.get(); const next = App.nextLesson(); const wk = App.currentWeek();
  const week = window.CURRICULUM.find(w => w.week === wk);
  const cs = SRS.stats(S.cards, wk); const total = Math.round(App.totalProgress() * 100);
  const day = App.daysSinceStart();
  view.appendChild(h(`
    <h1>${S.settings.name ? S.settings.name + '님, ' : ''}오늘의 학습</h1>
    <p class="sub">${App.level().label} 과정 · 시작한 지 ${day}일째 · ${wk}주차 「${week.title}」 · 전체 진도 ${total}%</p>
    <div class="progress" style="margin-bottom:18px"><div style="width:${total}%"></div></div>
    <div class="stats card">
      <div class="stat"><div class="n">${Object.keys(S.progress.completed).length}<span class="muted" style="font-size:14px">/60</span></div><div class="l">레슨 완료</div></div>
      <div class="stat"><div class="n">${cs.due}</div><div class="l">복습할 카드</div></div>
      <div class="stat"><div class="n">${cs.mature}<span class="muted" style="font-size:14px">/${cs.total}</span></div><div class="l">숙련 용어</div></div>
      <div class="stat"><div class="n">${Store.currentStreak()}</div><div class="l">연속 학습일</div></div>
    </div>`));
  if (App.isFastWeek(wk)) view.appendChild(h(`<div class="callout disc" style="margin-top:0"><div class="t">⚡ ${App.level().label} 과정: ${wk}주차는 통과 테스트로 건너뛸 수 있습니다</div><p>5문항 중 4개 이상 맞히면 이 주차가 완료 처리됩니다. 통과 못 하면 그 주차를 정독하세요.</p><div class="row" style="margin-top:8px"><button class="btn small" data-go="fastpass" data-params='${JSON.stringify({ week: wk })}'>${wk}주차 통과 테스트 (3분)</button><button class="btn small secondary" data-go="lesson" data-params='${JSON.stringify({ id: next.id })}'>그냥 정독하기</button></div></div>`));
  // 오늘의 3단계
  const steps = h(`<div class="card"><h2 style="margin-top:0">오늘의 루틴 (약 25분)</h2></div>`);
  const pr = window.PRACTICE[next.id] || {};
  steps.appendChild(h(`<div class="lesson-row" data-go="lesson" data-params='${JSON.stringify({ id: next.id })}'><span class="check ${App.isDone(next.id) ? 'done' : ''}">${App.isDone(next.id) ? '✓' : '1'}</span><div><b>레슨 · ${next.week}주차 ${next.day}일차 — ${next.title}</b><div class="small muted">${next.minutes}분 읽기 + 퀴즈 3문항 + 공시 읽기 연습 + 시장 흐름 연결</div></div></div>`));
  steps.appendChild(h(`<div class="lesson-row" data-go="cards"><span class="check">2</span><div><b>용어 카드 복습 — ${cs.due}장</b><div class="small muted">간격반복. 매일 10분이면 3개월 뒤에도 남습니다</div></div></div>`));
  steps.appendChild(h(`<div class="lesson-row" data-go="tutor" data-params='${JSON.stringify({ lessonId: next.id })}'><span class="check">3</span><div><b>튜터와 5분 — 소크라테스식 질문</b><div class="small muted">"${MD.esc(next.socratic.slice(0, 70))}…"</div></div></div>`));
  view.appendChild(steps);
  view.appendChild(h(`<div class="grid2">
    <div class="card clickable" data-go="market"><b>🌍 오늘의 시장</b><p class="small muted" style="margin:6px 0 0">이번 주 개념(${week.title})으로 오늘 시장을 읽습니다. 웹검색 기반 브리핑.</p></div>
    <div class="card clickable" data-go="stocks"><b>📊 종목분석 · 공시 해석</b><p class="small muted" style="margin:6px 0 0">${MD.esc(S.settings.holdings)} — 스캔하거나 공시 원문을 붙여넣어 해부합니다.</p></div>
  </div>`));
  if (!Store.device().apiKey) view.appendChild(h(`<div class="card"><b>처음이신가요?</b><p class="muted small" style="margin:6px 0 10px">설정에서 Claude API 키와 보유 종목을 입력하면 튜터·종목분석·시장 브리핑이 활성화됩니다. 레슨과 카드는 지금 바로 가능합니다.</p><button class="btn small" data-go="settings">설정 열기</button></div>`));
});

// ───────────────────────── 커리큘럼
register('curriculum', (view) => {
  const wk = App.currentWeek();
  const lv = App.level();
  view.appendChild(h(`<h1>12주 커리큘럼 <span class="pill info" style="font-size:13px;vertical-align:middle">${lv.label}</span></h1><p class="sub">${lv.fastWeeks ? `${lv.label} 과정: 1~${lv.fastWeeks}주차는 ⚡ 통과 테스트로 건너뛸 수 있습니다. ` : ''}재무제표(1~4주) → 비율·성장(5~6주) → 밸류에이션(7~8주) → 경영자 관점·공시(9~10주) → 거시·원칙(11~12주). 매 레슨에 공시 읽기 연습과 시장 흐름 연결이 포함됩니다.</p>`));
  const box = h(`<div class="card"></div>`);
  for (const w of window.CURRICULUM) {
    const p = App.weekProgress(w.week); const cls = p === 1 ? 'done' : w.week === wk ? 'cur' : '';
    const fast = App.isFastWeek(w.week);
    const row = h(`<div class="week-row"><div class="week-num ${cls}">${w.week}</div><div style="flex:1"><div class="row spread"><b>${w.title}</b><span class="row">${fast ? `<button class="btn small secondary" data-go="fastpass" data-params='${JSON.stringify({ week: w.week })}'>⚡ 통과 테스트</button>` : ''}<span class="small muted">${Math.round(p * 5)}/5</span></span></div><div class="small muted">${w.goal}</div><div class="progress" style="margin-top:6px"><div style="width:${p * 100}%"></div></div></div></div>`);
    row.style.cursor = 'pointer';
    row.addEventListener('click', (e) => { if (e.target.closest('[data-go]')) return; const ex = row.nextElementSibling; if (ex && ex.classList.contains('lessons')) { ex.remove(); return; } const ul = h(`<div class="lessons"></div>`); for (const l of w.lessons) ul.appendChild(h(`<div class="lesson-row" data-go="lesson" data-params='${JSON.stringify({ id: l.id })}'><span class="check ${App.isDone(l.id) ? 'done' : ''}">${App.isDone(l.id) ? '✓' : l.day}</span><div style="flex:1">${l.title}</div><span class="small muted">${l.minutes}분</span></div>`)); row.after(ul); });
    box.appendChild(row);
  }
  view.appendChild(box);
});

// ───────────────────────── 레슨
register('lesson', (view, { id }) => {
  const L = App.lessonById(id); if (!L) { go('curriculum'); return; }
  const pr = window.PRACTICE[L.id] || {}; const disc = L.disclosure || pr.disclosure || ''; const mkt = L.market || pr.market || '';
  const S = Store.get(); S.progress.lastLesson = id; Store.save();
  const all = App.allLessons(); const idx = all.findIndex(x => x.id === id); const prev = all[idx - 1], next = all[idx + 1];
  view.appendChild(h(`<div class="row spread"><span class="pill info">${L.week}주차 · ${L.day}일차</span><span class="small muted">${L.minutes}분 · ${L.weekTitle}</span></div><h1 style="margin-top:8px">${L.title}</h1>`));
  view.appendChild(h(`<div class="card lesson-body">${MD.render(L.body)}</div>`));
  view.appendChild(h(`<div class="callout ceo"><div class="t">👔 경영자 관점</div><p>${MD.inline(L.ceo)}</p></div>`));
  view.appendChild(h(`<div class="callout disc"><div class="t">📄 공시 읽기 연습 — 오늘 실제 IR 자료에서 할 것</div><p>${MD.inline(disc)}</p><div class="row" style="margin-top:8px"><button class="btn small secondary" data-go="stocks" data-params='{"tab":"disc"}'>공시 해석 모드로 이동</button></div></div>`));
  view.appendChild(h(`<div class="callout mkt"><div class="t">🌍 시장 흐름 연결 — 이 개념이 지금 세상과 닿는 곳</div><p>${MD.inline(mkt)}</p><div class="row" style="margin-top:8px"><button class="btn small secondary" data-go="market">오늘의 시장 브리핑 보기</button></div></div>`));
  // 용어
  const terms = L.terms.map(t => window.TERMS.find(x => x.id === t)).filter(Boolean);
  const tbox = h(`<div class="card"><h3 style="margin-top:0">오늘의 용어 ${terms.length}개</h3><div class="chips"></div><p class="small muted">용어 카드 탭에 자동 추가됩니다. 클릭하면 정의를 봅니다.</p></div>`);
  for (const t of terms) { const c = h(`<button class="chip">${t.ko} <span class="muted">${t.en}</span></button>`); c.addEventListener('click', () => { const ex = tbox.querySelector('.tdef'); if (ex) ex.remove(); tbox.appendChild(h(`<div class="tdef small" style="padding:8px 10px;background:var(--surface-2);border-radius:8px"><b>${t.ko}</b> — ${MD.inline(t.def)}<div class="muted">💡 ${MD.inline(t.hint)}</div></div>`)); }); tbox.querySelector('.chips').appendChild(c); }
  view.appendChild(tbox);
  // 퀴즈
  const qbox = h(`<div class="card"><h3 style="margin-top:0">확인 퀴즈</h3></div>`); let answered = 0, correct = 0;
  L.quiz.forEach((q, qi) => {
    const qd = h(`<div class="quiz-q"><div class="q">${qi + 1}. ${MD.inline(q.q)}</div></div>`);
    q.options.forEach((o, oi) => { const b = h(`<button class="opt">${MD.inline(o)}</button>`); b.addEventListener('click', () => { qd.querySelectorAll('.opt').forEach(x => x.disabled = true); if (oi === q.a) { b.classList.add('correct'); correct++; } else { b.classList.add('wrong'); qd.querySelectorAll('.opt')[q.a].classList.add('correct'); } qd.appendChild(h(`<div class="why">${oi === q.a ? '✓ 정답. ' : '✗ '}${MD.inline(q.why)}</div>`)); answered++; if (answered === L.quiz.length) finish(); }); qd.appendChild(b); });
    qbox.appendChild(qd);
  });
  const result = h(`<div id="qres"></div>`); qbox.appendChild(result); view.appendChild(qbox);
  const done = App.isDone(id);
  const foot = h(`<div class="card"><div class="row spread"><div><b>${done ? '✓ 완료한 레슨' : '레슨 완료하기'}</b><div class="small muted">퀴즈를 풀면 자동 완료됩니다. 완료 후 튜터와 5분 대화를 권합니다.</div></div><div class="row"><button class="btn secondary" id="markdone">${done ? '완료 취소' : '완료로 표시'}</button><button class="btn" data-go="tutor" data-params='${JSON.stringify({ lessonId: id })}'>🎓 튜터에게 질문받기</button></div></div></div>`);
  foot.querySelector('#markdone').addEventListener('click', () => { const P = Store.get().progress; if (P.completed[id]) delete P.completed[id]; else { P.completed[id] = Store.today(); Store.touchStreak(); } Store.save(); go('lesson', { id }); });
  view.appendChild(foot);
  view.appendChild(h(`<div class="row spread" style="margin:10px 0 30px">${prev ? `<button class="btn secondary small" data-go="lesson" data-params='${JSON.stringify({ id: prev.id })}'>← ${prev.title}</button>` : '<span></span>'}${next ? `<button class="btn secondary small" data-go="lesson" data-params='${JSON.stringify({ id: next.id })}'>${next.title} →</button>` : ''}</div>`));
  function finish() {
    const P = Store.get().progress; P.quiz[id] = { score: correct, total: L.quiz.length, date: Store.today() };
    if (!P.completed[id]) { P.completed[id] = Store.today(); Store.touchStreak(); toast(`레슨 완료! 퀴즈 ${correct}/${L.quiz.length}`); }
    Store.save(); result.innerHTML = `<div class="callout" style="margin-bottom:0"><b>퀴즈 결과 ${correct}/${L.quiz.length}</b> ${correct === L.quiz.length ? '— 완벽합니다.' : '— 틀린 문항의 해설을 다시 읽고, 튜터에게 그 개념을 물어보세요.'}</div>`;
    foot.querySelector('b').textContent = '✓ 완료한 레슨'; foot.querySelector('#markdone').textContent = '완료 취소'; App.go && document.getElementById('streak') && (function(){ const n=Store.currentStreak(); document.getElementById('streak').textContent = `🔥 ${n}일 연속`; })();
  }
});

// ───────────────────────── 용어 카드
register('cards', (view) => {
  const S = Store.get(); const wk = S.settings.allCards ? 12 : App.currentWeek();
  let st = SRS.stats(S.cards, wk);
  view.appendChild(h(`<h1>용어 카드</h1><p class="sub">${wk}주차까지의 용어 ${st.total}개 (전체 ${st.all}개). 카드를 눌러 뒤집고, 얼마나 쉽게 떠올렸는지 평가하세요.</p>`));
  const stats = h(`<div class="stats card"><div class="stat"><div class="n">${st.due}</div><div class="l">오늘 복습</div></div><div class="stat"><div class="n">${st.new}</div><div class="l">새 카드</div></div><div class="stat"><div class="n">${st.learning}</div><div class="l">학습 중</div></div><div class="stat"><div class="n">${st.mature}</div><div class="l">숙련 (21일+)</div></div></div>`);
  view.appendChild(stats);
  const opts = h(`<div class="row" style="margin-bottom:12px"><label class="small"><input type="checkbox" id="allc" style="width:auto" ${S.settings.allCards ? 'checked' : ''}> 12주 전체 용어 열기</label><button class="btn small secondary" id="browse">용어집 보기</button></div>`);
  opts.querySelector('#allc').addEventListener('change', e => { S.settings.allCards = e.target.checked; Store.save(); go('cards'); });
  view.appendChild(opts);
  let queue = SRS.dueCards(S.cards, wk).sort(() => Math.random() - .5).slice(0, 30);
  const area = h(`<div></div>`); view.appendChild(area);
  opts.querySelector('#browse').addEventListener('click', () => { area.innerHTML = ''; const box = h(`<div class="card"><input placeholder="용어 검색 (한글/영문)" id="q" style="margin-bottom:10px"><div id="list"></div></div>`); const list = box.querySelector('#list'); const draw = (q = '') => { list.innerHTML = ''; window.TERMS.filter(t => t.week <= wk && (!q || (t.ko + t.en + t.def).toLowerCase().includes(q.toLowerCase()))).forEach(t => { const c = S.cards[t.id]; list.appendChild(h(`<div style="padding:8px 0;border-bottom:1px solid var(--line)"><div class="row spread"><b>${t.ko} <span class="muted small">${t.en}</span></b><span class="small muted">${t.week}주 · ${c && c.last ? `간격 ${c.ivl}일` : '새 카드'}</span></div><div class="small">${MD.inline(t.def)}</div></div>`)); }); }; box.querySelector('#q').addEventListener('input', e => draw(e.target.value)); draw(); area.appendChild(box); });
  function show() {
    area.innerHTML = '';
    if (!queue.length) { area.appendChild(h(`<div class="card" style="text-align:center;padding:40px"><div style="font-size:40px">🎉</div><b>오늘 복습 완료</b><p class="muted small">내일 다시 오세요. 레슨을 진행하면 새 용어가 추가됩니다.</p><button class="btn secondary small" id="more">새 카드 10장 더 학습</button></div>`)); area.querySelector('#more').addEventListener('click', () => { queue = SRS.pool(wk).filter(t => !S.cards[t.id]).slice(0, 10); if (!queue.length) queue = SRS.pool(wk).sort(() => Math.random() - .5).slice(0, 10); show(); }); return; }
    const t = queue[0]; let flipped = false;
    const card = h(`<div class="card flash"><div class="small muted" style="margin-bottom:10px">${t.week}주차 · 남은 카드 ${queue.length}</div><div class="term">${t.ko}</div><div class="en">${t.en}</div><div class="def" hidden>${MD.inline(t.def)}<div class="hint">💡 ${MD.inline(t.hint)}</div></div><div class="small muted" style="margin-top:16px" id="tap">눌러서 뒤집기 (<kbd>Space</kbd>)</div></div>`);
    const rate = h(`<div class="rate" hidden><button class="r1"><b>다시</b><span>오늘 다시</span></button><button class="r2"><b>어려움</b><span>1~3일</span></button><button class="r3"><b>좋음</b><span>2~5일+</span></button><button class="r4"><b>쉬움</b><span>4~8일+</span></button></div>`);
    const flip = () => { if (flipped) return; flipped = true; card.querySelector('.def').hidden = false; card.querySelector('#tap').hidden = true; rate.hidden = false; };
    card.addEventListener('click', flip);
    rate.querySelectorAll('button').forEach((b, i) => b.addEventListener('click', () => { S.cards[t.id] = SRS.rate(S.cards[t.id], i + 1); Store.save(); Store.touchStreak(); queue.shift(); if (i === 0) queue.push(t); st = SRS.stats(S.cards, wk); stats.querySelectorAll('.n')[0].textContent = st.due; stats.querySelectorAll('.n')[3].textContent = st.mature; show(); }));
    const onKey = e => { if (!document.body.contains(card)) { document.removeEventListener('keydown', onKey); return; } if (e.code === 'Space') { e.preventDefault(); flip(); } else if (flipped && /^[1-4]$/.test(e.key)) rate.querySelectorAll('button')[+e.key - 1].click(); };
    document.addEventListener('keydown', onKey);
    area.appendChild(card); area.appendChild(rate);
    area.appendChild(h(`<p class="small muted" style="text-align:center;margin-top:10px">키보드: <kbd>Space</kbd> 뒤집기 · <kbd>1</kbd>~<kbd>4</kbd> 평가</p>`));
  }
  show();
});

// ───────────────────────── 튜터 (소크라테스식)
register('tutor', (view, { lessonId } = {}) => {
  view.appendChild(h(`<h1>🎓 튜터</h1><p class="sub">답을 주지 않고 질문으로 이끕니다. 막히면 "그냥 설명해줘"라고 하세요.</p>`));
  if (App.needKey(view)) return;
  const S = Store.get(); const chat = S.chats;
  const L = App.lessonById(lessonId || S.progress.lastLesson || App.nextLesson().id);
  const key = 'tutor_' + L.id; chat[key] = chat[key] || [];
  const ctx = h(`<div class="row spread" style="margin-bottom:10px"><span class="pill info">맥락: ${L.week}주차 ${L.day}일차 — ${L.title}</span><div class="row"><button class="btn small secondary" id="ctx">다른 레슨</button><button class="btn small secondary" id="clear">대화 지우기</button></div></div>`);
  ctx.querySelector('#clear').addEventListener('click', () => { chat[key] = []; Store.save(); go('tutor', { lessonId: L.id }); });
  ctx.querySelector('#ctx').addEventListener('click', () => { const sel = h(`<select style="margin:6px 0"></select>`); App.allLessons().forEach(l => sel.appendChild(h(`<option value="${l.id}" ${l.id === L.id ? 'selected' : ''}>${l.week}주 ${l.day}일 — ${l.title}</option>`))); sel.addEventListener('change', () => go('tutor', { lessonId: sel.value })); ctx.after(sel); });
  view.appendChild(ctx);
  const box = h(`<div class="chat"></div>`); view.appendChild(box);
  const chips = h(`<div class="chips"><button class="chip">그냥 설명해줘</button><button class="chip">내 보유 종목으로 예를 들어줘</button><button class="chip">이 개념이 공시 어디에 나와?</button><button class="chip">지금 시장 상황과 어떻게 연결돼?</button><button class="chip">이해했는지 퀴즈 내줘</button></div>`);
  view.appendChild(chips);
  const comp = h(`<div class="composer"><textarea id="inp" placeholder="답하거나 질문하세요… (Enter 전송, Shift+Enter 줄바꿈)"></textarea><button class="btn" id="send">전송</button></div>`); view.appendChild(comp);
  const inp = comp.querySelector('#inp'), send = comp.querySelector('#send');
  const draw = () => { box.innerHTML = ''; for (const m of chat[key]) box.appendChild(h(`<div class="msg ${m.role}">${MD.render(m.content)}</div>`)); box.scrollIntoView && window.scrollTo(0, document.body.scrollHeight); };
  draw();
  let busy = false;
  async function ask(text) {
    if (busy) return; busy = true; send.disabled = true;
    if (text) { chat[key].push({ role: 'user', content: text }); draw(); }
    const el = h(`<div class="msg assistant typing"></div>`); box.appendChild(el); window.scrollTo(0, document.body.scrollHeight);
    try {
      const msgs = chat[key].slice(-16).map(m => ({ role: m.role, content: m.content }));
      if (!msgs.length) msgs.push({ role: 'user', content: '(시작) 오늘 레슨의 튜터 시작 질문으로 시작해 주세요.' });
      const full = await Claude.stream({ system: Prompts.tutor(L), messages: msgs, onDelta: (_, acc) => { el.innerHTML = MD.render(acc); } });
      el.classList.remove('typing'); chat[key].push({ role: 'assistant', content: full }); Store.save(); Store.touchStreak();
    } catch (e) { el.classList.remove('typing'); el.innerHTML = `<span class="err">${MD.esc(e.message)}</span>`; }
    busy = false; send.disabled = false; inp.focus();
  }
  send.addEventListener('click', () => { const t = inp.value.trim(); if (!t) return; inp.value = ''; ask(t); });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send.click(); } });
  chips.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => ask(c.textContent)));
  if (!chat[key].length) ask(null);
});

// ───────────────────────── 종목분석 · 공시 해석
register('stocks', (view, { tab = 'scan' } = {}) => {
  view.appendChild(h(`<h1>📊 종목분석</h1><p class="sub">배운 틀(15분 스캔 · 세 줄 이야기 · 9칸 사업모델 · 역산 기대치)로 회사를 봅니다.</p>`));
  if (App.needKey(view)) return;
  const S = Store.get();
  const tabs = h(`<div class="tabs"><button data-t="scan" class="${tab === 'scan' ? 'active' : ''}">종목 스캔</button><button data-t="disc" class="${tab === 'disc' ? 'active' : ''}">공시 해석</button><button data-t="hist" class="${tab === 'hist' ? 'active' : ''}">기록</button></div>`);
  tabs.querySelectorAll('button').forEach(b => b.addEventListener('click', () => go('stocks', { tab: b.dataset.t }))); view.appendChild(tabs);
  S.chats.analyses = S.chats.analyses || [];
  const out = h(`<div></div>`);
  if (tab === 'scan') {
    const holds = S.settings.holdings.split(/[,\s]+/).filter(Boolean);
    const f = h(`<div class="card"><div class="field"><label>티커 또는 회사명</label><div class="row"><input id="tk" placeholder="예: TSLA" style="flex:1"><button class="btn" id="run">스캔</button></div><div class="chips" id="hc"></div><div class="help">웹검색(설정에서 켜짐)으로 최신 10-K·실적발표 기준 숫자를 찾습니다. 숫자는 반드시 원문에서 다시 확인하세요.</div></div></div>`);
    holds.forEach(t => { const c = h(`<button class="chip">${t}</button>`); c.addEventListener('click', () => { f.querySelector('#tk').value = t; }); f.querySelector('#hc').appendChild(c); });
    f.querySelector('#run').addEventListener('click', async () => { const tk = f.querySelector('#tk').value.trim(); if (!tk) return; await runAnalysis(out, { title: `${tk} 스캔`, system: Prompts.stockScan(tk), user: `${tk} 를 위 형식으로 스캔해 주세요. 웹 검색으로 최신 공시 숫자를 확인하세요.`, webSearch: S.settings.webSearch, maxTokens: 4000 }); });
    view.appendChild(f);
  } else if (tab === 'disc') {
    const f = h(`<div class="card"><div class="grid2"><div class="field"><label>문서 유형</label><select id="ty">${Object.entries(Prompts.disclosureTypes).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select></div><div class="field"><label>회사 (선택)</label><input id="tk" placeholder="예: PLTR"></div></div><div class="field"><label>공시 원문 붙여넣기</label><textarea id="tx" style="min-height:220px" placeholder="IR 페이지의 보도자료, 컨퍼런스콜 트랜스크립트 Q&A, 10-K의 한 섹션, 주주서한 등을 그대로 붙여넣으세요. 리스크 팩터 비교는 '=== 작년 ===' 과 '=== 올해 ===' 로 구분해서 붙여넣으세요."></textarea><div class="help">긴 문서는 핵심 섹션만(2~3만 자 이내). 먼저 직접 읽고, 튜터 해석과 비교하세요.</div></div><button class="btn" id="run">해부하기</button></div>`);
    f.querySelector('#run').addEventListener('click', async () => { const tx = f.querySelector('#tx').value.trim(); if (tx.length < 200) { toast('원문이 너무 짧습니다 (200자 이상)'); return; } const ty = f.querySelector('#ty').value, tk = f.querySelector('#tk').value.trim(); await runAnalysis(out, { title: `${tk || '공시'} · ${Prompts.disclosureTypes[ty].label}`, system: Prompts.disclosure(ty, tk), user: `다음 원문을 해부해 주세요.\n\n<원문>\n${tx.slice(0, 60000)}\n</원문>`, webSearch: false, maxTokens: 4000 }); });
    view.appendChild(f);
  } else {
    if (!S.chats.analyses.length) out.appendChild(h(`<div class="card muted">아직 기록이 없습니다.</div>`));
    for (const a of [...S.chats.analyses].reverse()) { const c = h(`<div class="card"><div class="row spread"><b>${MD.esc(a.title)}</b><span class="small muted">${a.date}</span></div><div class="lesson-body" hidden>${MD.render(a.text)}${srcHtml(a.sources)}</div><div class="row" style="margin-top:8px"><button class="btn small secondary tog">펼치기</button><button class="btn small secondary del">삭제</button></div></div>`); c.querySelector('.tog').addEventListener('click', e => { const b = c.querySelector('.lesson-body'); b.hidden = !b.hidden; e.target.textContent = b.hidden ? '펼치기' : '접기'; }); c.querySelector('.del').addEventListener('click', () => { S.chats.analyses = S.chats.analyses.filter(x => x !== a); Store.save(); go('stocks', { tab: 'hist' }); }); out.appendChild(c); }
  }
  view.appendChild(out);
  async function runAnalysis(out, { title, system, user, webSearch, maxTokens }) {
    out.innerHTML = ''; const c = h(`<div class="card"><span class="spinner"></span> <span class="muted small">${webSearch ? '웹검색과 함께 ' : ''}분석 중… 30초~1분 걸릴 수 있습니다.</span></div>`); out.appendChild(c);
    try {
      const r = await Claude.complete({ system, messages: [{ role: 'user', content: user }], webSearch, maxTokens, temperature: 0.3 });
      c.innerHTML = `<div class="row spread"><b>${MD.esc(title)}</b><span class="small muted">${Store.today()}</span></div><div class="lesson-body">${MD.render(r.text)}</div>${srcHtml(r.sources)}<div class="row" style="margin-top:10px"><button class="btn small secondary" id="ttq">이 분석으로 튜터와 대화</button></div>`;
      S.chats.analyses.push({ title, text: r.text, sources: r.sources, date: Store.today() }); if (S.chats.analyses.length > 40) S.chats.analyses.shift(); Store.save(); Store.touchStreak();
      c.querySelector('#ttq').addEventListener('click', () => { const L = App.lessonById(S.progress.lastLesson || App.nextLesson().id); const key = 'tutor_' + L.id; S.chats[key] = S.chats[key] || []; S.chats[key].push({ role: 'user', content: `방금 이런 분석을 받았습니다. 여기서 제가 스스로 답해야 할 질문부터 하나씩 물어봐 주세요.\n\n${r.text.slice(0, 6000)}` }); Store.save(); go('tutor', { lessonId: L.id }); });
    } catch (e) { c.innerHTML = `<span class="err">${MD.esc(e.message)}</span>`; }
  }
  function srcHtml(s) { return s && s.length ? `<div class="src">출처: ${s.map(x => `<a href="${x.url}" target="_blank" rel="noopener">${MD.esc((x.title || x.url).slice(0, 40))}</a>`).join('')}</div>` : ''; }
});

// ───────────────────────── 오늘의 시장
register('market', (view) => {
  const wk = App.currentWeek(); const w = window.CURRICULUM.find(x => x.week === wk);
  view.appendChild(h(`<h1>🌍 오늘의 시장</h1><p class="sub">웹검색으로 오늘 시장을 조사하고, 이번 주 개념 「${w.title}」으로 읽어줍니다. 예측이 아니라 '무슨 일이 있었고 내 종목과 어떻게 연결되는가'입니다.</p>`));
  if (App.needKey(view)) return;
  const S = Store.get(); const t = Store.today(); const cached = S.marketCache[t];
  const box = h(`<div></div>`); view.appendChild(box);
  const ctl = h(`<div class="row" style="margin-bottom:12px"><button class="btn" id="run">${cached ? '다시 브리핑 받기' : '오늘 브리핑 받기'}</button><span class="small muted">하루 1회 권장 · 웹검색 사용 · 약 1분</span></div>`);
  view.insertBefore(ctl, box);
  const render = (d) => { box.innerHTML = `<div class="card lesson-body">${MD.render(d.text)}${d.sources && d.sources.length ? `<div class="src">출처: ${d.sources.map(x => `<a href="${x.url}" target="_blank" rel="noopener">${MD.esc((x.title || x.url).slice(0, 40))}</a>`).join('')}</div>` : ''}</div><div class="card"><b>주말 루틴 문장 완성하기 (11주차)</b><p class="small muted">"이번 주 가장 큰 거시 변화는 ___. 내 종목 중 ___가 ___ 경로로 영향. 사이클 판단표 변화 ___. 행동 ___."</p><textarea id="note" placeholder="직접 완성해 보세요. 이 브리핑과 함께 저장됩니다.">${MD.esc(d.note || '')}</textarea><button class="btn small secondary" id="savenote" style="margin-top:8px">저장</button></div>`; box.querySelector('#savenote').addEventListener('click', () => { d.note = box.querySelector('#note').value; S.marketCache[t] = d; Store.save(); toast('저장됨'); }); };
  if (cached) render(cached);
  ctl.querySelector('#run').addEventListener('click', async () => {
    box.innerHTML = `<div class="card"><span class="spinner"></span> <span class="muted small">웹검색으로 오늘 시장을 조사 중…</span></div>`; ctl.querySelector('#run').disabled = true;
    try { const r = await Claude.complete({ system: Prompts.market(wk), messages: [{ role: 'user', content: `오늘(${t}) 시장 브리핑을 부탁합니다. 웹 검색으로 최신 수치와 뉴스를 확인하세요.` }], webSearch: true, maxTokens: 3500, temperature: 0.3 }); const d = { text: r.text, sources: r.sources, note: '' }; S.marketCache[t] = d; const keys = Object.keys(S.marketCache).sort(); while (keys.length > 60) delete S.marketCache[keys.shift()]; Store.save(); Store.touchStreak(); render(d); }
    catch (e) { box.innerHTML = `<div class="card err">${MD.esc(e.message)}</div>`; }
    ctl.querySelector('#run').disabled = false;
  });
  // 지난 브리핑
  const past = Object.keys(S.marketCache).filter(k => k !== t).sort().reverse().slice(0, 14);
  if (past.length) { const p = h(`<div class="card"><b>지난 브리핑</b><div class="chips"></div></div>`); past.forEach(k => { const c = h(`<button class="chip">${k}</button>`); c.addEventListener('click', () => render(S.marketCache[k])); p.querySelector('.chips').appendChild(c); }); view.appendChild(p); }
});

// ───────────────────────── 설정
register('settings', (view) => {
  const D = Store.device(); const P = Store.active(); const s = P ? P.settings : null;
  view.appendChild(h(`<h1>⚙︎ 설정</h1><p class="sub">API 키·모델은 이 브라우저 공통, 나머지는 현재 사용자(${s ? MD.esc(s.name) : '없음'}) 전용입니다.</p>`));
  const f = h(`<div class="card"><h3 style="margin-top:0">Claude 연결 (이 기기 공통)</h3>
    <div class="field"><label>Claude API 키</label><input id="key" type="password" value="${MD.esc(D.apiKey)}" placeholder="sk-ant-…"><div class="help">console.anthropic.com에서 발급. 키는 anthropic.com에만 전송됩니다. 튜터·종목분석·시장 브리핑에 필요. 레슨·카드는 키 없이 가능.</div></div>
    <div class="field"><label>모델</label><div class="row"><select id="model" style="flex:1"><option value="">${D.model ? MD.esc(D.model) : '키 저장 후 목록 불러오기'}</option></select><button class="btn secondary small" id="load">목록 불러오기</button></div><div class="help">비용을 아끼려면 Haiku, 깊은 분석은 Sonnet/Opus. 매일 튜터 5분 + 브리핑 1회는 Sonnet 기준 월 몇 달러 수준.</div></div>
    <div class="field"><label><input type="checkbox" id="ws" style="width:auto" ${D.webSearch ? 'checked' : ''}> 종목 스캔에 웹검색 사용</label></div>
    <button class="btn" id="savedev">연결 저장</button> <span id="msg" class="small muted"></span></div>`);
  const sel = f.querySelector('#model'); if (D.model) sel.value = D.model;
  f.querySelector('#load').addEventListener('click', async () => { D.apiKey = f.querySelector('#key').value.trim(); Store.save(); const m = f.querySelector('#msg'); m.innerHTML = '<span class="spinner"></span>'; try { const list = await Claude.listModels(); sel.innerHTML = list.map(x => `<option value="${x.id}">${MD.esc(x.name)} (${x.id})</option>`).join(''); const pick = D.model && list.find(x => x.id === D.model) ? D.model : (list.find(x => /sonnet/i.test(x.id)) || list[0]).id; sel.value = pick; m.textContent = `모델 ${list.length}개 · 키 확인됨`; } catch (e) { m.innerHTML = `<span class="err">${MD.esc(e.message)}</span>`; } });
  f.querySelector('#savedev').addEventListener('click', () => { D.apiKey = f.querySelector('#key').value.trim(); D.model = sel.value || D.model; D.webSearch = f.querySelector('#ws').checked; Store.save(); toast('연결 설정 저장됨'); });
  view.appendChild(f);
  if (!s) { view.appendChild(h(`<div class="card"><button class="btn" data-go="profiles">사용자 선택으로</button></div>`)); return; }
  const g = h(`<div class="card"><h3 style="margin-top:0">현재 사용자: ${MD.esc(s.name)}</h3>
    <div class="grid2"><div class="field"><label>이름</label><input id="name" value="${MD.esc(s.name)}"></div><div class="field"><label>시작일</label><input id="start" type="date" value="${s.startDate}"></div></div>
    <div class="field"><label>레벨</label><select id="lv">${Object.entries(Store.LEVELS).map(([k, v]) => `<option value="${k}" ${s.level === k ? 'selected' : ''}>${v.label} — ${v.desc}</option>`).join('')}</select><div class="help">${s.placement ? `배치 테스트(${s.placement.date}): 기초 ${s.placement.b}/4 · 비율 ${s.placement.r}/3 · 밸류에이션 ${s.placement.v}/3 → 추천 ${Store.LEVELS[s.placement.recommended].label}` : '배치 테스트 기록 없음'}</div></div>
    <div class="field"><label>관계 (튜터의 비유 방식)</label><select id="role">${Object.entries(Store.ROLES).map(([k, v]) => `<option value="${k}" ${s.role === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></div>
    <div class="field"><label>보유·관심 종목 (쉼표 구분)</label><input id="hold" value="${MD.esc(s.holdings)}"></div>
    <div class="field"><label>소개 (튜터가 눈높이를 맞추는 데 사용)</label><textarea id="prof" style="min-height:70px">${MD.esc(s.profile)}</textarea></div>
    <div class="row spread"><button class="btn" id="save">사용자 설정 저장</button><button class="btn secondary" data-go="profiles">다른 사용자로 전환</button></div></div>`);
  g.querySelector('#save').addEventListener('click', () => { s.name = g.querySelector('#name').value.trim() || s.name; s.startDate = g.querySelector('#start').value || s.startDate; s.level = g.querySelector('#lv').value; s.role = g.querySelector('#role').value; s.holdings = g.querySelector('#hold').value.trim(); s.profile = g.querySelector('#prof').value.trim(); Store.save(); toast('저장되었습니다'); App.go('settings'); });
  view.appendChild(g);
  const io = h(`<div class="card"><b>이 사용자의 진도 백업 · 기기 간 이동</b><p class="small muted">진도·카드·대화·설정(API 키 제외)을 JSON으로 내보냅니다. 다른 기기의 앱에서 '사용자 추가' 대신 여기 가져오기를 하면 이어서 학습합니다.</p><div class="row"><button class="btn secondary small" id="exp">내보내기 (복사)</button><button class="btn secondary small" id="imp">가져오기 (붙여넣기 → 새 사용자로)</button><button class="btn warn small" id="del">이 사용자 삭제</button></div><textarea id="io" style="margin-top:10px;min-height:70px" placeholder="여기에 붙여넣고 '가져오기'"></textarea></div>`);
  io.querySelector('#exp').addEventListener('click', async () => { const j = Store.exportProfile(); io.querySelector('#io').value = j; try { await navigator.clipboard.writeText(j); toast('클립보드에 복사됨'); } catch (e) { toast('아래 텍스트를 직접 복사하세요'); } });
  io.querySelector('#imp').addEventListener('click', () => { try { Store.importProfile(io.querySelector('#io').value); toast('가져오기 완료'); go('home'); } catch (e) { toast('JSON 형식이 올바르지 않습니다'); } });
  io.querySelector('#del').addEventListener('click', () => { if (confirm(`${s.name} 사용자의 진도·카드·대화를 모두 지웁니다. 계속할까요?`)) { Store.remove(P.id); go('profiles'); } });
  view.appendChild(io);
  view.appendChild(h(`<div class="card small muted"><b>이 앱에 대해</b><p style="margin:6px 0">깃허브 레퍼런스: 커리큘럼 구조는 Zerodha Varsity·financemasters, 튜터 구조(간격반복·소크라테스식·자료 업로드 해석)는 OpenTutor, 한국어 금융 멘토 톤은 hyufa를 참고해 만들었습니다. 순수 HTML/CSS/JS이며 <code>data-*.js</code> 파일의 레슨·용어를 수정해 자유롭게 확장할 수 있습니다.</p><p style="margin:6px 0">투자 판단은 본인 책임입니다. 이 앱과 AI 튜터는 교육 도구이며 매수·매도 조언을 하지 않습니다.</p></div>`));
});
})();
