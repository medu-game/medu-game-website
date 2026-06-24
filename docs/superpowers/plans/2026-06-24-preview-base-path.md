# Preview Base-Path / Configurable Origin Implementation Plan

> Implement task-by-task. Steps use `- [ ]`.

**Goal:** Let the same generator build either the production site (apex `https://medu.game/`) or a working preview on the GitHub Pages project subpath (`https://medu-game.github.io/medu-game-website/`), selected by env vars. Preview output is `noindex` and carries no `CNAME`.

**Architecture:** Two env vars — `SITE_ORIGIN` (default `https://medu.game`) and `BASE_PATH` (default empty) — drive the generator. Absolute SEO URLs (canonical/hreflang/og/sitemap) use `SITE_ORIGIN + BASE_PATH + path`. A final `applyBasePath` pass prefixes `BASE_PATH` onto every root-absolute `href`/`src`/`data-src*`/`data-poster`/`data-full` in the page (assets, internal links, lang-switch, favicons). When `BASE_PATH` is set ("preview"), the build adds `<meta name="robots" content="noindex">` and omits `CNAME`. With both env vars unset, output is byte-for-byte the current production build.

**Tech Stack:** Existing zero-dependency Node generator; ES modules; `node:test`.

## Global Constraints

- `SITE_ORIGIN` default `https://medu.game`; `BASE_PATH` default `` (empty). `BASE_PATH` is normalized to `''` or `/segment` (leading slash, no trailing slash).
- "Preview" ⇔ `BASE_PATH` non-empty ⇒ emit `noindex` meta + skip `CNAME`.
- Default env (no vars) MUST reproduce the current production output — all existing 19 tests stay green.
- `applyBasePath` only rewrites attribute values beginning with a single `/` (not `//`, not `https://`, not `mailto:`/`#`). No-op when base is empty.
- Zero dependencies; ES modules. Branch `feat/preview-base-path`; commit per task with standard trailers.

---

### Task 1: env-driven `SITE`/`BASE` + `lib/basepath.mjs` + head base-awareness

**Files:**
- Modify: `lib/urls.mjs`, `lib/head.mjs`
- Create: `lib/basepath.mjs`, `test/basepath.test.mjs`

**Interfaces:**
- Produces: `SITE`, `BASE`, `IS_PREVIEW` exports from `lib/urls.mjs`; `canonical` includes `BASE`; `applyBasePath(html, base)` from `lib/basepath.mjs`; `buildHead` uses `SITE+BASE` for og/twitter image and emits `noindex` when preview.

- [ ] **Step 1: `lib/urls.mjs` — read env, add BASE, fold into canonical**

Replace the top of `lib/urls.mjs`:
```js
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
```
Change `canonical` to include BASE:
```js
export function canonical(relPath, lang) {
  return `${SITE}${BASE}/${prefixOf(lang)}${urlPath(relPath)}`;
}
```
Leave `switchHref` and `rewriteLinks` returning bare `/…` (the final base pass adds the prefix). Leave `outputPath`, `altUrls`, `urlPath` as-is.

- [ ] **Step 2: `lib/basepath.mjs` (TDD — write test first)**

`test/basepath.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyBasePath } from '../lib/basepath.mjs';

test('empty base is a no-op', () => {
  const h = '<a href="/en/"><img src="/assets/x.png"></a>';
  assert.equal(applyBasePath(h, ''), h);
});

test('prefixes root-absolute href/src/data-* with the base', () => {
  const h = '<a href="/en/modules/x.html"><img src="/assets/x.png" data-src="/assets/v.webm" data-src-mp4="/assets/v.mp4" data-poster="/assets/p.webp"></a>';
  const out = applyBasePath(h, '/medu-game-website');
  assert.match(out, /href="\/medu-game-website\/en\/modules\/x\.html"/);
  assert.match(out, /src="\/medu-game-website\/assets\/x\.png"/);
  assert.match(out, /data-src="\/medu-game-website\/assets\/v\.webm"/);
  assert.match(out, /data-src-mp4="\/medu-game-website\/assets\/v\.mp4"/);
  assert.match(out, /data-poster="\/medu-game-website\/assets\/p\.webp"/);
});

test('does not touch absolute, mailto, anchor, or protocol-relative urls', () => {
  const h = '<a href="https://medu.game/x">a</a><a href="mailto:x@y.z">b</a><a href="#c">c</a><img src="//cdn/x.png">';
  assert.equal(applyBasePath(h, '/base'), h);
});
```
Run `node --test test/basepath.test.mjs` → FAIL (missing module).

`lib/basepath.mjs`:
```js
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
```

Run `node --test test/basepath.test.mjs` → PASS (3 tests).

- [ ] **Step 3: `lib/head.mjs` — base-aware image URLs + noindex on preview**

In `lib/head.mjs`, change the import to also pull `BASE`, `IS_PREVIEW`:
```js
import { SITE, BASE, IS_PREVIEW, canonical, altUrls, LANGS } from './urls.mjs';
```
In `buildHead`, change the image to include BASE:
```js
const img = SITE + BASE + ogImage;
```
And prepend a robots line when preview — insert as the FIRST entry of the array returned by `buildHead`:
```js
...(IS_PREVIEW ? [`<meta name="robots" content="noindex">`] : []),
```
(Place it at the top of the array literal so it renders first.)

- [ ] **Step 4: Run the full suite (default env → production output unchanged)**

Run: `npm test`
Expected: all 19 + 3 new = 22 pass. Existing urls/head/build tests stay green because default `BASE=''` and `SITE=https://medu.game` reproduce prior output.

- [ ] **Step 5: Commit**

```bash
git add lib/urls.mjs lib/basepath.mjs lib/head.mjs test/basepath.test.mjs
git commit -m "feat: env-driven origin + base path, noindex on preview builds"
```

---

### Task 2: wire `applyBasePath`, conditional CNAME, generated robots.txt into build.js

**Files:**
- Modify: `build.js`, `test/build.test.mjs`
- Delete: `src/robots.txt` (now generated)

**Interfaces:**
- Consumes: `applyBasePath`, `BASE`, `IS_PREVIEW`, `SITE` from libs.
- Produces: build that prefixes base on every page, generates `robots.txt` with the env-aware sitemap URL, copies `CNAME` only for production, and (preview) guards that no bare `/assets` path remains and `noindex` is present.

- [ ] **Step 1: Update imports in `build.js`**

```js
import { LANGS, outputPath, switchHref, canonical, rewriteLinks, SITE, BASE, IS_PREVIEW } from './lib/urls.mjs';
import { applyBasePath } from './lib/basepath.mjs';
```

- [ ] **Step 2: Replace static-file handling in `main()`**

Replace the robots.txt copy and CNAME copy block with:
```js
  // assets verbatim
  cpSync(join(SRC, 'assets'), join(DIST, 'assets'), { recursive: true });
  // robots.txt generated with the env-aware sitemap URL
  write(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}${BASE}/sitemap.xml\n`);
  // CNAME only for the production (apex) build — never on the preview subpath
  if (!IS_PREVIEW && existsSync(join(SRC, 'CNAME'))) cpSync(join(SRC, 'CNAME'), join(DIST, 'CNAME'));
```

- [ ] **Step 3: Add `applyBasePath` as the LAST pipeline step**

After `html = applyHead(...)` and the existing per-output assertions, add:
```js
      html = applyBasePath(html, BASE);
      if (IS_PREVIEW) {
        assert(!/(href|src)="\/assets\//.test(html), `${relPath} [${code}]: un-prefixed /assets path under preview base`);
        assert(/name="robots" content="noindex"/.test(html), `${relPath} [${code}]: missing noindex on preview`);
      }
```
(The canonical assertion already uses `canonical()`, which now includes BASE, so it stays correct in both modes. Keep `applyBasePath` AFTER the canonical/hreflang assertions so those match the `https://…` URLs; the base pass does not touch `https://` values.)

- [ ] **Step 4: Delete the now-unused source robots file**

```bash
git rm src/robots.txt
```

- [ ] **Step 5: Extend `test/build.test.mjs` with a preview build**

Add a second test that runs the build with preview env and checks subpath behavior:
```js
test('preview build prefixes base, noindexes, and omits CNAME', () => {
  execFileSync('node', ['build.js'], {
    stdio: 'inherit',
    env: { ...process.env, SITE_ORIGIN: 'https://medu-game.github.io', BASE_PATH: '/medu-game-website' },
  });
  const en = readFileSync('dist/en/index.html', 'utf8');
  assert.match(en, /href="\/medu-game-website\/"/);              // lang switch to NL home
  assert.match(en, /src="\/medu-game-website\/assets\//);        // assets prefixed
  assert.match(en, /rel="canonical" href="https:\/\/medu-game\.github\.io\/medu-game-website\/en\/"/);
  assert.match(en, /name="robots" content="noindex"/);
  assert.ok(!existsSync('dist/CNAME'));
  assert.match(readFileSync('dist/sitemap.xml', 'utf8'), /https:\/\/medu-game\.github\.io\/medu-game-website\/sitemap\.xml|<loc>https:\/\/medu-game\.github\.io\/medu-game-website\//);
});
```
Then rebuild with default env so the working tree dist is production again:
```js
test('zzz restore production dist', () => {
  execFileSync('node', ['build.js'], { stdio: 'inherit' });
  assert.match(readFileSync('dist/index.html', 'utf8'), /rel="canonical" href="https:\/\/medu\.game\/"/);
});
```

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: all pass (production smoke + preview build + libs). Build output deterministic per env.

- [ ] **Step 7: Commit**

```bash
git add build.js test/build.test.mjs
git commit -m "feat: base-path pass, generated robots, preview-only CNAME skip + guards"
```

---

### Task 3: deploy workflow (preview env) + verification + docs

**Files:**
- Modify: `.github/workflows/deploy.yml`, `CLAUDE.md`

**Interfaces:**
- Produces: the deploy build runs with the github.io preview env; docs explain prod vs preview and the launch flip.

- [ ] **Step 1: Set preview env on the build step in `deploy.yml`**

Only the `npm run build` step gets the env (NOT `npm test`, which must validate the production defaults):
```yaml
      - run: npm test
      - run: npm run build
        env:
          SITE_ORIGIN: https://medu-game.github.io
          BASE_PATH: /medu-game-website
```
Add a comment above it:
```yaml
      # PREVIEW on the project subpath. To launch on the apex domain, remove the
      # two env vars below (defaults → https://medu.game, no base path) and set
      # the custom domain in repo Settings → Pages.
```

- [ ] **Step 2: Verify both builds locally**

```bash
npm test
# production (default):
node build.js && grep -o 'href="/assets/[^"]*"' dist/index.html | head -1 && grep -o 'rel="canonical" href="[^"]*"' dist/index.html | head -1 && ls dist/CNAME
# preview:
SITE_ORIGIN=https://medu-game.github.io BASE_PATH=/medu-game-website node build.js
grep -o 'href="/medu-game-website/assets/[^"]*"' dist/index.html | head -1
grep -o 'rel="canonical" href="[^"]*"' dist/en/index.html | head -1
grep -o 'name="robots" content="noindex"' dist/index.html | head -1
ls dist/CNAME 2>/dev/null && echo "CNAME present (bad for preview)" || echo "no CNAME (correct for preview)"
# restore production dist:
node build.js
```
Expected: production → `/assets/…`, canonical `https://medu.game/`, `dist/CNAME` present. Preview → `/medu-game-website/assets/…`, canonical `https://medu-game.github.io/medu-game-website/en/`, noindex present, no CNAME.

- [ ] **Step 3: Update `CLAUDE.md`**

In the "Developing"/deploy area, document: production build is the default (`npm run build` → apex `medu.game`, includes CNAME); the GitHub Action currently builds a **preview** with `SITE_ORIGIN=https://medu-game.github.io` + `BASE_PATH=/medu-game-website` (noindex, no CNAME) so the project subpath works; to launch on the apex domain, remove those two env vars from the workflow and set the custom domain in Settings → Pages. Mention `Settings → Pages → Source must be "GitHub Actions"`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml CLAUDE.md
git commit -m "ci+docs: deploy a noindexed github.io preview; document prod/preview flip"
```

---

## Self-Review

- Env config + canonical/og base → Task 1 (urls, head). ✓
- `applyBasePath` + tests → Task 1 (lib/basepath). ✓
- Pipeline wiring, robots, CNAME skip, preview guards → Task 2. ✓
- noindex on preview → Task 1 (head). ✓
- Workflow preview env + docs → Task 3. ✓
- Default env reproduces production (existing tests green) — relied on throughout; verified in Task 1 Step 4 and Task 2 Step 6.
- Ordering: 1 → 2 → 3. `applyBasePath` runs last so it also prefixes head-injected favicon paths; canonical/hreflang/og are `https://…` and untouched by the base pass (they carry BASE via `canonical()`/`SITE+BASE`).
