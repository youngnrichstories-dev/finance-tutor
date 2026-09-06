// srs.js — 간격반복 스케줄러 (SM-2 변형, OpenTutor의 FSRS를 단순화한 버전)
// 카드 상태: { due: 'YYYY-MM-DD', ivl: 일수, ease: 난이도 계수, reps, lapses, last }
// 평가: 1 다시(틀림) / 2 어려움 / 3 좋음 / 4 쉬움
const SRS = (() => {
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
  function fresh() { return { due: Store.today(), ivl: 0, ease: 2.5, reps: 0, lapses: 0, last: null }; }
  function rate(card, q) {
    const c = Object.assign(fresh(), card || {});
    const t = Store.today();
    if (q === 1) { c.lapses++; c.reps = 0; c.ivl = 0; c.ease = Math.max(1.3, c.ease - 0.2); c.due = t; }           // 오늘 다시
    else {
      if (c.reps === 0) c.ivl = q === 2 ? 1 : q === 3 ? 2 : 4;
      else if (c.reps === 1) c.ivl = q === 2 ? 3 : q === 3 ? 5 : 8;
      else c.ivl = Math.round(c.ivl * (q === 2 ? 1.2 : q === 3 ? c.ease : c.ease * 1.4));
      c.ivl = Math.min(c.ivl, 120);
      c.ease = Math.max(1.3, Math.min(3.0, c.ease + (q === 2 ? -0.15 : q === 3 ? 0 : 0.15)));
      c.reps++; c.due = addDays(t, c.ivl);
    }
    c.last = t; return c;
  }
  // 학습 가능한 카드: 현재 진도 주차까지의 용어 (설정에서 '전체 열기' 가능)
  // 학습 가능한 카드: 트랙별 현재 진도까지의 용어 + 내 단어장 용어 (설정에서 '전체 열기' 가능)
  function pool(maxWeek) {
    const my = window.Notes ? Notes.words() : {}; const mine = new Set(Object.values(my).map(e => e.termId).filter(Boolean));
    const all = Store.get().settings.allCards; const wkC = all ? 99 : App.currentWeek('company'); const wkA = all ? 99 : App.currentWeek('alloc');
    const startedA = Object.keys(Store.get().progress.completed).some(id => id.startsWith('a')) || Store.get().settings.track === 'alloc';
    return window.TERMS.filter(x => { const tr = x.track || 'company'; if (mine.has(x.id)) return true; if (tr === 'company') return x.week <= wkC; return all || (startedA && x.week <= wkA); }).concat(window.Notes ? Notes.asCards() : []);
  }
  function dueCards(cards, maxWeek) {
    const t = Store.today();
    return pool(maxWeek).filter(term => { const c = cards[term.id]; return !c || c.due <= t; });
  }
  function stats(cards, maxWeek) {
    const p = pool(maxWeek); let neu = 0, learning = 0, mature = 0;
    for (const term of p) { const c = cards[term.id]; if (!c || c.reps === 0 && !c.last) neu++; else if (c.ivl >= 21) mature++; else learning++; }
    return { total: p.length, new: neu, learning, mature, due: dueCards(cards, maxWeek).length, all: window.TERMS.length };
  }
  return { rate, dueCards, stats, pool, fresh };
})();
