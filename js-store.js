// store.js — localStorage 기반 상태 저장 (설정·진도·카드·채팅)
// 모든 데이터는 이 브라우저에만 저장됩니다. 설정 탭에서 내보내기/가져오기로 기기 간 이동 가능.
const Store = (() => {
  const KEY = 'ft_v1';
  const defaults = () => ({
    settings: {
      apiKey: '', model: '', webSearch: true,
      name: '', holdings: 'TSLA, PLTR, BMNR', profile: '외식 프랜차이즈(간빠맥주) 공동대표. 미국 기술주·비트코인·AI 인프라에 투자 중. 금융 초보.',
      startDate: new Date().toISOString().slice(0, 10)
    },
    progress: { completed: {}, quiz: {}, lastLesson: null },
    cards: {},          // termId -> { due, ivl, ease, reps, lapses, last }
    chats: { tutor: [] },
    marketCache: {},    // date -> { text, sources }
    streak: { days: [], best: 0 }
  });
  let state = load();
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return deepMerge(defaults(), JSON.parse(raw)); } catch (e) { console.warn('store load', e); }
    return defaults();
  }
  function deepMerge(a, b) { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) a[k] = deepMerge(a[k] || {}, b[k]); else a[k] = b[k]; } return a; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('store save', e); } }
  function today() { return new Date().toISOString().slice(0, 10); }
  function touchStreak() {
    const t = today(); const d = state.streak.days;
    if (!d.includes(t)) { d.push(t); if (d.length > 400) d.splice(0, d.length - 400); }
    state.streak.best = Math.max(state.streak.best, currentStreak()); save();
  }
  function currentStreak() {
    const set = new Set(state.streak.days); let n = 0; const d = new Date();
    // 오늘 학습 안 했어도 어제까지 이어졌으면 유지
    if (!set.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
    while (set.has(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  return {
    get: () => state, save, today, touchStreak, currentStreak,
    export: () => JSON.stringify(state, null, 2),
    import: (json) => { const obj = JSON.parse(json); state = deepMerge(defaults(), obj); save(); },
    reset: () => { state = defaults(); save(); }
  };
})();
