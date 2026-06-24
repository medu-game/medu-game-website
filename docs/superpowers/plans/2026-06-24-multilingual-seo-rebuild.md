# Multilingual SEO Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate single-language NL (root) and EN (`/en/`) pages from one bilingual source, with full SEO metadata (description, canonical, hreflang, Open Graph, sitemap, robots), deployed to GitHub Pages.

**Architecture:** Authoring stays in bilingual dual-span files under `src/`. A zero-dependency Node generator (`build.js` + `lib/*.mjs`) reads `src/`, emits per-language pages into `dist/`, copies assets, and writes `sitemap.xml`. A GitHub Action builds and deploys `dist/`. The site lives at the apex domain.

**Tech Stack:** Plain HTML/CSS/JS, Node ≥18 built-ins only (`node:fs`, `node:path`, `node:test`, `node:assert`) — no npm dependencies.

## Global Constraints

- Site origin: `https://medu.game` (non-www canonical). Verbatim in canonical/hreflang/og/sitemap.
- Languages: `nl` (prefix ``, locale `nl_NL`, **x-default**) and `en` (prefix `en/`, locale `en_US`). Driven by a `LANGS` array; adding a language = one entry + authored spans.
- Zero runtime dependencies. No `npm install`. ES modules (`"type":"module"`).
- Keep `.html` extensions for module pages. Home canonical is pretty (`/` and `/en/`); home file stays `index.html`.
- Demo CTA target: `mailto:aad.lievaart@medu.game?subject=Demo%20Medu.game` (single neutral subject for both languages — simplification from spec §5 to avoid per-lang href logic).
- og:image is per page, PNG/JPG only (never `.webp`).
- Do all git work on a feature branch (`feat/multilingual-seo`), never directly on `master` (repo rule). Commit per task.
- Source internal page links are root-absolute (`/`, `/modules/x.html`); asset links root-absolute (`/assets/...`). Generator prefixes internal **page** links with `/en` for EN output; never rewrites `/assets/`, `mailto:`, `http`, or `#` links.

---

### Task 1: Scaffold — branch, move sources to `src/`, Node project, gitignore

**Files:**
- Create: `package.json`, `.gitignore` (modify)
- Move: `index.html`→`src/index.html`, `modules/`→`src/modules/`, `assets/`→`src/assets/`

**Interfaces:**
- Produces: `src/` source tree; `npm test`/`npm run build` script names; `dist/` ignored.

- [ ] **Step 1: Create branch**

```bash
git checkout -b feat/multilingual-seo
```

- [ ] **Step 2: Move sources into `src/`**

```bash
mkdir -p src
git mv index.html src/index.html
git mv modules src/modules
git mv assets src/assets
```

- [ ] **Step 3: Create `package.json`**

```json
{
  "name": "medu-game-website",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node build.js",
    "test": "node --test",
    "serve": "node build.js && python3 -m http.server -d dist 8080"
  }
}
```

- [ ] **Step 4: Append to `.gitignore`**

```
dist/
node_modules/
```

- [ ] **Step 5: Verify move and Node**

Run: `node --version && ls src && node --test 2>&1 | tail -1`
Expected: Node ≥ v18; `src` lists `index.html modules assets`; `node --test` reports `tests 0` (no tests yet, exit 0).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: move site sources into src/, add node project scaffold"
```

---

### Task 2: `lib/urls.mjs` — paths, canonical/alt URLs, link rewriting

**Files:**
- Create: `lib/urls.mjs`
- Test: `test/urls.test.mjs`

**Interfaces:**
- Produces:
  - `SITE = 'https://medu.game'`, `DEFAULT_LANG = 'nl'`, `LANGS` array of `{code, prefix, locale}`
  - `urlPath(relPath)` → `''` for `index.html`, else `relPath`
  - `canonical(relPath, lang)` → absolute URL
  - `altUrls(relPath)` → `{ nl, en, xDefault }` absolute URLs
  - `outputPath(relPath, lang)` → dist-relative file path (`index.html`, `en/modules/abcde.html`)
  - `switchHref(relPath, toLang)` → root-absolute link (`/en/`, `/modules/abcde.html`)
  - `rewriteLinks(html, lang)` → html with internal page links prefixed for EN (no-op for NL)

- [ ] **Step 1: Write the failing test**

```js
// test/urls.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonical, altUrls, outputPath, switchHref, rewriteLinks, urlPath } from '../lib/urls.mjs';

test('urlPath strips index.html', () => {
  assert.equal(urlPath('index.html'), '');
  assert.equal(urlPath('modules/abcde.html'), 'modules/abcde.html');
});

test('canonical builds pretty home and module urls', () => {
  assert.equal(canonical('index.html', 'nl'), 'https://medu.game/');
  assert.equal(canonical('index.html', 'en'), 'https://medu.game/en/');
  assert.equal(canonical('modules/abcde.html', 'nl'), 'https://medu.game/modules/abcde.html');
  assert.equal(canonical('modules/abcde.html', 'en'), 'https://medu.game/en/modules/abcde.html');
});

test('altUrls returns nl, en, x-default', () => {
  assert.deepEqual(altUrls('modules/ecg.html'), {
    nl: 'https://medu.game/modules/ecg.html',
    en: 'https://medu.game/en/modules/ecg.html',
    xDefault: 'https://medu.game/modules/ecg.html',
  });
});

test('outputPath maps to dist-relative file', () => {
  assert.equal(outputPath('index.html', 'nl'), 'index.html');
  assert.equal(outputPath('index.html', 'en'), 'en/index.html');
  assert.equal(outputPath('modules/als.html', 'en'), 'en/modules/als.html');
});

test('switchHref points at the counterpart', () => {
  assert.equal(switchHref('index.html', 'en'), '/en/');
  assert.equal(switchHref('index.html', 'nl'), '/');
  assert.equal(switchHref('modules/als.html', 'en'), '/en/modules/als.html');
  assert.equal(switchHref('modules/als.html', 'nl'), '/modules/als.html');
});

test('rewriteLinks prefixes internal page links for EN only', () => {
  const html = '<a href="/">h</a><a href="/modules/abcde.html">m</a><a href="/assets/x.css">a</a><a href="mailto:x@y.z">e</a><a href="#contact">c</a>';
  assert.equal(rewriteLinks(html, 'nl'), html);
  const en = rewriteLinks(html, 'en');
  assert.match(en, /href="\/en\/"/);
  assert.match(en, /href="\/en\/modules\/abcde\.html"/);
  assert.match(en, /href="\/assets\/x\.css"/);   // untouched
  assert.match(en, /href="mailto:x@y\.z"/);       // untouched
  assert.match(en, /href="#contact"/);            // untouched
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/urls.test.mjs`
Expected: FAIL — cannot find module `../lib/urls.mjs`.

- [ ] **Step 3: Write minimal implementation**

```js
// lib/urls.mjs
export const SITE = 'https://medu.game';
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
  return `${SITE}/${prefixOf(lang)}${urlPath(relPath)}`;
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/urls.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/urls.mjs test/urls.test.mjs
git commit -m "feat: url/path helpers for multilingual generator"
```

---

### Task 2 follow-on note on `rewriteLinks`

The home link in source is `href="/"`. The regex group captures `` (empty) → `href="/en/"`. Module links `href="/modules/x.html"` → `href="/en/modules/x.html"`. This is covered by the Task 2 test.

---

### Task 3: `lib/spans.mjs` — nesting-aware language unwrapping

**Files:**
- Create: `lib/spans.mjs`
- Test: `test/spans.test.mjs`

**Interfaces:**
- Produces: `unwrapLang(html, keep)` — keeps `lang="<keep>"` spans (unwrapped, inner preserved), removes the other language's lang-spans. Handles nested `<span>` (e.g. `.dot` inside a lang span). Non-lang spans are left intact.

- [ ] **Step 1: Write the failing test**

```js
// test/spans.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unwrapLang } from '../lib/spans.mjs';

test('keeps chosen language, drops the other', () => {
  const h = '<p><span lang="nl">hallo</span><span lang="en">hello</span></p>';
  assert.equal(unwrapLang(h, 'nl'), '<p>hallo</p>');
  assert.equal(unwrapLang(h, 'en'), '<p>hello</p>');
});

test('preserves nested non-lang spans inside a lang span', () => {
  const h = '<h2><span lang="nl">Medu<span class="dot">.</span>game NL</span><span lang="en">Medu<span class="dot">.</span>game EN</span></h2>';
  assert.equal(unwrapLang(h, 'nl'), '<h2>Medu<span class="dot">.</span>game NL</h2>');
  assert.equal(unwrapLang(h, 'en'), '<h2>Medu<span class="dot">.</span>game EN</h2>');
});

test('preserves nested markup like <b> and <br/>', () => {
  const h = '<span lang="nl">a<br/><b>b</b></span><span lang="en">c</span>';
  assert.equal(unwrapLang(h, 'nl'), 'a<br/><b>b</b>');
});

test('leaves text without lang spans untouched', () => {
  assert.equal(unwrapLang('<div>plain</div>', 'nl'), '<div>plain</div>');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/spans.test.mjs`
Expected: FAIL — cannot find module `../lib/spans.mjs`.

- [ ] **Step 3: Write minimal implementation**

```js
// lib/spans.mjs
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/spans.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/spans.mjs test/spans.test.mjs
git commit -m "feat: nesting-aware language span unwrapping"
```

---

### Task 4: `lib/head.mjs` — parse metadata, set `<html>`/`<title>`, inject SEO head

**Files:**
- Create: `lib/head.mjs`
- Test: `test/head.test.mjs`

**Interfaces:**
- Consumes: `canonical`, `altUrls` from `lib/urls.mjs`; `SITE`.
- Produces:
  - `parseMeta(html)` → `{ titleNl, titleEn, descNl, descEn, ogImage }` read from `<html data-*>`
  - `buildHead({ lang, desc, urls, ogImage, locale, ogTitle })` → string of `<meta>/<link>` SEO tags
  - `applyHead(html, { lang, relPath, meta })` → full transformed page: `<html lang>` set, `data-*` stripped, `<title>` replaced, SEO head injected before `</head>`

- [ ] **Step 1: Write the failing test**

```js
// test/head.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMeta, applyHead } from '../lib/head.mjs';

const SRC = `<!DOCTYPE html>
<html lang="nl" data-title-nl="Titel NL" data-title-en="Title EN" data-desc-nl="Omschrijving NL" data-desc-en="Description EN" data-og-image="/assets/modules/abcde.png">
<head>
<title>old</title>
</head>
<body>x</body>
</html>`;

test('parseMeta reads data attributes', () => {
  const m = parseMeta(SRC);
  assert.equal(m.titleNl, 'Titel NL');
  assert.equal(m.titleEn, 'Title EN');
  assert.equal(m.descNl, 'Omschrijving NL');
  assert.equal(m.descEn, 'Description EN');
  assert.equal(m.ogImage, '/assets/modules/abcde.png');
});

test('applyHead sets lang, title, strips data-*, injects SEO', () => {
  const meta = parseMeta(SRC);
  const out = applyHead(SRC, { lang: 'en', relPath: 'modules/abcde.html', meta });
  assert.match(out, /<html lang="en">/);
  assert.doesNotMatch(out, /data-title-/);
  assert.doesNotMatch(out, /data-desc-/);
  assert.doesNotMatch(out, /data-og-image/);
  assert.match(out, /<title>Title EN<\/title>/);
  assert.match(out, /<meta name="description" content="Description EN">/);
  assert.match(out, /<link rel="canonical" href="https:\/\/medu\.game\/en\/modules\/abcde\.html">/);
  assert.match(out, /hreflang="nl" href="https:\/\/medu\.game\/modules\/abcde\.html"/);
  assert.match(out, /hreflang="en" href="https:\/\/medu\.game\/en\/modules\/abcde\.html"/);
  assert.match(out, /hreflang="x-default" href="https:\/\/medu\.game\/modules\/abcde\.html"/);
  assert.match(out, /property="og:image" content="https:\/\/medu\.game\/assets\/modules\/abcde\.png"/);
  assert.match(out, /property="og:locale" content="en_US"/);
  assert.match(out, /name="twitter:card" content="summary_large_image"/);
  assert.match(out, /name="theme-color" content="#000048"/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/head.test.mjs`
Expected: FAIL — cannot find module `../lib/head.mjs`.

- [ ] **Step 3: Write minimal implementation**

```js
// lib/head.mjs
import { SITE, canonical, altUrls, LANGS } from './urls.mjs';

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
  const img = SITE + ogImage;
  const altLocale = lang === 'nl' ? 'en_US' : 'nl_NL';
  return [
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/head.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/head.mjs test/head.test.mjs
git commit -m "feat: SEO head injection and html metadata transform"
```

---

### Task 5: `lib/sitemap.mjs` — sitemap with hreflang alternates

**Files:**
- Create: `lib/sitemap.mjs`
- Test: `test/sitemap.test.mjs`

**Interfaces:**
- Consumes: `altUrls`, `LANGS` from `lib/urls.mjs`.
- Produces: `buildSitemap(relPaths)` → XML string. One `<url>` per page per language; each carries `<xhtml:link>` alternates for nl, en, x-default.

- [ ] **Step 1: Write the failing test**

```js
// test/sitemap.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSitemap } from '../lib/sitemap.mjs';

test('sitemap lists every page in every language with alternates', () => {
  const xml = buildSitemap(['index.html', 'modules/abcde.html']);
  assert.match(xml, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
  assert.match(xml, /<loc>https:\/\/medu\.game\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/medu\.game\/en\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/medu\.game\/modules\/abcde\.html<\/loc>/);
  assert.match(xml, /<loc>https:\/\/medu\.game\/en\/modules\/abcde\.html<\/loc>/);
  assert.match(xml, /<xhtml:link rel="alternate" hreflang="x-default" href="https:\/\/medu\.game\/"\s*\/>/);
  // 4 url blocks
  assert.equal((xml.match(/<url>/g) || []).length, 4);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/sitemap.test.mjs`
Expected: FAIL — cannot find module `../lib/sitemap.mjs`.

- [ ] **Step 3: Write minimal implementation**

```js
// lib/sitemap.mjs
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/sitemap.test.mjs`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add lib/sitemap.mjs test/sitemap.test.mjs
git commit -m "feat: sitemap generation with hreflang alternates"
```

---

### Task 6: Source edits — root-absolute paths, metadata attrs, lang-switch marker, CTA mailto

This task edits the five source pages. After it, sources are bilingual but build-ready. Verified by grep, not unit tests.

**Files:**
- Modify: `src/index.html`, `src/modules/abcde.html`, `src/modules/als.html`, `src/modules/ecg.html`, `src/modules/reanimatie-aed.html`

**Interfaces:**
- Produces: sources with root-absolute internal/asset links, `data-desc-*` + `data-og-image` on `<html>`, a `<!--LANG-SWITCH-->` marker replacing the `.lang-switch` block, and demo CTAs pointing at the mailto.

- [ ] **Step 1: Convert asset + internal links to root-absolute**

In `src/index.html`: replace `href="assets/` → `href="/assets/`, `src="assets/` → `src="/assets/`, `href="modules/` → `href="/modules/`. (CSS `url(...)` inside `medu-fonts.css` stays relative — do not touch.)

In each `src/modules/*.html`: replace `../assets/` → `/assets/` (both `href` and `src`), `href="../index.html"` → `href="/"`.

Run after editing:
```bash
grep -rn 'href="assets/\|src="assets/\|href="\.\./\|href="modules/\|"../index.html"' src && echo "REMAINING (fix these)" || echo "clean"
```
Expected: `clean`.

- [ ] **Step 2: Add description + og-image attributes to each `<html>`**

`src/index.html` `<html ...>` — append:
```
 data-desc-nl="Medu.game is hét game-based leerplatform voor de zorg: oefen klinisch redeneren in realistische 3D-simulaties, in de browser en als app. Plan een demo." data-desc-en="Medu.game is the game-based learning platform for healthcare: practise clinical reasoning in realistic 3D simulations, in the browser and as an app. Book a demo." data-og-image="/assets/char-hero.png"
```

`src/modules/abcde.html`:
```
 data-desc-nl="Oefen de ABCDE-systematiek voor de acuut zieke patiënt in realistische 3D-scenario's met directe feedback. 4 scenario's + tutorial, op elk apparaat." data-desc-en="Practise the ABCDE approach to the acutely ill patient in realistic 3D scenarios with instant feedback. 4 scenarios + tutorial, on any device." data-og-image="/assets/modules/abcde.png"
```

`src/modules/reanimatie-aed.html`:
```
 data-desc-nl="Train basic life support en AED-gebruik in realistische reanimatiescenario's, van volwassene tot kind. Veilig oefenen met directe feedback." data-desc-en="Train basic life support and AED use in realistic resuscitation scenarios, from adult to child. Practise safely with instant feedback." data-og-image="/assets/modules/reanimatie.png"
```

`src/modules/ecg.html`:
```
 data-desc-nl="Leer het 12-afleidingen-ECG: plaats de 10 elektroden en interpreteer via de 7+2-methode, van ritme tot diagnose. 6 scenario's in 3D." data-desc-en="Learn the 12-lead ECG: place the 10 electrodes and interpret with the 7+2 method, from rhythm to diagnosis. 6 scenarios in 3D." data-og-image="/assets/modules/ecg.jpg"
```

`src/modules/als.html`:
```
 data-desc-nl="Speel een volledig code blue-scenario: het ALS-algoritme, ritme-analyse, de 4 H's & 4 T's en teamleiding met closed-loop communicatie. Gevorderd, in 3D." data-desc-en="Play a full code blue scenario: the ALS algorithm, rhythm analysis, the 4 H's & 4 T's and team leadership with closed-loop communication. Advanced, in 3D." data-og-image="/assets/modules/als.jpg"
```

- [ ] **Step 3: Replace the `.lang-switch` block with a marker**

In all five files, replace the entire existing block:
```html
      <div class="lang-switch" role="group" aria-label="taal / language">
        <button type="button" data-lang-btn="nl" aria-pressed="true">NL</button>
        <button type="button" data-lang-btn="en" aria-pressed="false">EN</button>
      </div>
```
with:
```html
      <!--LANG-SWITCH-->
```

- [ ] **Step 4: Point demo CTAs at the mailto**

In all five files, replace `href="#contact"` on the demo buttons and the two contact-section buttons:
- Every `<a class="btn btn-primary" href="#contact">` (header/hero/module-hero/contact "plan een demo"/"book a demo") → `href="mailto:aad.lievaart@medu.game?subject=Demo%20Medu.game"`.
- In `src/index.html` contact section, the two buttons currently `href="https://www.medu.game" target="_blank" rel="noopener"`: make the first (`plan een demo`/`book a demo`) the mailto and **delete** the second (`bezoek Medu.game`/`visit Medu.game`) `<a>` entirely.

Run:
```bash
grep -rn 'www.medu.game\|href="#contact"' src && echo "REMAINING" || echo "clean"
```
Expected: `clean` (all demo CTAs are mailto; no stray www links).

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "refactor: root-absolute paths, SEO meta attrs, lang-switch marker, mailto CTAs"
```

---

### Task 7: Remove client-side i18n from CSS and JS

**Files:**
- Modify: `src/assets/medu-gallery.css`, `src/assets/medu-gallery.js`

**Interfaces:**
- Produces: CSS where language visibility rules are gone and the EN hero-title size keys off the real `lang` attribute; JS without the language IIFE; `.lang-switch` styles applying to `<a>`.

- [ ] **Step 1: Edit `src/assets/medu-gallery.css`**

Delete these lines:
```css
[lang="en"]{display:none;}
html[data-lang="en"] [lang="en"]{display:inline;}
html[data-lang="en"] [lang="nl"]{display:none;}
```
Change:
```css
html[data-lang="en"] .hero-title{font-size:clamp(38px,4.9vw,66px);}
```
to:
```css
html[lang="en"] .hero-title{font-size:clamp(38px,4.9vw,66px);}
```
In the `.lang-switch button` rules, change the selector `.lang-switch button` → `.lang-switch a, .lang-switch button`, `.lang-switch button:hover` → `.lang-switch a:hover, .lang-switch button:hover`, and `.lang-switch button[aria-pressed="true"]` → `.lang-switch a[aria-current="page"]`. Add `text-decoration:none;` to the base `.lang-switch a, .lang-switch button` rule.

- [ ] **Step 2: Edit `src/assets/medu-gallery.js`**

Delete the entire second IIFE (the block starting at the comment `/* ── language switch (NL / EN) ──` through its closing `})();`). Keep the first IIFE (video + gallery).

- [ ] **Step 3: Verify no i18n leftovers**

Run:
```bash
grep -n 'data-lang\|data-lang-btn\|aria-pressed\|\[lang=' src/assets/medu-gallery.css src/assets/medu-gallery.js && echo "REMAINING" || echo "clean"
```
Expected: `clean`.

- [ ] **Step 4: Commit**

```bash
git add src/assets/medu-gallery.css src/assets/medu-gallery.js
git commit -m "refactor: drop client-side language toggle; switch is now real links"
```

---

### Task 8: `build.js` — orchestrator with lang-switch injection and assertions

**Files:**
- Create: `build.js`
- Test: `test/build.test.mjs` (smoke test over real `src/`)

**Interfaces:**
- Consumes: all `lib/*.mjs`.
- Produces: a full `dist/` build; throws (exit 1) on any assertion failure.

- [ ] **Step 1: Write the failing smoke test**

```js
// test/build.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

test('full build produces single-language pages with SEO', () => {
  execFileSync('node', ['build.js'], { stdio: 'inherit' });

  const nl = readFileSync('dist/index.html', 'utf8');
  const en = readFileSync('dist/en/index.html', 'utf8');

  assert.ok(existsSync('dist/modules/abcde.html'));
  assert.ok(existsSync('dist/en/modules/abcde.html'));
  assert.ok(existsSync('dist/sitemap.xml'));
  assert.ok(existsSync('dist/robots.txt'));
  assert.ok(existsSync('dist/assets/medu.css'));

  assert.match(nl, /<html lang="nl">/);
  assert.match(en, /<html lang="en">/);
  // no leftover bilingual spans / toggle attributes
  assert.doesNotMatch(nl, /lang="en"/);
  assert.doesNotMatch(en, /lang="nl"/);
  assert.doesNotMatch(nl, /data-lang|data-title-|data-desc-/);
  // SEO present
  assert.match(nl, /rel="canonical" href="https:\/\/medu\.game\/"/);
  assert.match(en, /hreflang="x-default"/);
  // switch links to counterpart
  assert.match(nl, /href="\/en\/"/);
  assert.match(en, /href="\/"/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/build.test.mjs`
Expected: FAIL — cannot find `build.js`.

- [ ] **Step 3: Write `build.js`**

```js
// build.js — zero-dependency static multilingual generator
import { readFileSync, writeFileSync, mkdirSync, cpSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { LANGS, outputPath, switchHref, urlPath, canonical, rewriteLinks } from './lib/urls.mjs';
import { unwrapLang } from './lib/spans.mjs';
import { parseMeta, applyHead } from './lib/head.mjs';
import { buildSitemap } from './lib/sitemap.mjs';

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

  // static files
  cpSync(join(SRC, 'assets'), join(DIST, 'assets'), { recursive: true });
  if (existsSync(join(SRC, 'robots.txt'))) cpSync(join(SRC, 'robots.txt'), join(DIST, 'robots.txt'));
  if (existsSync(join(SRC, 'CNAME'))) cpSync(join(SRC, 'CNAME'), join(DIST, 'CNAME'));

  const pages = pageList();

  for (const relPath of pages) {
    const raw = readFileSync(join(SRC, relPath), 'utf8');
    const meta = parseMeta(raw);
    assert(meta.descNl && meta.descEn, `${relPath}: missing data-desc-*`);
    assert(meta.ogImage, `${relPath}: missing data-og-image`);
    assert(existsSync(join(SRC, meta.ogImage.replace(/^\//, ''))), `${relPath}: og-image not found: ${meta.ogImage}`);

    for (const { code } of LANGS) {
      let html = raw.replace('<!--LANG-SWITCH-->', langSwitch(relPath, code));
      html = unwrapLang(html, code);
      html = rewriteLinks(html, code);
      html = applyHead(html, { lang: code, relPath, meta });

      // per-output assertions
      const other = code === 'nl' ? 'en' : 'nl';
      assert(!new RegExp(`lang="${other}"`).test(html), `${relPath} [${code}]: leftover lang="${other}" span`);
      assert(!/data-lang|data-title-|data-desc-|data-og-image/.test(html), `${relPath} [${code}]: leftover data-* attr`);
      assert(html.includes(`rel="canonical" href="${canonical(relPath, code)}"`), `${relPath} [${code}]: bad/missing canonical`);
      assert((html.match(/rel="alternate" hreflang=/g) || []).length === 3, `${relPath} [${code}]: expected 3 hreflang links`);

      write(join(DIST, outputPath(relPath, code)), html);
    }
  }

  write(join(DIST, 'sitemap.xml'), buildSitemap(pages));
  console.log(`Built ${pages.length} pages × ${LANGS.length} languages → ${DIST}/`);
}

main();
```

- [ ] **Step 4: Run the smoke test (requires Tasks 6, 7, 9 source state)**

Run: `node --test test/build.test.mjs`
Expected: PASS. If it fails on a missing `dist/robots.txt` or `dist/modules/als.jpg`/og-image, complete Task 9 first, then re-run.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all tests pass (urls, spans, head, sitemap, build).

- [ ] **Step 6: Commit**

```bash
git add build.js test/build.test.mjs
git commit -m "feat: build.js orchestrator with lang-switch injection and build assertions"
```

---

### Task 9: Assets & config — ALS og-image JPG, robots.txt, CNAME

**Files:**
- Create: `src/assets/modules/als.jpg`, `src/robots.txt`, `src/CNAME`

**Interfaces:**
- Produces: a non-WebP og-image for ALS; crawl directives; custom-domain file.

- [ ] **Step 1: Create a JPG copy of the ALS thumbnail**

```bash
sips -s format jpeg src/assets/modules/als.webp --out src/assets/modules/als.jpg
```
If `sips` cannot read WebP on this machine, fall back: `sips -s format jpeg src/assets/modules/video/posters/als.webp --out src/assets/modules/als.jpg` — or any existing ALS PNG/JPG. Verify:
```bash
file src/assets/modules/als.jpg
```
Expected: `JPEG image data`.

- [ ] **Step 2: Create `src/robots.txt`**

```
User-agent: *
Allow: /

Sitemap: https://medu.game/sitemap.xml
```

- [ ] **Step 3: Create `src/CNAME`**

```
medu.game
```

- [ ] **Step 4: Commit**

```bash
git add src/assets/modules/als.jpg src/robots.txt src/CNAME
git commit -m "chore: ALS og-image jpg, robots.txt, CNAME"
```

---

### Task 10: GitHub Actions deploy to Pages

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Produces: CI that builds `dist/` and deploys to GitHub Pages on push to `master`.

- [ ] **Step 1: Create the workflow**

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [master]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Verify YAML parses**

Run: `node -e "const f=require('node:fs').readFileSync('.github/workflows/deploy.yml','utf8'); if(!f.includes('upload-pages-artifact')) throw new Error('bad'); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: build and deploy dist/ to GitHub Pages"
```

- [ ] **Step 4: Post-merge manual steps (document, do not automate)**

In repo Settings → Pages: set Source = "GitHub Actions". Confirm custom domain `medu.game` and "Enforce HTTPS". Ensure DNS: apex `medu.game` → GitHub Pages, `www` CNAME → `medu-game.github.io` (GitHub redirects www→apex).

---

### Task 11: Update CLAUDE.md and final verification

**Files:**
- Modify: `CLAUDE.md`, `bump-version.sh`

**Interfaces:**
- Produces: docs matching the new build model; `bump-version.sh` targeting `src/`.

- [ ] **Step 1: Update `bump-version.sh` to target `src/`**

Change `files=(index.html modules/*.html)` → `files=(src/index.html src/modules/*.html)`.

Run: `./bump-version.sh 8 && grep -ohE '\?v=[0-9]+' src/index.html src/modules/*.html | sort -u`
Expected: `?v=8`.

- [ ] **Step 2: Rewrite the relevant CLAUDE.md sections**

Replace the "What this is", "Developing", "Bilingual (NL/EN)", and "Single source of truth" sections to describe: bilingual sources in `src/`; `node build.js` → `dist/`; NL at root + EN under `/en/`; metadata via `data-title-*`/`data-desc-*`/`data-og-image` on `<html>`; the `<!--LANG-SWITCH-->` marker; root-absolute paths; how to add a language (`LANGS` entry + author spans); deploy via GitHub Action; run `npm test` after touching `lib/` or `build.js`; `./bump-version.sh` after asset edits (operates on `src/`).

- [ ] **Step 3: Full clean build + test + manual smoke**

```bash
npm test && npm run build
grep -rl 'lang="en"' dist/*.html && echo "LEFTOVER" || echo "nl pages clean"
node -e "console.log(require('node:fs').readFileSync('dist/sitemap.xml','utf8').match(/<url>/g).length + ' sitemap urls (expect 10)')"
npm run serve   # visit http://localhost:8080/ and /en/, click the switch on a module page
```
Expected: tests pass; "nl pages clean"; "10 sitemap urls"; switch navigates `/modules/abcde.html` ↔ `/en/modules/abcde.html`; each page renders one language.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md bump-version.sh
git commit -m "docs: document the multilingual build; bump-version targets src/"
```

---

## Self-Review

**Spec coverage:**
- §1 repo structure → Task 1, 8, 9, 10. ✓
- §2 generator (LANGS, two outputs, paths) → Tasks 2, 8. ✓
- §2a nesting-aware spans → Task 3. ✓
- §2b head injection (desc, canonical, hreflang, OG, Twitter, favicon, theme-color) → Task 4. ✓
- §3 metadata attrs + descriptions + per-page og → Task 6 (attrs/copy), Task 4 (consumption), Task 9 (ALS jpg). ✓
- §4 switcher links + remove JS/CSS i18n → Task 7 (CSS/JS), Task 8 (injection). ✓
- §5 CTA mailto + remove visit button → Task 6. ✓
- §6 sitemap + robots → Task 5, Task 9, Task 8 (emit). ✓
- §7 deploy/Pages/CNAME → Task 10, Task 9 (CNAME). ✓
- §8 verification/assertions → Task 8 (build assertions), Task 11 (manual). ✓

**Placeholder scan:** No TBD/TODO; all code blocks complete; test code included for every lib; content edits give exact strings. ✓

**Type/name consistency:** `unwrapLang(html, keep)`, `applyHead(html,{lang,relPath,meta})`, `parseMeta`, `buildHead`, `canonical/altUrls/outputPath/switchHref/rewriteLinks`, `buildSitemap(relPaths)`, `<!--LANG-SWITCH-->` marker, `data-desc-*`/`data-og-image` — used identically across Tasks 2–8 and 11. ✓

**Cross-task ordering note:** Task 8's smoke test depends on Tasks 6, 7, and 9 (source markers, removed i18n, robots/og assets). Run order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 9 → 8 → 10 → 11. Lib unit tests (2–5) are independent and can run anytime.
