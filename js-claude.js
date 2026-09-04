// claude.js — Claude API 직접 호출 (브라우저에서, 사용자 본인 API 키 사용)
// 주의: 키는 이 브라우저의 localStorage에만 저장되고 anthropic.com 외 어디에도 전송되지 않습니다.
const Claude = (() => {
  const BASE = 'https://api.anthropic.com/v1';
  const VERSION = '2023-06-01';
  function headers() {
    const s = Store.device();
    if (!s.apiKey) throw new Error('설정에서 Claude API 키를 먼저 입력하세요.');
    return { 'content-type': 'application/json', 'x-api-key': s.apiKey, 'anthropic-version': VERSION, 'anthropic-dangerous-direct-browser-access': 'true' };
  }
  async function listModels() {
    const r = await safeFetch(BASE + '/models?limit=50', { headers: headers() });
    if (!r.ok) throw new Error('모델 목록 조회 실패 (' + r.status + '): ' + (await r.text()).slice(0, 200));
    const j = await r.json(); return (j.data || []).map(m => ({ id: m.id, name: m.display_name || m.id }));
  }
  function model() { return Store.device().model || 'claude-sonnet-4-5'; }
  // 모델이 지정되지 않았으면 목록에서 자동 선택(Sonnet 우선)해 저장
  async function ensureModel() {
    const d = Store.device(); if (d.model) return d.model;
    try { const list = await listModels(); const pick = (list.find(x => /sonnet/i.test(x.id)) || list[0]); if (pick) { d.model = pick.id; Store.save(); return d.model; } } catch (e) { console.warn('ensureModel', e); }
    return model();
  }
  async function safeFetch(url, opts) {
    try { return await fetch(url, opts); }
    catch (e) { throw new Error('Claude 서버에 연결하지 못했습니다 (' + e.message + '). 인터넷 연결을 확인하세요. 파일을 직접 열어(file://) 쓰는 중이라면 온라인 주소(https://youngnrichstories-dev.github.io/finance-tutor/)에서 사용하세요.'); }
  }
  // 비스트리밍 호출 (웹검색 도구 포함 가능). 반환: { text, sources[] }
  async function complete({ system, messages, maxTokens = 2500, webSearch = false, temperature = 0.5 }) {
    const body = { model: await ensureModel(), max_tokens: maxTokens, system, messages, temperature };
    if (webSearch) body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }];
    const r = await safeFetch(BASE + '/messages', { method: 'POST', headers: headers(), body: JSON.stringify(body) });
    if (!r.ok) {
      const t = await r.text();
      // 웹검색 도구가 거부되면 도구 없이 재시도
      if (webSearch && /tool|web_search/i.test(t)) return complete({ system, messages, maxTokens, webSearch: false, temperature });
      throw new Error(friendly(r.status, t));
    }
    const j = await r.json();
    let text = ''; const sources = [];
    for (const b of j.content || []) {
      if (b.type === 'text') { text += b.text; for (const c of b.citations || []) if (c.url) sources.push({ url: c.url, title: c.title || c.url }); }
      else if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) for (const x of b.content) if (x.url) sources.push({ url: x.url, title: x.title || x.url });
    }
    const seen = new Set(); const uniq = sources.filter(s => !seen.has(s.url) && seen.add(s.url)).slice(0, 8);
    return { text, sources: uniq, usage: j.usage };
  }
  // 스트리밍 호출 (튜터 대화). onDelta(textChunk) 콜백. 반환: 전체 텍스트
  async function stream({ system, messages, maxTokens = 1500, temperature = 0.6, onDelta }) {
    const body = { model: await ensureModel(), max_tokens: maxTokens, system, messages, temperature, stream: true };
    const r = await safeFetch(BASE + '/messages', { method: 'POST', headers: headers(), body: JSON.stringify(body) });
    if (!r.ok) throw new Error(friendly(r.status, await r.text()));
    const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = '', full = '';
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split('\n\n'); buf = parts.pop();
      for (const p of parts) {
        const line = p.split('\n').find(l => l.startsWith('data:')); if (!line) continue;
        try { const ev = JSON.parse(line.slice(5).trim());
          if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') { full += ev.delta.text; onDelta && onDelta(ev.delta.text, full); }
          if (ev.type === 'error') throw new Error(ev.error && ev.error.message || 'stream error');
        } catch (e) { if (e.message !== 'Unexpected end of JSON input') throw e; }
      }
    }
    return full;
  }
  function friendly(status, t) {
    if (status === 401) return 'API 키가 유효하지 않습니다. 설정에서 다시 확인하세요.';
    if (status === 404) { const d = Store.device(); d.model = ''; Store.save(); return '선택한 모델을 찾을 수 없어 초기화했습니다. 다시 시도하면 자동으로 사용 가능한 모델을 고릅니다.'; }
    if (status === 400) return '요청 오류 (400): ' + t.slice(0, 300);
    if (status === 429) return '요청 한도 초과. 잠시 후 다시 시도하세요.';
    if (status === 529 || status === 503) return 'Claude 서버가 혼잡합니다. 잠시 후 다시 시도하세요.';
    return `API 오류 (${status}): ${t.slice(0, 300)}`;
  }
  return { listModels, complete, stream, model, ensureModel };
})();
