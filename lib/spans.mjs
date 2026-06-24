// Keep only lang-spans matching `keep`, unwrapped (inner preserved); drop the
// other language's lang-spans. <span> nesting aware.
export function unwrapLang(html, keep) {
  const openOrClose = /<span\b([^>]*)>|<\/span>/g;

  function process(str) {
    let result = '';
    let pos = 0;
    openOrClose.lastIndex = 0;
    let m;
    while ((m = openOrClose.exec(str)) !== null) {
      if (m[0][1] === '/') continue; // closing tag at top level: ignore, copied via slice
      const lang = /\blang="(nl|en)"/.exec(m[1] || '');
      if (!lang) continue; // non-lang span: leave in place
      result += str.slice(pos, m.index); // copy text before this lang span

      // find matching close, counting nesting from just after the opening tag
      const innerStart = openOrClose.lastIndex;
      const scan = /<span\b[^>]*>|<\/span>/g;
      scan.lastIndex = innerStart;
      let depth = 1, s, innerEnd = str.length, afterClose = str.length;
      while ((s = scan.exec(str)) !== null) {
        if (s[0][1] === '/') {
          if (--depth === 0) { innerEnd = s.index; afterClose = scan.lastIndex; break; }
        } else depth++;
      }

      if (lang[1] === keep) result += process(str.slice(innerStart, innerEnd));
      pos = afterClose;
      openOrClose.lastIndex = afterClose;
    }
    result += str.slice(pos);
    return result;
  }

  return process(html);
}
