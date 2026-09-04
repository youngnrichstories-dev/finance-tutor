// store.js — localStorage 기반 상태 저장. 여러 사용자(프로필) 지원.
// 구조: { device: {apiKey, model, webSearch}, activeId, profiles: { id: {settings, progress, cards, chats, marketCache, streak} } }
// API 키·모델은 기기(브라우저) 공통, 나머지(레벨·진도·카드·대화)는 프로필별.
const Store = (() => {
  const KEY = 'ft_v2', OLD_KEY = 'ft_v1';
  const LEVELS = {
    beginner: { label: '초급', desc: '금융 처음. 1주차부터 60레슨 전체를 하루 하나씩', fastWeeks: 0 },
    intermediate: { label: '중급', desc: '재무제표를 본 적 있음. 1~4주차는 통과 테스트로 빠르게, 5주차부터 정독', fastWeeks: 4 },
    advanced: { label: '고급', desc: '투자 경험 있음. 1~6주차는 통과 테스트로, 7주차 밸류에이션부터 정독', fastWeeks: 6 }
  };
  const ROLES = {
    staff: { label: '더서서 직원·파트너', analogy: '간빠맥주 매장 운영(재료비, 재방문율, 회전율, 프랜차이즈 확장)에 빗대어 설명' },
    family: { label: '가족·지인', analogy: '월급, 전세·대출, 동네 가게, 카페 창업 같은 일상 경험에 빗대어 설명' },
    owner: { label: '대표 (김정원)', analogy: '외식 프랜차이즈 경영자 관점에서, 자기 사업의 자본배분·유닛 이코노믹스와 연결' }
  };
  const newProfile = (o = {}) => ({
    id: o.id || ('p' + Date.now().toString(36)),
    settings: Object.assign({ name: '', role: 'family', level: 'beginner', holdings: '', profile: '', startDate: today(), allCards: false, placement: null }, o.settings || {}),
    progress: { completed: {}, quiz: {}, lastLesson: null, fastPassed: {} },
    cards: {}, chats: { tutor: [] }, marketCache: {}, streak: { days: [], best: 0 }
  });
  const defaults = () => ({ device: { apiKey: '', model: '', webSearch: true }, activeId: null, profiles: {} });
  let root = load();
  function today() { return new Date().toISOString().slice(0, 10); }
  function deepMerge(a, b) { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) a[k] = deepMerge(a[k] || {}, b[k]); else a[k] = b[k]; } return a; }
  function load() {
    try {
      const raw = localStorage.getItem(KEY); if (raw) return deepMerge(defaults(), JSON.parse(raw));
      const old = localStorage.getItem(OLD_KEY);   // v1(단일 사용자) 데이터 이전
      if (old) { const o = JSON.parse(old); const r = defaults(); r.device = { apiKey: o.settings.apiKey || '', model: o.settings.model || '', webSearch: o.settings.webSearch !== false };
        const p = newProfile({ settings: { name: o.settings.name || '', role: 'owner', level: 'beginner', holdings: o.settings.holdings || '', profile: o.settings.profile || '', startDate: o.settings.startDate || today(), allCards: !!o.settings.allCards } });
        Object.assign(p, { progress: Object.assign(p.progress, o.progress || {}), cards: o.cards || {}, chats: o.chats || { tutor: [] }, marketCache: o.marketCache || {}, streak: o.streak || { days: [], best: 0 } });
        r.profiles[p.id] = p; r.activeId = p.id; return r; }
    } catch (e) { console.warn('store load', e); }
    return defaults();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(root)); } catch (e) { console.warn('store save', e); } }
  // 프로필 관리
  function active() { return root.activeId && root.profiles[root.activeId] || null; }
  function get() { const p = active(); if (!p) throw new Error('프로필이 선택되지 않았습니다'); return p; }
  function list() { return Object.values(root.profiles); }
  function create(settings) { const p = newProfile({ settings }); root.profiles[p.id] = p; root.activeId = p.id; save(); return p; }
  function select(id) { if (root.profiles[id]) { root.activeId = id; save(); } }
  function remove(id) { delete root.profiles[id]; if (root.activeId === id) root.activeId = Object.keys(root.profiles)[0] || null; save(); }
  function device() { return root.device; }
  function touchStreak() { const s = get().streak; const t = today(); if (!s.days.includes(t)) { s.days.push(t); if (s.days.length > 400) s.days.splice(0, s.days.length - 400); } s.best = Math.max(s.best, currentStreak()); save(); }
  function currentStreak() { const p = active(); if (!p) return 0; const set = new Set(p.streak.days); let n = 0; const d = new Date(); if (!set.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1); while (set.has(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1); } return n; }
  return {
    get, active, list, create, select, remove, device, save, today, touchStreak, currentStreak, LEVELS, ROLES,
    exportProfile: () => JSON.stringify(get(), null, 2),
    importProfile: (json) => { const p = deepMerge(newProfile(), JSON.parse(json)); p.id = 'p' + Date.now().toString(36); root.profiles[p.id] = p; root.activeId = p.id; save(); return p; },
    resetAll: () => { root = defaults(); save(); }
  };
})();
