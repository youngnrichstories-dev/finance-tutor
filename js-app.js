// app.js — 라우터와 공용 헬퍼
const App = (() => {
  const routes = {};
  let current = { name: 'home', params: {} };
  function register(name, fn) { routes[name] = fn; }
  function go(name, params = {}) {
    if (!Store.active() && !['profiles','onboard','settings'].includes(name)) name = 'profiles';
    current = { name, params };
    document.querySelectorAll('.sidenav button').forEach(b => b.classList.toggle('active', b.dataset.go === name || (name === 'lesson' && b.dataset.go === 'curriculum')));
    const view = document.getElementById('view'); view.innerHTML = '';
    window.scrollTo(0, 0);
    try { routes[name](view, params); } catch (e) { view.innerHTML = `<div class="card err">화면 오류: ${MD.esc(e.message)}</div>`; console.error(e); }
    renderStreak();
  }
  function renderStreak() { const who = document.getElementById('who'); const a = Store.active(); who.textContent = a ? `👤 ${a.settings.name || '이름 없음'} · ${(Store.LEVELS[a.settings.level] || Store.LEVELS.beginner).label}` : '👤 사용자 선택'; const n = Store.currentStreak(); const el = document.getElementById('streak'); el.textContent = n ? `🔥 ${n}일 연속` : '오늘 첫 학습을 시작하세요'; el.className = 'pill ' + (n ? '' : 'muted'); }
  // ---- 커리큘럼 헬퍼
  const allLessons = () => window.CURRICULUM.flatMap(w => w.lessons.map(l => Object.assign({ week: w.week, weekTitle: w.title }, l)));
  function lessonById(id) { return allLessons().find(l => l.id === id); }
  function isDone(id) { return !!Store.get().progress.completed[id]; }
  function nextLesson() { return allLessons().find(l => !isDone(l.id)) || allLessons()[allLessons().length - 1]; }
  function currentWeek() { const n = nextLesson(); return n ? n.week : 12; }
  function level() { return Store.LEVELS[Store.get().settings.level] || Store.LEVELS.beginner; }
  function isFastWeek(week) { return week <= level().fastWeeks && !Store.get().progress.fastPassed[week]; }
  // 빠른 통과 테스트용 문제: 주차의 5개 레슨에서 각 1문항
  function fastQuiz(week) { const w = window.CURRICULUM.find(x => x.week === week); return w.lessons.map(l => { const q = l.quiz[Math.floor(Math.random() * l.quiz.length)]; return Object.assign({ lessonId: l.id, lessonTitle: l.title }, q); }); }
  function passWeek(week) { const P = Store.get().progress; P.fastPassed[week] = Store.today(); for (const l of window.CURRICULUM.find(x => x.week === week).lessons) if (!P.completed[l.id]) P.completed[l.id] = 'fast:' + Store.today(); Store.save(); }
  // 배치 테스트: 기초(1~4주) 4문항, 비율·성장(5~6주) 3문항, 밸류에이션·경영(7~9주) 3문항
  function placementQuiz() { const pick = (wk, day) => { const l = window.CURRICULUM.find(x => x.week === wk).lessons[day - 1]; const q = l.quiz[0]; return Object.assign({ week: wk }, q); }; return [pick(1,2), pick(2,3), pick(3,1), pick(4,3), pick(5,2), pick(5,3), pick(6,2), pick(7,1), pick(8,2), pick(9,1)]; }
  function placementLevel(answers, quiz) { let b = 0, r = 0, v = 0; quiz.forEach((q, i) => { const ok = answers[i] === q.a; if (q.week <= 4) b += ok; else if (q.week <= 6) r += ok; else v += ok; }); if (b >= 3 && r >= 2 && v >= 2) return { level: 'advanced', b, r, v }; if (b >= 3) return { level: 'intermediate', b, r, v }; return { level: 'beginner', b, r, v }; }
  function weekProgress(week) { const ls = window.CURRICULUM.find(w => w.week === week).lessons; return ls.filter(l => isDone(l.id)).length / ls.length; }
  function totalProgress() { const a = allLessons(); return a.filter(l => isDone(l.id)).length / a.length; }
  function daysSinceStart() { const s = new Date(Store.get().settings.startDate); return Math.max(0, Math.floor((Date.now() - s) / 86400000)); }
  // ---- 공용 UI
  function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); if (t.content.children.length === 1) return t.content.firstElementChild; const d = document.createElement('div'); d.append(t.content); return d; }
  function toast(msg, ms = 2200) { const t = h(`<div style="position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--text);color:var(--bg);padding:10px 16px;border-radius:999px;font-size:14px;z-index:99;box-shadow:var(--shadow)">${MD.esc(msg)}</div>`); document.body.appendChild(t); setTimeout(() => t.remove(), ms); }
  function needKey(view) {
    if (Store.device().apiKey) return false;
    view.appendChild(h(`<div class="card"><b>Claude API 키가 필요합니다.</b><p class="muted">이 기능(튜터·종목분석·시장 브리핑)은 Claude를 호출합니다. 레슨·퀴즈·용어 카드는 키 없이 사용할 수 있습니다.</p><button class="btn" data-go="settings">설정으로 이동</button></div>`));
    return true;
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) { go(b.dataset.go, b.dataset.params ? JSON.parse(b.dataset.params) : {}); } });
  window.addEventListener('DOMContentLoaded', () => { go(Store.active() ? 'home' : 'profiles'); });
  return { register, go, h, toast, needKey, allLessons, lessonById, isDone, nextLesson, currentWeek, level, isFastWeek, fastQuiz, passWeek, placementQuiz, placementLevel, weekProgress, totalProgress, daysSinceStart, current: () => current };
})();
