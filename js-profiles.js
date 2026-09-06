// profiles.js — 사용자 프로필 선택 · 만들기(배치 테스트) · 레벨별 빠른 통과 테스트
(() => {
const { h, register, go, toast } = App;

// ───────────────────────── 프로필 선택
register('profiles', (view) => {
  const list = Store.list();
  view.appendChild(h(`<h1>누구세요?</h1><p class="sub">각자 자기 프로필로 학습합니다. 레벨·진도·카드·대화가 따로 저장됩니다. (같은 브라우저 안에서 구분되며, 다른 기기에서는 설정의 내보내기/가져오기로 옮깁니다)</p>`));
  const box = h(`<div class="grid2"></div>`);
  for (const p of list) {
    const s = p.settings; const lv = Store.LEVELS[s.level] || Store.LEVELS.beginner; const done = Object.keys(p.progress.completed).length;
    const c = h(`<div class="card clickable" style="display:flex;gap:14px;align-items:center"><div style="width:48px;height:48px;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;flex-shrink:0">${MD.esc((s.name || '?').slice(0, 1))}</div><div style="flex:1"><b>${MD.esc(s.name || '이름 없음')}</b> <span class="pill info small">${lv.label}</span><div class="small muted">${(Store.ROLES[s.role] || {}).label || ''} · 레슨 ${done}/${App.allLessons().length} · ${s.holdings ? MD.esc(s.holdings.slice(0, 30)) : '종목 미입력'}</div></div><span class="muted">›</span></div>`);
    c.addEventListener('click', () => { Store.select(p.id); go('home'); });
    box.appendChild(c);
  }
  const add = h(`<div class="card clickable" style="display:flex;gap:14px;align-items:center;border-style:dashed"><div style="width:48px;height:48px;border-radius:50%;background:var(--surface-2);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">＋</div><div><b>새 사용자 추가</b><div class="small muted">이름 → 배치 테스트(10문항, 3분) → 레벨 확인</div></div></div>`);
  add.addEventListener('click', () => go('onboard'));
  box.appendChild(add); view.appendChild(box);
  if (list.length) view.appendChild(h(`<p class="small muted" style="margin-top:14px">프로필 삭제·이름 변경은 각 프로필로 들어간 뒤 ⚙︎ 설정에서.</p>`));
});

// ───────────────────────── 새 사용자 만들기 (3단계: 정보 → 배치 테스트 → 레벨 확정)
register('onboard', (view) => {
  const draft = { name: '', role: 'family', holdings: '', profile: '' };
  let step = 1, quiz = null, answers = [], result = null;
  const wrap = h(`<div></div>`); view.appendChild(wrap);
  function render() {
    wrap.innerHTML = '';
    if (step === 1) {
      const f = h(`<div><h1>새 사용자 — 1/3 기본 정보</h1><p class="sub">튜터가 설명 방식과 비유를 맞추는 데 씁니다.</p>
        <div class="card">
          <div class="field"><label>이름 (호칭)</label><input id="name" value="${MD.esc(draft.name)}" placeholder="예: 미진"></div>
          <div class="field"><label>어떤 관계인가요?</label><div class="chips" id="roles">${Object.entries(Store.ROLES).map(([k, v]) => `<button class="chip ${draft.role === k ? 'active' : ''}" data-r="${k}">${v.label}</button>`).join('')}</div><div class="help" id="rolehelp">${Store.ROLES[draft.role].analogy}</div></div>
          <div class="field"><label>보유·관심 종목 (선택, 쉼표 구분)</label><input id="hold" value="${MD.esc(draft.holdings)}" placeholder="예: TSLA, AAPL, 삼성전자 — 없으면 비워두세요"></div>
          <div class="field"><label>한 줄 소개 (선택)</label><input id="prof" value="${MD.esc(draft.profile)}" placeholder="예: 매장 매니저, 주식은 처음 / 회사원, ETF만 해봄"></div>
          <div class="row spread"><button class="btn secondary" data-go="profiles">취소</button><button class="btn" id="next">다음: 배치 테스트 →</button></div>
        </div></div>`);
      f.querySelectorAll('#roles .chip').forEach(c => c.addEventListener('click', () => { draft.role = c.dataset.r; f.querySelectorAll('#roles .chip').forEach(x => x.classList.toggle('active', x === c)); f.querySelector('#rolehelp').textContent = Store.ROLES[draft.role].analogy; }));
      f.querySelector('#next').addEventListener('click', () => { draft.name = f.querySelector('#name').value.trim(); if (!draft.name) { toast('이름을 입력하세요'); return; } draft.holdings = f.querySelector('#hold').value.trim(); draft.profile = f.querySelector('#prof').value.trim(); quiz = App.placementQuiz(); answers = new Array(quiz.length).fill(-1); step = 2; render(); });
      wrap.appendChild(f);
    } else if (step === 2) {
      const f = h(`<div><h1>새 사용자 — 2/3 배치 테스트</h1><p class="sub">${MD.esc(draft.name)}님, 모르는 문제는 찍지 말고 "모르겠음"을 누르세요. 정직해야 맞는 레벨이 나옵니다. 결과는 언제든 바꿀 수 있습니다.</p><div class="card" id="qs"></div></div>`);
      const qs = f.querySelector('#qs');
      quiz.forEach((q, i) => {
        const d = h(`<div class="quiz-q"><div class="q">${i + 1}. ${MD.inline(q.q)}</div></div>`);
        q.options.forEach((o, oi) => { const b = h(`<button class="opt ${answers[i] === oi ? 'correct' : ''}">${MD.inline(o)}</button>`); b.addEventListener('click', () => { answers[i] = oi; d.querySelectorAll('.opt').forEach((x, xi) => x.classList.toggle('correct', xi === oi)); }); d.appendChild(b); });
        const skip = h(`<button class="opt ${answers[i] === -2 ? 'correct' : ''}" style="color:var(--muted)">모르겠음</button>`); skip.addEventListener('click', () => { answers[i] = -2; d.querySelectorAll('.opt').forEach((x, xi) => x.classList.toggle('correct', xi === q.options.length)); }); d.appendChild(skip);
        qs.appendChild(d);
      });
      const nav = h(`<div class="row spread" style="margin-top:14px"><button class="btn secondary" id="back">← 이전</button><button class="btn" id="done">결과 보기 →</button></div>`);
      nav.querySelector('#back').addEventListener('click', () => { step = 1; render(); });
      nav.querySelector('#done').addEventListener('click', () => { if (answers.some(a => a === -1)) { toast('모든 문항에 답하거나 "모르겠음"을 누르세요'); return; } result = App.placementLevel(answers, quiz); step = 3; render(); });
      qs.appendChild(nav); wrap.appendChild(f);
    } else {
      const lv = Store.LEVELS[result.level]; let chosen = result.level;
      const f = h(`<div><h1>새 사용자 — 3/3 레벨 확정</h1><p class="sub">기초(1~4주) ${result.b}/4 · 비율·성장(5~6주) ${result.r}/3 · 밸류에이션·경영(7~9주) ${result.v}/3</p>
        <div class="card"><div class="callout ceo" style="margin-top:0"><div class="t">추천 레벨: ${lv.label}</div><p>${lv.desc}</p></div>
        <p class="small muted">다른 레벨로 시작하고 싶으면 아래에서 바꾸세요. 중급·고급은 앞부분 주차를 '통과 테스트'(주차당 5문항, 4개 이상 정답)로 건너뛸 수 있고, 통과 못 하면 그 주차를 정독합니다.</p>
        <div id="lvs"></div>
        <h3>어디서 시작할까요?</h3>
        <p class="small muted">두 트랙은 병행할 수 있고 언제든 바꿀 수 있습니다. 금융 공부의 출발은 '내 돈을 어디에 얼마나 나눌 것인가'(자산배분)이고, 그다음이 '개별 회사를 읽는 법'(기업 이해)입니다.</p>
        <div id="trk"></div>
        <div class="row spread" style="margin-top:14px"><button class="btn secondary" id="back">← 다시 풀기</button><button class="btn" id="start">시작하기</button></div></div></div>`);
      const lvs = f.querySelector('#lvs'); let trackChoice = 'alloc';
      const trk = f.querySelector('#trk');
      const drawT = () => { trk.innerHTML = ''; [['alloc', '🧭 자산배분부터 (추천) — 6단계 24레슨: 입문 → 기초 → 중급 → 고급 → 전문가 → 마스터. 내 돈 전체의 설계도를 먼저 그립니다'], ['company', '🏢 기업 이해부터 — 12주 60레슨: 재무제표 → 밸류에이션 → 경영자 관점 → 공시 → 거시. 보유 종목을 경영자 수준으로 읽습니다']].forEach(([k, label]) => { const b = h(`<button class="opt ${trackChoice === k ? 'correct' : ''}">${label}</button>`); b.addEventListener('click', () => { trackChoice = k; drawT(); }); trk.appendChild(b); }); };
      drawT();
      const draw = () => { lvs.innerHTML = ''; for (const [k, v] of Object.entries(Store.LEVELS)) { const b = h(`<button class="opt ${chosen === k ? 'correct' : ''}"><b>${v.label}</b> — ${v.desc}${k === result.level ? ' <span class="pill small">추천</span>' : ''}</button>`); b.addEventListener('click', () => { chosen = k; draw(); }); lvs.appendChild(b); } };
      draw();
      f.querySelector('#back').addEventListener('click', () => { step = 2; render(); });
      f.querySelector('#start').addEventListener('click', () => { Store.create(Object.assign({}, draft, { level: chosen, track: trackChoice, placement: { date: Store.today(), b: result.b, r: result.r, v: result.v, recommended: result.level } })); toast(`${draft.name}님, 환영합니다`); go('home'); });
      wrap.appendChild(f);
    }
  }
  render();
});

// ───────────────────────── 주차 빠른 통과 테스트 (중급·고급)
register('fastpass', (view, { week, track }) => {
  const tid = track || App.activeTrackId(); const T = App.track(tid);
  const w = T.weeks.find(x => x.week === week); const quiz = App.fastQuiz(week, tid); const need = quiz.length - 1; let answered = 0, correct = 0;
  view.appendChild(h(`<div class="row spread"><span class="pill info">${tid === 'alloc' ? '🧭 ' : '🏢 '}${week}${T.unit} 통과 테스트</span><span class="small muted">${quiz.length}문항 · ${need}개 이상 정답이면 이 ${T.unit} 완료 처리</span></div><h1 style="margin-top:8px">${w.title}</h1><p class="sub">${w.goal}. 틀리면 해당 레슨 링크가 나옵니다 — 그 레슨만 읽고 다시 도전하세요.</p>`));
  const box = h(`<div class="card"></div>`);
  quiz.forEach((q, i) => {
    const d = h(`<div class="quiz-q"><div class="q">${i + 1}. ${MD.inline(q.q)} <span class="small muted">(${q.lessonTitle})</span></div></div>`);
    q.options.forEach((o, oi) => { const b = h(`<button class="opt">${MD.inline(o)}</button>`); b.addEventListener('click', () => { d.querySelectorAll('.opt').forEach(x => x.disabled = true); if (oi === q.a) { b.classList.add('correct'); correct++; } else { b.classList.add('wrong'); d.querySelectorAll('.opt')[q.a].classList.add('correct'); } d.appendChild(h(`<div class="why">${MD.inline(q.why)}${oi !== q.a ? ` · <a href="#" data-go="lesson" data-params='${JSON.stringify({ id: q.lessonId })}'>이 레슨 읽기 →</a>` : ''}</div>`)); if (++answered === quiz.length) finish(); }); d.appendChild(b); });
    box.appendChild(d);
  });
  const res = h(`<div></div>`); box.appendChild(res); view.appendChild(res);
  view.insertBefore(box, res);
  function finish() {
    if (correct >= need) { App.passWeek(week, tid); Store.touchStreak(); res.innerHTML = `<div class="callout ceo"><b>통과 ${correct}/${quiz.length}</b> — ${week}${T.unit}를 완료 처리했습니다. 용어 카드는 그대로 열리니 복습은 계속하세요.</div><div class="row"><button class="btn" data-go="curriculum" data-params='${JSON.stringify({ track: tid })}'>커리큘럼으로</button><button class="btn secondary" data-go="home">오늘 화면으로</button></div>`; }
    else res.innerHTML = `<div class="callout mkt"><b>${correct}/${quiz.length} — 아직입니다.</b> 틀린 문항의 레슨(위 링크)만 읽고 다시 도전하세요. 이 ${T.unit}를 그냥 정독해도 좋습니다.</div><div class="row"><button class="btn" data-go="fastpass" data-params='${JSON.stringify({ week, track: tid })}'>다시 도전</button><button class="btn secondary" data-go="curriculum" data-params='${JSON.stringify({ track: tid })}'>커리큘럼으로</button></div>`;
  }
});
})();
