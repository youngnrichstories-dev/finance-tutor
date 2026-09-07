// notes.js — 모르는 단어 체크 → 내 단어장(노트) + 용어 카드 연동
// 사용법: 레슨 본문·용어 정의·튜터 답변에서 단어를 드래그(또는 더블클릭)하면 "＋ 모르는 단어" 버튼이 뜬다.
// 용어집에 있는 단어는 본문에서 점선 밑줄로 표시되고 클릭하면 정의를 보여준다.
const Notes = (() => {
  const { h, toast } = App;
  function words() { const P = Store.get(); P.myWords = P.myWords || {}; return P.myWords; }
  function key(w) { return w.trim().toLowerCase().replace(/\s+/g, ' '); }
  function findTerm(w) { const k = key(w); const k2 = k.replace(/(은|는|이|가|을|를|의|에|로|과|와|도|에서|으로|이다|입니다)$/, '').trim(); return window.TERMS.find(t => t.ko.toLowerCase() === k || t.en.toLowerCase() === k) || window.TERMS.find(t => t.ko.toLowerCase() === k2 || t.en.toLowerCase().split(/[\s(/]/)[0] === k2); }
  // 단어 추가: 용어집에 있으면 그 정의, 없으면 (API 있으면) Claude에게 한 줄 정의 요청
  async function add(word, ctx = {}) {
    const W = words(); const k = key(word); if (!k || k.length > 40) { toast('단어가 너무 깁니다'); return; }
    if (W[k]) { toast(`이미 내 단어장에 있습니다: ${word}`); return W[k]; }
    const t = findTerm(word);
    const entry = { word: word.trim(), def: t ? t.def : '', hint: t ? t.hint : '', termId: t ? t.id : null, source: ctx.source || '', lessonId: ctx.lessonId || Store.get().progress.lastLesson || null, sentence: (ctx.sentence || '').slice(0, 200), note: '', date: Store.today(), status: t ? 'ready' : 'pending' };
    W[k] = entry; Store.save(); toast(`＋ 내 단어장에 추가: ${entry.word}`);
    if (!t) fetchDef(k).catch(() => {});
    return entry;
  }
  async function fetchDef(k) {
    const W = words(); const e = W[k]; if (!e) return;
    if (!Store.device().apiKey) { e.def = ''; e.status = 'nokey'; Store.save(); return; }
    e.status = 'loading'; Store.save();
    try {
      const L = e.lessonId ? App.lessonById(e.lessonId) : null;
      const r = await Claude.complete({ system: `당신은 금융 초보를 위한 용어 사전이다. ${Prompts.learner()}\n규칙: 한국어로, 학습자 레벨에 맞게, 2~3문장으로 정의하라. 첫 문장은 정의, 둘째 문장은 쉬운 비유나 예시, 셋째 문장(선택)은 관련 개념. 마지막 줄에 "💡 " 뒤에 기억 고리 한 구절. 마크다운 없이 평문.`, messages: [{ role: 'user', content: `단어: "${e.word}"${e.sentence ? `\n등장한 문장: "${e.sentence}"` : ''}${L ? `\n레슨: ${L.week}주차 ${L.title}` : ''}` }], maxTokens: 300, temperature: 0.3, feature: 'word' });
      const lines = r.text.trim().split('\n').filter(Boolean); const hint = lines.find(l => l.startsWith('💡')); e.def = lines.filter(l => !l.startsWith('💡')).join(' ').trim(); e.hint = hint ? hint.replace(/^💡\s*/, '') : ''; e.status = 'ready';
    } catch (err) { e.status = 'error'; e.def = ''; e.err = err.message; }
    Store.save(); document.dispatchEvent(new CustomEvent('notes:updated'));
  }
  function remove(k) { delete words()[k]; const c = Store.get().cards; delete c['my_' + k]; Store.save(); }
  // 용어 카드용 변환 (용어집에 없는 내 단어만 카드로 추가; 있는 건 원래 카드가 있음)
  function asCards() { return Object.entries(words()).filter(([k, e]) => !e.termId && e.def).map(([k, e]) => ({ id: 'my_' + k, ko: e.word, en: '내 단어', def: e.def, hint: e.hint || (e.sentence ? `"${e.sentence.slice(0, 60)}…"` : '내 단어장'), week: 0, mine: true })); }
  // 본문 안의 용어집 단어에 점선 밑줄 (텍스트 노드만, 용어당 첫 등장 1회)
  function linkTerms(root, exclude = []) {
    const terms = window.TERMS.filter(t => !exclude.includes(t.id) && t.ko.length >= 2).sort((a, b) => b.ko.length - a.ko.length);
    const seen = new Set(); const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.parentElement.closest('a,code,button,.term-link,h2,h3,th') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      let text = n.nodeValue; let frag = null; let pos = 0; const out = [];
      // 가장 앞에 나오는 용어부터 처리
      while (true) {
        let best = null;
        for (const t of terms) { if (seen.has(t.id)) continue; const i = text.indexOf(t.ko, pos); if (i >= 0 && (!best || i < best.i)) best = { i, t }; }
        if (!best) break;
        out.push(document.createTextNode(text.slice(pos, best.i)));
        const a = document.createElement('span'); a.className = 'term-link'; a.textContent = best.t.ko; a.dataset.term = best.t.id; a.title = best.t.en; out.push(a);
        seen.add(best.t.id); pos = best.i + best.t.ko.length;
      }
      if (out.length) { out.push(document.createTextNode(text.slice(pos))); frag = document.createDocumentFragment(); out.forEach(x => frag.appendChild(x)); n.parentNode.replaceChild(frag, n); }
    }
  }
  // 용어 팝오버 & 드래그 선택 버튼
  let pop = null;
  function closePop() { if (pop) { pop.remove(); pop = null; } }
  function showPop(x, y, html) { closePop(); pop = h(`<div class="term-pop">${html}</div>`); document.body.appendChild(pop); if (window.Speech) Speech.decorate(pop); const w = pop.offsetWidth, vw = window.innerWidth; pop.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + 'px'; pop.style.top = (y + window.scrollY + 8) + 'px'; }
  function enable(container, ctx = {}) {
    container.addEventListener('click', e => {
      const a = e.target.closest('.term-link'); if (!a) return;
      const t = window.TERMS.find(x => x.id === a.dataset.term); if (!t) return; const r = a.getBoundingClientRect();
      const inMy = !!words()[key(t.ko)];
      showPop(r.left + r.width / 2, r.bottom, `<b>${t.ko}</b> <span class="muted small"><span data-speak="${MD.esc(t.en)}">${t.en} 🔊</span> · ${t.week}주차</span><div style="margin:6px 0">${MD.inline(t.def)}</div><div class="small muted">💡 ${MD.inline(t.hint)}</div><div class="row" style="margin-top:8px"><button class="btn small ${inMy ? 'secondary' : ''}" id="pp-add">${inMy ? '✓ 내 단어장에 있음' : '＋ 내 단어장에 추가'}</button><button class="btn small secondary" id="pp-close">닫기</button></div>`);
      pop.querySelector('#pp-add').addEventListener('click', () => { add(t.ko, Object.assign({ source: 'term' }, ctx)); closePop(); });
      pop.querySelector('#pp-close').addEventListener('click', closePop);
      e.stopPropagation();
    });
    const onSel = () => {
      setTimeout(() => {
        const sel = window.getSelection(); const txt = sel && sel.toString().trim();
        if (!txt || txt.length < 1 || txt.length > 30 || /\n/.test(txt)) return;
        if (!sel.anchorNode || !container.contains(sel.anchorNode)) return;
        const range = sel.getRangeAt(0); const r = range.getBoundingClientRect();
        const sentence = (sel.anchorNode.textContent || '').trim();
        showPop(r.left + r.width / 2, r.bottom, `<div class="row"><button class="btn small" id="pp-add">＋ "${MD.esc(txt)}" 모르는 단어로 저장</button>${window.Speech && Speech.isEnglish(txt) ? `<button class="btn small secondary" id="pp-say">🔊 발음</button>` : ''}<button class="btn small secondary" id="pp-close">✕</button></div>`);
        const say = pop.querySelector('#pp-say'); if (say) say.addEventListener('click', () => Speech.speak(txt));
        pop.querySelector('#pp-add').addEventListener('click', () => { add(txt, Object.assign({ source: 'select', sentence }, ctx)); sel.removeAllRanges(); closePop(); });
        pop.querySelector('#pp-close').addEventListener('click', closePop);
      }, 10);
    };
    container.addEventListener('mouseup', onSel); container.addEventListener('touchend', onSel);
  }
  document.addEventListener('click', e => { if (pop && !pop.contains(e.target) && !e.target.closest('.term-link')) closePop(); });
  document.addEventListener('scroll', () => { if (pop && !pop.matches(':hover')) closePop(); }, { passive: true });

  // ───────── 내 노트 화면
  App.register('notes', (view) => {
    const W = words(); const list = Object.entries(W).sort((a, b) => b[1].date.localeCompare(a[1].date));
    const pending = list.filter(([k, e]) => e.status === 'nokey').length;
    view.appendChild(h(`<h1>📝 내 노트 — 모르는 단어장</h1><p class="sub">레슨·용어·튜터 답변에서 체크한 단어 ${list.length}개. 용어집에 없는 단어는 Claude가 정의를 붙이고, 모두 용어 카드 복습에 들어갑니다.</p>`));
    view.appendChild(h(`<div class="card"><b>단어 추가하는 법</b><p class="small muted" style="margin:6px 0 0">① 레슨 본문에서 <span class="term-link">점선 밑줄</span> 단어를 클릭 → "내 단어장에 추가" ② 아무 단어나 드래그(폰은 길게 눌러 선택) → "모르는 단어로 저장" ③ 아래 입력창에 직접 입력</p><div class="row" style="margin-top:10px"><input id="nw" placeholder="예: 유동부채" style="flex:1"><button class="btn small" id="nadd">추가</button></div>${pending ? `<p class="small err" style="margin:8px 0 0">${pending}개 단어는 API 키가 없어 정의를 못 붙였습니다. 설정에서 키를 넣고 "정의 다시 받기"를 누르세요.</p>` : ''}</div>`));
    view.querySelector('#nadd').addEventListener('click', async () => { const v = view.querySelector('#nw').value.trim(); if (!v) return; await add(v, { source: 'manual' }); App.go('notes'); });
    view.querySelector('#nw').addEventListener('keydown', e => { if (e.key === 'Enter') view.querySelector('#nadd').click(); });
    if (!list.length) { view.appendChild(h(`<div class="card muted">아직 체크한 단어가 없습니다. 레슨을 읽다가 모르는 말이 나오면 드래그해 보세요.</div>`)); return; }
    const box = h(`<div></div>`); view.appendChild(box);
    const draw = () => {
      box.innerHTML = '';
      for (const [k, e] of Object.entries(words()).sort((a, b) => b[1].date.localeCompare(a[1].date))) {
        const L = e.lessonId ? App.lessonById(e.lessonId) : null; const c = Store.get().cards[e.termId || ('my_' + k)];
        const st = e.status === 'loading' ? '<span class="spinner"></span> 정의 받는 중' : e.status === 'nokey' ? '<span class="err">정의 없음 (API 키 필요)</span>' : e.status === 'error' ? `<span class="err">정의 실패: ${MD.esc(e.err || '')}</span>` : e.status === 'pending' ? '정의 대기' : '';
        const card = h(`<div class="card"><div class="row spread"><div><b style="font-size:17px">${MD.esc(e.word)}</b> ${e.termId ? `<span class="pill small info">용어집</span> <span class="small muted" data-speak="${MD.esc((window.TERMS.find(x => x.id === e.termId) || {}).en || '')}">${MD.esc((window.TERMS.find(x => x.id === e.termId) || {}).en || '')} 🔊</span>` : '<span class="pill small">내 단어</span>'} <span class="small muted">${e.date}${L ? ` · ${L.week}주차 ${L.title}` : ''}${c && c.last ? ` · 카드 간격 ${c.ivl}일` : ' · 카드 미복습'}</span></div><span class="small muted">${st}</span></div>
          ${e.def ? `<div style="margin:8px 0 4px">${MD.inline(e.def)}</div>` : ''}${e.hint ? `<div class="small" style="color:var(--accent)">💡 ${MD.inline(e.hint)}</div>` : ''}${e.sentence ? `<div class="small muted" style="margin-top:4px">원문: "${MD.esc(e.sentence.slice(0, 120))}"</div>` : ''}
          <textarea class="mynote" placeholder="나만의 정리 — 내 말로 다시 쓰기, 내 사업에 빗대기, 헷갈리는 점" style="min-height:56px;margin-top:8px">${MD.esc(e.note || '')}</textarea>
          <div class="row" style="margin-top:8px"><button class="btn small secondary n-save">정리 저장</button>${e.status !== 'ready' && e.status !== 'loading' ? '<button class="btn small secondary n-refetch">정의 다시 받기</button>' : ''}<button class="btn small secondary n-ask">튜터에게 묻기</button><button class="btn small secondary n-del" style="margin-left:auto">삭제</button></div></div>`);
        card.querySelector('.n-save').addEventListener('click', () => { e.note = card.querySelector('.mynote').value; Store.save(); toast('저장됨'); });
        const rf = card.querySelector('.n-refetch'); if (rf) rf.addEventListener('click', async () => { e.status = 'pending'; Store.save(); draw(); await fetchDef(k); draw(); });
        card.querySelector('.n-ask').addEventListener('click', () => { const P = Store.get(); const Lid = e.lessonId || P.progress.lastLesson || App.nextLesson().id; const kk = 'tutor_' + Lid; P.chats[kk] = P.chats[kk] || []; P.chats[kk].push({ role: 'user', content: `"${e.word}"라는 단어를 잘 모르겠습니다.${e.sentence ? ` 이 문장에서 나왔어요: "${e.sentence}"` : ''} 질문으로 이끌어 주세요.` }); Store.save(); App.go('tutor', { lessonId: Lid }); });
        card.querySelector('.n-del').addEventListener('click', () => { remove(k); draw(); });
        box.appendChild(card);
      }
    };
    draw(); document.addEventListener('notes:updated', draw, { once: true });
    const exp = h(`<div class="card"><button class="btn secondary small" id="exp">단어장 텍스트로 복사</button> <span class="small muted">메모 앱·노션에 붙여넣기</span></div>`);
    exp.querySelector('#exp').addEventListener('click', async () => { const txt = Object.values(words()).map(e => `■ ${e.word}\n${e.def}${e.hint ? `\n💡 ${e.hint}` : ''}${e.note ? `\n내 정리: ${e.note}` : ''}`).join('\n\n'); try { await navigator.clipboard.writeText(txt); toast('복사됨'); } catch (er) { prompt('복사하세요', txt); } });
    view.appendChild(exp);
  });
  return { add, remove, words, asCards, linkTerms, enable, findTerm, fetchDef };
})();
