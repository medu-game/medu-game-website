import { LANGS, altUrls, canonical } from './urls.mjs';

export function buildSitemap(relPaths) {
  const urls = [];
  for (const relPath of relPaths) {
    const alts = altUrls(relPath);
    const links = [
      `      <xhtml:link rel="alternate" hreflang="nl" href="${alts.nl}" />`,
      `      <xhtml:link rel="alternate" hreflang="en" href="${alts.en}" />`,
      `      <xhtml:link rel="alternate" hreflang="x-default" href="${alts.xDefault}" />`,
    ].join('\n');
    for (const { code } of LANGS) {
      urls.push(
        `  <url>\n    <loc>${canonical(relPath, code)}</loc>\n${links}\n  </url>`
      );
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    urls.join('\n') + `\n</urlset>\n`;
}
