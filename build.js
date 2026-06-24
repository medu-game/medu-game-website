// build.js — zero-dependency static multilingual generator
import { readFileSync, writeFileSync, mkdirSync, cpSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { LANGS, outputPath, switchHref, canonical, rewriteLinks, SITE, BASE, IS_PREVIEW } from './lib/urls.mjs';
import { applyBasePath } from './lib/basepath.mjs';
import { unwrapLang } from './lib/spans.mjs';
import { parseMeta, applyHead } from './lib/head.mjs';
import { buildSitemap } from './lib/sitemap.mjs';
import { applyLangAttrs } from './lib/attrs.mjs';

const SRC = 'src';
const DIST = 'dist';

function pageList() {
  const pages = ['index.html'];
  for (const f of readdirSync(join(SRC, 'modules'))) {
    if (f.endsWith('.html')) pages.push(`modules/${f}`);
  }
  return pages;
}

function langSwitch(relPath, lang) {
  const items = LANGS.map((l) => {
    const label = l.code.toUpperCase();
    if (l.code === lang) {
      return `<a class="active" aria-current="page" href="${switchHref(relPath, l.code)}">${label}</a>`;
    }
    return `<a href="${switchHref(relPath, l.code)}">${label}</a>`;
  }).join('');
  return `<div class="lang-switch" role="group" aria-label="taal / language">${items}</div>`;
}

function write(file, content) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function assert(cond, msg) {
  if (!cond) { console.error(`BUILD ASSERTION FAILED: ${msg}`); process.exitCode = 1; throw new Error(msg); }
}

function main() {
  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });

  // assets verbatim
  cpSync(join(SRC, 'assets'), join(DIST, 'assets'), { recursive: true });
  // robots.txt generated with the env-aware sitemap URL
  write(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}${BASE}/sitemap.xml\n`);
  // CNAME only for the production (apex) build — never on the preview subpath
  if (!IS_PREVIEW && existsSync(join(SRC, 'CNAME'))) cpSync(join(SRC, 'CNAME'), join(DIST, 'CNAME'));

  const pages = pageList();

  for (const relPath of pages) {
    const raw = readFileSync(join(SRC, relPath), 'utf8');
    const meta = parseMeta(raw);
    assert(meta.descNl && meta.descEn, `${relPath}: missing data-desc-*`);
    assert(meta.ogImage, `${relPath}: missing data-og-image`);
    assert(existsSync(join(SRC, meta.ogImage.replace(/^\//, ''))), `${relPath}: og-image not found: ${meta.ogImage}`);

    for (const { code } of LANGS) {
      let html = unwrapLang(raw, code);
      html = applyLangAttrs(html, code);     // NEW
      html = rewriteLinks(html, code);
      html = html.replace('<!--LANG-SWITCH-->', langSwitch(relPath, code));
      html = applyHead(html, { lang: code, relPath, meta });

      // per-output assertions
      const other = code === 'nl' ? 'en' : 'nl';
      assert(!new RegExp(`\\blang="${other}"`).test(html), `${relPath} [${code}]: leftover lang="${other}" span`);
      assert(!/data-(alt|aria-label)-en=/.test(html), `${relPath} [${code}]: leftover data-*-en override attr`);
      assert(!/data-lang|data-title-|data-desc-|data-og-image/.test(html), `${relPath} [${code}]: leftover data-* attr`);
      assert(html.includes(`rel="canonical" href="${canonical(relPath, code)}"`), `${relPath} [${code}]: bad/missing canonical`);
      assert((html.match(/rel="alternate" hreflang=/g) || []).length === 3, `${relPath} [${code}]: expected 3 hreflang links`);

      html = applyBasePath(html, BASE);
      if (IS_PREVIEW) {
        assert(!/(href|src)="\/assets\//.test(html), `${relPath} [${code}]: un-prefixed /assets path under preview base`);
        assert(/name="robots" content="noindex"/.test(html), `${relPath} [${code}]: missing noindex on preview`);
      }

      // Guard: no untranslated Dutch in EN alt/aria-label values
      if (code === 'en') {
        const DUTCH = /\b(beeld|tijdens|speel|bekijk|sluiten|vorige|volgende|weergave|redeneren|ziekenhuis|spoedopvang|herbruikbare|bouwblokken|samenstellen|apparaat|uitnodigt|onwel|geleiding|borstkas|behandeltafel|behandelkamer|ademhaling|bewustzijn|beademing|vaattoegang|geworden|beoordeling|elektroden)\b/i;
        for (const m of html.matchAll(/(?:alt|aria-label)="([^"]*)"/g)) {
          assert(!DUTCH.test(m[1]), `${relPath} [en]: untranslated Dutch in attribute: "${m[1]}"`);
        }
      }

      write(join(DIST, outputPath(relPath, code)), html);
    }
  }

  write(join(DIST, 'sitemap.xml'), buildSitemap(pages));
  console.log(`Built ${pages.length} pages × ${LANGS.length} languages → ${DIST}/`);
}

main();
