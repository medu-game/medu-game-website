function normBase(b) {
  if (!b) return '';
  return ('/' + b.replace(/^\/+|\/+$/g, '')); // '' or '/segment'
}
export const SITE = (process.env.SITE_ORIGIN || 'https://medu.game').replace(/\/+$/, '');
export const BASE = normBase(process.env.BASE_PATH);
export const IS_PREVIEW = BASE !== '';
export const DEFAULT_LANG = 'nl';
export const LANGS = [
  { code: 'nl', prefix: '', locale: 'nl_NL' },
  { code: 'en', prefix: 'en/', locale: 'en_US' },
];

export function urlPath(relPath) {
  return relPath === 'index.html' ? '' : relPath;
}

function prefixOf(lang) {
  return LANGS.find((l) => l.code === lang).prefix;
}

export function canonical(relPath, lang) {
  return `${SITE}${BASE}/${prefixOf(lang)}${urlPath(relPath)}`;
}

export function altUrls(relPath) {
  return {
    nl: canonical(relPath, 'nl'),
    en: canonical(relPath, 'en'),
    xDefault: canonical(relPath, DEFAULT_LANG),
  };
}

export function outputPath(relPath, lang) {
  return `${prefixOf(lang)}${relPath}`;
}

export function switchHref(relPath, toLang) {
  return `/${prefixOf(toLang)}${urlPath(relPath)}`;
}

// EN pages: prefix internal page links with /en. Skip assets, mailto, http(s),
// anchors, and already-prefixed /en links.
export function rewriteLinks(html, lang) {
  if (lang === 'nl') return html;
  return html.replace(/href="\/(?!assets\/|en\/)([^"]*)"/g, 'href="/en/$1"');
}
