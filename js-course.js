// course.js — 외부 강의 연동 화면. 강의(data/course-*.js) 순서대로 앱 레슨을 재구성한 학습 경로.
// 진도: Store.get().progress.course[courseId + ':' + 강의번호] = 날짜 (강의 시청 체크)
const Course = (() => {
  const h = App.h;
  const list = () => Object.values(window.COURSES || {});
  const get = id => (window.COURSES || {})[id] || list()[0];
  const lectures = c => c.parts.flatMap(p => p.lectures.map(l => Object.assign({ part: p.part, partTitle: p.title }, l)));
  function prog() { const P = Store.get().progress; P.course = P.course || {}; return P.course; }
  const watched = (c, l) => !!prog()[c.id + ':' + l.n];
  function toggle(c, l) { const p = prog(); const k = c.id + ':' + l.n; if (p[k]) delete p[k]; else { p[k] = Store.today(); Store.touchStreak(); } Store.save(); }
  function next(c) { return lectures(c).find(l => !watched(c, l)) || null; }
  function done(c) { return lectures(c).filter(l => watched(c, l)).length; }
  function findLecture(c, n) { return lectures(c).find(l => l.n === n); }
  // 튜터용 맥락: 강의 한 편의 핵심 + 교재 페이지
  function tutorContext(c, l) {
    if (!c || !l) return '';
    return `\n## 학습자가 방금 본 외부 강의 (${c.title} ${l.n} ${l.title})\n강의 핵심: ${l.key}\n${l.slides && l.slides.length ? `교재 페이지: p.${l.slides.join(', ')}` : ''}\n이 강의의 용어·공식·사례(예: 삼성전자, 한화오션, A/B 사업부)를 그대로 써서 질문하라. 첫 질문은 강의 핵심을 학습자의 말로 다시 설명하게 하는 것으로 시작하라.`;
  }
  // 주간 계획: 추천 순서(plan.order)에서 아직 안 본 강의를 perWeek개씩 → 현재 주차 = 첫 미시청 강의 위치 / perWeek
  function weekPlan(c) {
    const P = c.plan; if (!P) return null; const ord = P.order.map(n => findLecture(c, n)).filter(Boolean);
    const i = ord.findIndex(l => !watched(c, l)); if (i < 0) return { done: true, week: P.weeks.length, items: [], teach: '', apply: '' };
    const w = Math.floor(i / P.perWeek); const items = ord.slice(w * P.perWeek, (w + 1) * P.perWeek);
    const wk = P.weeks[Math.min(w, P.weeks.length - 1)] || {}; const P2 = prog();
    return { week: w + 1, total: Math.ceil(ord.length / P.perWeek), items, teach: wk.teach || '', apply: wk.apply || '', teachDone: !!P2[c.id + ':teach' + (w + 1)], applyDone: !!P2[c.id + ':apply' + (w + 1)], w };
  }
  function toggleKey(c, k) { const p = prog(); if (p[k]) delete p[k]; else { p[k] = Store.today(); Store.touchStreak(); } Store.save(); }
  const mins = d => d ? Math.round(+d.split(':')[0] + (+d.split(':')[1] || 0) / 60) : 0;
  function planCard(c, onChange) {
    const pl = weekPlan(c); if (!pl) return null;
    if (pl.done) return h(`<div class="card"><b>📅 추천 진도 완주!</b> <span class="small muted">모든 강의를 봤습니다.</span></div>`);
    const tot = pl.items.reduce((a, l) => a + mins(l.dur), 0); const doneN = pl.items.filter(l => watched(c, l)).length;
    const el = h(`<div class="card" style="border-left:4px solid var(--accent)"><div class="row spread"><b>📅 이번 주 할 것 — ${pl.week}/${pl.total}주차</b><span class="small muted">강의 ${doneN}/${pl.items.length} · 약 ${tot}분</span></div>
      <div class="small muted" style="margin:4px 0 8px">평일 하루 1편: 강의 → ▶ 체크 → 짝 레슨 퀴즈 → "이 강의로 튜터"에서 내 말로 설명</div>
      <div id="items"></div>
      <div class="lesson-row" style="cursor:default"><button class="check ${pl.teachDone ? 'done' : ''}" data-k="teach" style="cursor:pointer;${pl.teachDone ? '' : 'background:var(--surface-2)'}">${pl.teachDone ? '✓' : '토'}</button><div><b>토요일 · 가르치기 30분</b><div class="small muted">${MD.inline(pl.teach)}</div></div></div>
      <div class="lesson-row" style="cursor:default"><button class="check ${pl.applyDone ? 'done' : ''}" data-k="apply" style="cursor:pointer;${pl.applyDone ? '' : 'background:var(--surface-2)'}">${pl.applyDone ? '✓' : '일'}</button><div><b>일요일 · 내 종목에 적용 + 카드 복습</b><div class="small muted">${MD.inline(pl.apply)}</div></div></div></div>`);
    const it = el.querySelector('#items');
    pl.items.forEach((l, i) => { const w = watched(c, l); const row = h(`<div class="lesson-row" style="cursor:default"><button class="check ${w ? 'done' : ''}" style="cursor:pointer;${w ? '' : 'background:var(--surface-2)'}">${w ? '✓' : ['월', '화', '수', '목', '금'][i] || '▶'}</button><div style="flex:1"><div class="row spread"><span><b>${l.n}</b> ${l.title}</span><span class="small muted">${l.dur || ''}</span></div></div><button class="btn small secondary" data-go="tutor" data-params='${JSON.stringify({ lessonId: l.lessons[0], course: c.id, lecture: l.n })}'>🎓</button></div>`); row.querySelector('.check').addEventListener('click', () => { toggle(c, l); onChange && onChange(); }); it.appendChild(row); });
    el.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => { toggleKey(c, c.id + ':' + b.dataset.k + pl.week); onChange && onChange(); }));
    return el;
  }
  // 앱 레슨 → 이 레슨과 짝인 강의 목록 (레슨 화면에서 표시)
  function lecturesForLesson(id) { return list().flatMap(c => lectures(c).filter(l => l.lessons.includes(id)).map(l => Object.assign({ course: c }, l))); }

  App.register('course', (view, { id, part } = {}) => {
    const c = get(id); if (!c) { view.appendChild(h(`<div class="card">연동된 강의가 없습니다.</div>`)); return; }
    const all = lectures(c); const n = done(c); const nx = next(c);
    view.appendChild(h(`<h1>📺 강의 연동 — ${c.title}</h1><p class="sub">${c.provider}. ${c.desc}</p>`));
    view.appendChild(h(`<div class="stats card"><div class="stat"><div class="n">${n}<span class="muted" style="font-size:14px">/${all.length}</span></div><div class="l">강의 시청</div></div><div class="stat"><div class="n">${c.parts.length}</div><div class="l">파트</div></div><div class="stat"><div class="n">${Math.round(all.flatMap(l => l.lessons).filter((v, i, a) => a.indexOf(v) === i).filter(App.isDone).length / all.flatMap(l => l.lessons).filter((v, i, a) => a.indexOf(v) === i).length * 100)}%</div><div class="l">짝 레슨 완료</div></div><div class="stat"><div class="n">${nx ? nx.n : '✓'}</div><div class="l">다음 강의</div></div></div>`));
    view.appendChild(h(`<div class="callout disc"><div class="t">이렇게 쓰세요</div><p>① 강의 한 편을 본다 → ② 여기서 <b>시청 체크</b> → ③ 짝이 되는 앱 레슨을 열어 퀴즈까지 → ④ <b>🎓 이 강의로 튜터</b>를 눌러 강의 핵심을 내 말로 설명해 본다. 튜터는 이 교재의 용어·공식·사례를 알고 있습니다.</p></div>`));
    const pc = planCard(c, () => App.go('course', { id: c.id, part })); if (pc) view.appendChild(pc);
    for (const p of c.parts) {
      const pl = p.lectures.filter(l => watched(c, l)).length;
      const open = part ? part === p.part : (nx ? nx.part === p.part : false);
      const box = h(`<div class="card"><div class="row spread" style="cursor:pointer" id="hd"><div><span class="pill info">PART ${p.part}</span> <b style="font-size:16px">${p.title}</b><div class="small muted" style="margin-top:4px">${p.hours} · ${p.goal}</div></div><span class="small muted">${pl}/${p.lectures.length} ${open ? '▲' : '▼'}</span></div><div class="progress" style="margin-top:8px"><div style="width:${pl / p.lectures.length * 100}%"></div></div><div id="body" ${open ? '' : 'hidden'}></div></div>`);
      const body = box.querySelector('#body');
      body.appendChild(h(`<div class="callout ceo" style="margin:12px 0"><div class="t">🍺 우리 사업에서</div><p>${MD.inline(p.biz)}</p></div>`));
      for (const l of p.lectures) {
        const w = watched(c, l);
        const row = h(`<div class="lesson-row" style="align-items:flex-start;cursor:default"><button class="check ${w ? 'done' : ''}" title="시청 체크" style="cursor:pointer;${w ? '' : 'background:var(--surface-2)'}">${w ? '✓' : '▶'}</button><div style="flex:1"><div class="row spread"><b>${l.n} ${l.title}</b><span class="small muted">${l.dur ? l.dur + ' · ' : ''}${l.slides && l.slides.length ? '교재 p.' + l.slides.join(',') : ''}</span></div><div class="chips" style="margin:6px 0">${l.lessons.map(id => { const L = App.lessonById(id); return L ? `<button class="chip ${App.isDone(id) ? 'active' : ''}" data-go="lesson" data-params='${JSON.stringify({ id })}'>${App.isDone(id) ? '✓ ' : ''}${L.week}주 ${L.day}일 ${L.title}</button>` : ''; }).join('')}</div><details class="small"><summary class="muted" style="cursor:pointer">강의 핵심 보기</summary><p style="margin:6px 0">${MD.inline(l.key)}</p></details><div class="row" style="margin-top:6px"><button class="btn small" data-go="tutor" data-params='${JSON.stringify({ lessonId: l.lessons[0], course: c.id, lecture: l.n })}'>🎓 이 강의로 튜터</button></div></div></div>`);
        row.querySelector('.check').addEventListener('click', () => { toggle(c, l); App.go('course', { id: c.id, part: p.part }); });
        Notes.linkTerms(row.querySelector('details')); Notes.enable(row, { source: 'course' });
        body.appendChild(row);
      }
      box.querySelector('#hd').addEventListener('click', () => { body.hidden = !body.hidden; box.querySelector('#hd span.small').textContent = `${pl}/${p.lectures.length} ${body.hidden ? '▼' : '▲'}`; });
      view.appendChild(box);
    }
    view.appendChild(h(`<div class="card small muted"><b>다른 강의를 연동하려면</b> <code>data-course-*.js</code>에 같은 형식(파트 → 강의 → 짝 레슨·핵심)으로 추가하면 여기 자동으로 나타납니다. 교재 원문은 저작권 때문에 앱에 넣지 않고, 핵심 공식·해석 원칙만 요약해 튜터에게 전달합니다.</div>`));
  });

  // 홈 카드
  function homeCard() {
    const c = list()[0]; if (!c) return null; const nx = next(c); const n = done(c), total = lectures(c).length;
    const pl = weekPlan(c); const wkTxt = pl && !pl.done ? `${pl.week}주차 ${pl.items.filter(l => watched(c, l)).length}/${pl.items.length} · ` : ''; const nxp = pl && !pl.done ? pl.items.find(l => !watched(c, l)) : nx;
    return h(`<div class="card clickable" data-go="course" data-params='${JSON.stringify({ id: c.id })}'><b>📺 ${c.short} · 이번 주 할 것</b><p class="small muted" style="margin:6px 0 0">${wkTxt}${nxp ? `다음 강의 ${nxp.n} ${nxp.title}${nxp.dur ? ' (' + nxp.dur + ')' : ''}` : '전 강의 시청 완료'} · 전체 ${n}/${total}</p></div>`);
  }
  return { list, get, lectures, watched, toggle, next, done, findLecture, tutorContext, lecturesForLesson, homeCard, weekPlan, planCard };
})();

window.Course = Course;
