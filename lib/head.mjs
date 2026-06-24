import { SITE, BASE, IS_PREVIEW, canonical, altUrls, LANGS } from './urls.mjs';

const attr = (html, name) => {
  const m = new RegExp(`${name}="([^"]*)"`).exec(html);
  return m ? m[1] : '';
};

export function parseMeta(html) {
  const tag = /<html\b[^>]*>/.exec(html)[0];
  return {
    titleNl: attr(tag, 'data-title-nl'),
    titleEn: attr(tag, 'data-title-en'),
    descNl: attr(tag, 'data-desc-nl'),
    descEn: attr(tag, 'data-desc-en'),
    ogImage: attr(tag, 'data-og-image'),
  };
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

export function buildHead({ lang, title, desc, urls, ogImage, locale }) {
  const img = SITE + BASE + ogImage;
  const altLocale = lang === 'nl' ? 'en_US' : 'nl_NL';
  return [
    ...(IS_PREVIEW ? [`<meta name="robots" content="noindex">`] : []),
    `<meta name="description" content="${esc(desc)}">`,
    `<link rel="canonical" href="${urls[lang]}">`,
    `<link rel="alternate" hreflang="nl" href="${urls.nl}">`,
    `<link rel="alternate" hreflang="en" href="${urls.en}">`,
    `<link rel="alternate" hreflang="x-default" href="${urls.xDefault}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="Medu.game">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${urls[lang]}">`,
    `<meta property="og:image" content="${img}">`,
    `<meta property="og:locale" content="${locale}">`,
    `<meta property="og:locale:alternate" content="${altLocale}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="twitter:image" content="${img}">`,
    `<link rel="icon" type="image/svg+xml" href="/assets/logomark-light.svg">`,
    `<link rel="apple-touch-icon" href="/assets/logo-pink.png">`,
    `<meta name="theme-color" content="#000048">`,
  ].map((l) => '  ' + l).join('\n');
}

export function applyHead(html, { lang, relPath, meta }) {
  const langDef = LANGS.find((l) => l.code === lang);
  const title = lang === 'nl' ? meta.titleNl : meta.titleEn;
  const desc = lang === 'nl' ? meta.descNl : meta.descEn;
  const urls = { ...altUrls(relPath), [lang]: canonical(relPath, lang) };

  let out = html
    .replace(/<html\b[^>]*>/, `<html lang="${lang}">`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);

  const head = buildHead({ lang, title, desc, urls, ogImage: meta.ogImage, locale: langDef.locale });
  return out.replace('</head>', `${head}\n</head>`);
}
