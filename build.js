// build.js — zero-dependency static multilingual generator
import { readFileSync, writeFileSync, mkdirSync, cpSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { LANGS, outputPath, switchHref, canonical, rewriteLinks, SITE, BASE, IS_PREVIEW } from './lib/urls.mjs';
import { applyBasePath } from './lib/basepath.mjs';
import { unwrapLang } from './lib/spans.mjs';
import { parseMeta, applyHead } from './lib/head.mjs';
import { buildSitemap } from './lib/sitemap.mjs';
import { applyLangAttrs } from './lib/attrs.mjs';
import { buildSchema } from './lib/schema.mjs';
import { imageSize } from './lib/imagesize.mjs';

const SRC = 'src';
const DIST = 'dist';

// Shared primary nav, injected at the <!--NAV--> marker in every page's topbar.
// Root-absolute hrefs (/#section, /modules/*.html) are language-prefixed by
// rewriteLinks for EN and base-prefixed by applyBasePath; bilingual <span lang>
// labels are resolved by unwrapLang. Single source of truth for the menu.
const NAV = `<nav class="topnav" id="topnav">
      <a href="/#wat"><span lang="nl">wat het is</span><span lang="en">what it is</span></a>
      <a href="/#platform"><span lang="nl">het platform</span><span lang="en">the platform</span></a>
      <div class="has-sub">
        <button type="button" class="sub-trigger" aria-haspopup="true" aria-expanded="false">modules <svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>
        <div class="submenu">
          <a href="/modules/reanimatie-aed.html"><span lang="nl">Reanimatie &amp; AED</span><span lang="en">Resuscitation &amp; AED</span></a>
          <a href="/modules/abcde.html">ABCDE</a>
          <a href="/modules/ecg.html">ECG</a>
          <a href="/modules/als.html">ALS</a>
        </div>
      </div>
      <a href="/#ervaringen"><span lang="nl">ervaringen</span><span lang="en">testimonials</span></a>
      <a href="/#faq">faq</a>
    </nav>`;

// Shared site footer, injected at the <!--FOOTER--> marker in every page (same
// resolution rules as NAV). The year is taken at build time.
const FOOTER = `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-cols">
      <div class="footer-col footer-brand">
        <span class="footer-word">medu<span class="dot">.</span>game</span>
        <p><span lang="nl">Virtuele scenario's spelen, echte skills verbeteren.</span><span lang="en">Play virtual scenarios, improve real skills.</span></p>
      </div>
      <div class="footer-col">
        <span class="lbl"><span lang="nl">locaties</span><span lang="en">locations</span></span>
        <span>Groningen</span><span>Nijverdal</span><span>'s-Hertogenbosch</span>
      </div>
      <div class="footer-col">
        <span class="lbl">contact</span>
        <a href="mailto:aad.lievaart@medu.game">aad.lievaart@medu.game</a>
        <a href="https://www.linkedin.com/company/medu-game" target="_blank" rel="noopener"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 9h3.2v11H4zM5.6 3.5a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8zM10 9h3v1.6c.6-1 1.8-1.9 3.6-1.9 3 0 3.6 2 3.6 4.6V20H17v-5.6c0-1.4 0-3-1.8-3s-2.1 1.3-2.1 2.9V20H10z"/></svg>LinkedIn</a>
      </div>
      <nav class="footer-col" aria-label="meer" data-aria-label-en="more">
        <span class="lbl"><span lang="nl">meer</span><span lang="en">more</span></span>
        <a href="/team.html">team</a>
        <a href="/privacy.html"><span lang="nl">privacybeleid</span><span lang="en">privacy policy</span></a>
        <a href="/terms.html"><span lang="nl">gebruiksvoorwaarden</span><span lang="en">terms &amp; conditions</span></a>
      </nav>
    </div>
    <div class="footer-base"><span>© ${new Date().getFullYear()} medu.game · <span lang="nl">Nederland</span><span lang="en">The Netherlands</span></span><span>nederlands · english · português (br)</span></div>
  </div>
</footer>`;

function pageList() {
  // top-level pages (index.html + standalone pages like privacy/terms/team)
  const pages = readdirSync(SRC).filter((f) => f.endsWith('.html'));
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
    // Resolve each OG image to a file and read its real dimensions, so the head
    // can emit correct og:image:width/height (helps LinkedIn/Facebook render the
    // card on first scrape). meta.ogImageEn is an optional per-language override.
    meta.ogDims = {};
    for (const p of [meta.ogImage, meta.ogImageEn].filter(Boolean)) {
      const file = join(SRC, p.replace(/^\//, ''));
      assert(existsSync(file), `${relPath}: og-image not found: ${p}`);
      meta.ogDims[p] = imageSize(file);
    }

    const withNav = raw.replace('<!--NAV-->', NAV).replace('<!--FOOTER-->', FOOTER);

    for (const { code } of LANGS) {
      let html = unwrapLang(withNav, code);
      html = applyLangAttrs(html, code);     // NEW
      html = rewriteLinks(html, code);
      html = html.replace('<!--LANG-SWITCH-->', langSwitch(relPath, code));
      html = applyHead(html, { lang: code, relPath, meta });
      html = html.replace('</head>', `${buildSchema({ relPath, lang: code, meta })}\n</head>`);

      // per-output assertions
      const ld = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html);
      assert(ld, `${relPath} [${code}]: missing JSON-LD`);
      try { JSON.parse(ld[1].replace(/\\u003c/g, '<')); }
      catch (e) { assert(false, `${relPath} [${code}]: invalid JSON-LD (${e.message})`); }
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
