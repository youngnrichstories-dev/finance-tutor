// app.js — 라우터와 공용 헬퍼
const App = (() => {
  const routes = {};
  let current = { name: 'home', params: {} };
  function register(name, fn) { routes[name] = fn; }
  function go(name, params = {}) {
    current = { name, params };
    document.querySelectorAll('.sidenav button').forEach(b => b.classList.toggle('active', b.dataset.go === name || (name === 'lesson' && b.dataset.go === 'curriculum')));
    const view = document.getElementById('view'); view.innerHTML = '';
    window.scrollTo(0, 0);
    try { routes[name](view, params); } catch (e) { view.innerHTML = `<div class="card err">화면 오류: ${MD.esc(e.message)}</div>`; console.error(e); }
    renderStreak();
  }
  function renderStreak() { const n = Store.currentStreak(); const el = document.getElementById('streak'); el.textContent = n ? `🔥 ${n}일 연속` : '오늘 첫 학습을 시작하세요'; el.className = 'pill ' + (n ? '' : 'muted'); }
  // ---- 커리큘럼 헬퍼
  const allLessons = () => window.CURRICULUM.flatMap(w => w.lessons.map(l => Object.assign({ week: w.week, weekTitle: w.title }, l)));
  function lessonById(id) { return allLessons().find(l => l.id === id); }
  function isDone(id) { return !!Store.get().progress.completed[id]; }
  function nextLesson() { return allLessons().find(l => !isDone(l.id)) || allLessons()[allLessons().length - 1]; }
  function currentWeek() { const n = nextLesson(); return n ? n.week : 12; }
  function weekProgress(week) { const ls = window.CURRICULUM.find(w => w.week === week).lessons; return ls.filter(l => isDone(l.id)).length / ls.length; }
  function totalProgress() { const a = allLessons(); return a.filter(l => isDone(l.id)).length / a.length; }
  function daysSinceStart() { const s = new Date(Store.get().settings.startDate); return Math.max(0, Math.floor((Date.now() - s) / 86400000)); }
  // ---- 공용 UI
  function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); if (t.content.children.length === 1) return t.content.firstElementChild; const d = document.createElement('div'); d.append(t.content); return d; }
  function toast(msg, ms = 2200) { const t = h(`<div style="position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--text);color:var(--bg);padding:10px 16px;border-radius:999px;font-size:14px;z-index:99;box-shadow:var(--shadow)">${MD.esc(msg)}</div>`); document.body.appendChild(t); setTimeout(() => t.remove(), ms); }
  function needKey(view) {
    if (Store.get().settings.apiKey) return false;
    view.appendChild(h(`<div class="card"><b>Claude API 키가 필요합니다.</b><p class="muted">이 기능(튜터·종목분석·시장 브리핑)은 Claude를 호출합니다. 레슨·퀴즈·용어 카드는 키 없이 사용할 수 있습니다.</p><button class="btn" data-go="settings">설정으로 이동</button></div>`));
    return true;
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) { go(b.dataset.go, b.dataset.params ? JSON.parse(b.dataset.params) : {}); } });
  window.addEventListener('DOMContentLoaded', () => { go(Store.get().settings.apiKey || Object.keys(Store.get().progress.completed).length ? 'home' : 'home'); });
  return { register, go, h, toast, needKey, allLessons, lessonById, isDone, nextLesson, currentWeek, weekProgress, totalProgress, daysSinceStart, current: () => current };
})();
