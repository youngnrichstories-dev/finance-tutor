// md.js — 아주 작은 마크다운 → HTML 변환기 (레슨 본문·튜터 답변용)
// 지원: #/##/### 제목, **굵게**, `코드`, 목록(-, 1.), 인용(>), 표(|), 문단, 링크
const MD = (() => {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function inline(s) {
    s = esc(s);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return s;
  }
  function render(src) {
    if (!src) return '';
    const lines = src.replace(/\r/g, '').split('\n');
    let out = [], i = 0;
    const flushP = (buf) => { if (buf.length) { out.push('<p>' + buf.map(inline).join('<br>') + '</p>'); buf.length = 0; } };
    let p = [];
    while (i < lines.length) {
      const L = lines[i];
      if (/^\s*$/.test(L)) { flushP(p); i++; continue; }
      let m;
      if ((m = L.match(/^(#{1,4})\s+(.*)/))) { flushP(p); const h = Math.min(m[1].length + 1, 4); out.push(`<h${h}>${inline(m[2])}</h${h}>`); i++; continue; }
      if (/^\s*>/.test(L)) { flushP(p); const b = []; while (i < lines.length && /^\s*>/.test(lines[i])) { b.push(lines[i].replace(/^\s*>\s?/, '')); i++; } out.push('<blockquote>' + render(b.join('\n')) + '</blockquote>'); continue; }
      if (/^\s*\|/.test(L)) {
        flushP(p); const rows = []; while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(lines[i]); i++; }
        const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        let html = '<table>'; let head = true;
        for (const r of rows) { if (/^\s*\|?\s*:?-{2,}/.test(r)) { head = false; continue; } const tag = head ? 'th' : 'td'; html += '<tr>' + cells(r).map(c => `<${tag}>${inline(c)}</${tag}>`).join('') + '</tr>'; }
        out.push(html + '</table>'); continue;
      }
      if (/^\s*[-*•]\s+/.test(L)) { flushP(p); out.push('<ul>'); while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) { out.push('<li>' + inline(lines[i].replace(/^\s*[-*•]\s+/, '')) + '</li>'); i++; } out.push('</ul>'); continue; }
      if (/^\s*\d+[.)]\s+/.test(L)) { flushP(p); out.push('<ol>'); while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { out.push('<li>' + inline(lines[i].replace(/^\s*\d+[.)]\s+/, '')) + '</li>'); i++; } out.push('</ol>'); continue; }
      if (/^\s*(---|\*\*\*)\s*$/.test(L)) { flushP(p); out.push('<hr>'); i++; continue; }
      p.push(L); i++;
    }
    flushP(p);
    return out.join('\n');
  }
  return { render, esc, inline };
})();
