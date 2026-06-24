// lib/attrs.mjs
// Per-language attribute overrides. Authors keep the NL text in the base
// attribute and add an English override as data-<attr>-en placed immediately
// after the base attribute: alt="<nl>" data-alt-en="<en>". For EN output the
// base value is replaced with the override; the data-<attr>-en attribute is
// stripped from both languages.
const OVERRIDABLE = ['alt', 'aria-label'];

export function applyLangAttrs(html, lang) {
  let out = html;
  for (const attr of OVERRIDABLE) {
    if (lang === 'en') {
      const swap = new RegExp(`${attr}="[^"]*"\\s+data-${attr}-en="([^"]*)"`, 'g');
      out = out.replace(swap, `${attr}="$1"`);
    } else {
      const strip = new RegExp(`\\s+data-${attr}-en="[^"]*"`, 'g');
      out = out.replace(strip, '');
    }
  }
  return out;
}
