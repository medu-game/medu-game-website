// Prefix BASE_PATH onto every root-absolute URL attribute so the build works
// under a project subpath (e.g. /medu-game-website on github.io). No-op when
// base is empty. Skips absolute (https), protocol-relative (//), mailto, and
// anchor (#) values — those are matched by requiring a single leading slash.
const ATTRS = 'href|src|data-src|data-src-mp4|data-poster|data-full';

export function applyBasePath(html, base) {
  if (!base) return html;
  const re = new RegExp(`(\\s)(${ATTRS})="/(?!/)`, 'g');
  return html.replace(re, `$1$2="${base}/`);
}
