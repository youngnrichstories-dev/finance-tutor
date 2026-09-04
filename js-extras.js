// extras.js — (1) 영어 단어 발음 (Web Speech API)  (2) 아이디어·의견 신고 버튼 (오른쪽 하단)
const Speech = (() => {
  let voice = null;
  function pickVoice() { const vs = speechSynthesis.getVoices(); voice = vs.find(v => /en-US/i.test(v.lang) && /Samantha|Google US|Alex|Ava|Allison/i.test(v.name)) || vs.find(v => /^en[-_]US/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null; }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function speak(text) {
    if (!('speechSynthesis' in window)) { App.toast('이 브라우저는 음성 재생을 지원하지 않습니다'); return; }
    const t = String(text).replace(/\(.*?\)/g, ' ').replace(/[\/·]/g, ', ').trim(); if (!t) return;
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'en-US'; u.rate = 0.88; if (voice) u.voice = voice; speechSynthesis.speak(u);
  }
  const isEnglish = s => /^[A-Za-z][A-Za-z0-9 .,'&\/()\-]{0,60}$/.test(s.trim());
  // 화면 안의 영어 용어(.en, .term-en)를 클릭 가능하게 + 🔊 버튼
  function decorate(root) {
    root.querySelectorAll('[data-speak]').forEach(el => { if (el.dataset.speakReady) return; el.dataset.speakReady = '1'; el.classList.add('speakable'); el.title = '클릭하면 발음을 들려줍니다'; el.addEventListener('click', e => { e.stopPropagation(); speak(el.dataset.speak || el.textContent); }); });
  }
  // 새로 그려지는 화면마다 자동 적용
  const mo = new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) decorate(n); });
  document.addEventListener('DOMContentLoaded', () => { mo.observe(document.getElementById('view'), { childList: true, subtree: true }); decorate(document.body); });
  return { speak, isEnglish, decorate };
})();

const Feedback = (() => {
  const { h, toast } = App;
  const OWNER_EMAIL_DEFAULT = 'youngnrichstories@gmail.com';
  function items() { const d = Store.device(); d.feedback = d.feedback || []; return d.feedback; }
  function ownerEmail() { return Store.device().feedbackEmail || OWNER_EMAIL_DEFAULT; }
  function open() {
    const who = Store.active() ? Store.active().settings.name : ''; const cur = App.current();
    const where = cur.name === 'lesson' && cur.params.id ? `레슨 ${cur.params.id}` : cur.name;
    const m = h(`<div class="modal-bg"><div class="modal"><div class="row spread"><b>💡 아이디어 · 의견 보내기</b><button class="icon-btn" id="fb-x">✕</button></div>
      <p class="small muted" style="margin:6px 0 10px">앱을 쓰다가 떠오른 아이디어, 불편한 점, 오류, 궁금한 점을 적어주세요. 이 기기에 저장되고, 아래 버튼으로 관리자(${MD.esc(ownerEmail())})에게 보낼 수 있습니다.</p>
      <div class="chips" id="fb-type"><button class="chip active" data-t="아이디어">💡 아이디어</button><button class="chip" data-t="불편">😣 불편한 점</button><button class="chip" data-t="오류">🐛 오류</button><button class="chip" data-t="질문">❓ 질문</button><button class="chip" data-t="칭찬">👍 좋았던 점</button></div>
      <textarea id="fb-text" placeholder="예: 레슨 읽을 때 글자 크기를 키울 수 있으면 좋겠어요 / 3주차 2일 퀴즈 2번 답이 이상해요" style="min-height:110px"></textarea>
      <div class="small muted" style="margin:6px 0">보내는 사람: ${MD.esc(who || '(프로필 없음)')} · 화면: ${MD.esc(where)}</div>
      <div class="row spread" style="margin-top:8px"><button class="btn secondary small" id="fb-list">보낸 의견 보기 (${items().length})</button><div class="row"><button class="btn secondary" id="fb-save">저장만</button><button class="btn" id="fb-mail">저장하고 이메일로 보내기</button></div></div>
      <div id="fb-hist" hidden style="margin-top:12px;max-height:220px;overflow:auto"></div></div></div>`);
    let type = '아이디어';
    m.querySelectorAll('#fb-type .chip').forEach(c => c.addEventListener('click', () => { type = c.dataset.t; m.querySelectorAll('#fb-type .chip').forEach(x => x.classList.toggle('active', x === c)); }));
    const close = () => m.remove();
    m.querySelector('#fb-x').addEventListener('click', close); m.addEventListener('click', e => { if (e.target === m) close(); });
    const save = () => { const text = m.querySelector('#fb-text').value.trim(); if (!text) { toast('내용을 적어주세요'); return null; } const it = { type, text, who, where, date: new Date().toISOString().slice(0, 16).replace('T', ' '), sent: false }; items().push(it); Store.save(); return it; };
    m.querySelector('#fb-save').addEventListener('click', () => { if (save()) { toast('의견이 저장되었습니다. 고맙습니다!'); close(); } });
    m.querySelector('#fb-mail').addEventListener('click', () => { const it = save(); if (!it) return; it.sent = true; Store.save(); const subject = encodeURIComponent(`[금융근육 ${it.type}] ${it.text.slice(0, 30)}`); const body = encodeURIComponent(`유형: ${it.type}\n보낸 사람: ${it.who}\n화면: ${it.where}\n시간: ${it.date}\n\n${it.text}\n\n— 금융 근육 앱에서 보냄 (${location.href})`); window.location.href = `mailto:${ownerEmail()}?subject=${subject}&body=${body}`; toast('메일 앱이 열립니다. 전송 버튼을 눌러주세요'); close(); });
    m.querySelector('#fb-list').addEventListener('click', () => { const hbox = m.querySelector('#fb-hist'); hbox.hidden = !hbox.hidden; hbox.innerHTML = items().length ? [...items()].reverse().map(it => `<div style="padding:8px 0;border-bottom:1px solid var(--line)"><span class="pill small">${MD.esc(it.type)}</span> <span class="small muted">${it.date} · ${MD.esc(it.who || '')}${it.sent ? ' · 메일 보냄' : ''}</span><div class="small">${MD.esc(it.text)}</div></div>`).join('') + `<div class="row" style="margin-top:8px"><button class="btn small secondary" id="fb-copy">전체 복사</button></div>` : '<div class="small muted">아직 없습니다.</div>'; const cp = hbox.querySelector('#fb-copy'); if (cp) cp.addEventListener('click', async () => { const txt = items().map(it => `[${it.type}] ${it.date} ${it.who} (${it.where})\n${it.text}`).join('\n\n'); try { await navigator.clipboard.writeText(txt); toast('복사됨'); } catch (e) { prompt('복사하세요', txt); } }); });
    document.body.appendChild(m); m.querySelector('#fb-text').focus();
  }
  document.addEventListener('DOMContentLoaded', () => { const b = h(`<button class="fab" title="아이디어·의견 보내기">💡<span>의견</span></button>`); b.addEventListener('click', open); document.body.appendChild(b); });
  return { open, items, ownerEmail };
})();
