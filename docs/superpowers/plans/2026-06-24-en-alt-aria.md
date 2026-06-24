# EN alt/aria-label Translation Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make `alt` and `aria-label` text English on the EN pages (currently Dutch on both), closing the follow-up from the multilingual rebuild's final review.

**Architecture:** Authors keep Dutch in the base `alt`/`aria-label` attribute and add an English override as `data-<attr>-en` placed **immediately after** the base attribute. A new generator step (`lib/attrs.mjs`) swaps in the EN value for EN output and strips the `data-*-en` attributes from both languages. The lightbox controls in `medu-gallery.js` localize at runtime from `document.documentElement.lang`. Build assertions guard against leftover override attributes and untranslated Dutch on EN output.

**Tech Stack:** Existing zero-dependency Node generator; ES modules; `node:test`.

## Global Constraints

- Origin `https://medu.game`; languages nl (root) + en (`/en/`); same generator/pipeline as the multilingual rebuild.
- Authoring rule: `data-<attr>-en` must come **immediately after** the matching base attribute, e.g. `alt="<nl>" data-alt-en="<en>"`. Overridable attributes: `alt`, `aria-label`.
- Proper names / brand stay identical in both languages (no override): person names, "Medu.game", "LinkedIn".
- EN translations should match the tone and terminology already used in the visible `<span lang="en">` text on the same pages.
- Zero dependencies; ES modules. Run on branch `feat/en-alt-aria`; commit per task with the standard trailers.

---

### Task A: `lib/attrs.mjs` — per-language attribute overrides, wired into build

**Files:**
- Create: `lib/attrs.mjs`, `test/attrs.test.mjs`
- Modify: `build.js` (call `applyLangAttrs` in the per-page pipeline; add structural assertion)

**Interfaces:**
- Consumes: nothing new.
- Produces: `applyLangAttrs(html, lang)` → for `lang==='en'` replaces each base attr value with its adjacent `data-<attr>-en` override; for all langs strips `data-<attr>-en`. Overridable attrs: `alt`, `aria-label`.

- [ ] **Step 1: Write the failing test**

```js
// test/attrs.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyLangAttrs } from '../lib/attrs.mjs';

test('EN build swaps in the override and drops the data attr', () => {
  const h = '<img alt="beeld uit de module" data-alt-en="still from the module">';
  assert.equal(applyLangAttrs(h, 'en'), '<img alt="still from the module">');
});

test('NL build keeps the base value and drops the data attr', () => {
  const h = '<img alt="beeld uit de module" data-alt-en="still from the module">';
  assert.equal(applyLangAttrs(h, 'nl'), '<img alt="beeld uit de module">');
});

test('aria-label is overridable too', () => {
  const h = '<button aria-label="sluiten" data-aria-label-en="close">x</button>';
  assert.equal(applyLangAttrs(h, 'en'), '<button aria-label="close">x</button>');
  assert.equal(applyLangAttrs(h, 'nl'), '<button aria-label="sluiten">x</button>');
});

test('attrs without an override are untouched', () => {
  const h = '<img alt="tanja beldman"><a aria-label="LinkedIn">x</a>';
  assert.equal(applyLangAttrs(h, 'en'), h);
  assert.equal(applyLangAttrs(h, 'nl'), h);
});

test('multiple overrides on one page all resolve', () => {
  const h = '<img alt="a" data-alt-en="A"><img alt="b" data-alt-en="B">';
  assert.equal(applyLangAttrs(h, 'en'), '<img alt="A"><img alt="B">');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/attrs.test.mjs`
Expected: FAIL — cannot find module `../lib/attrs.mjs`.

- [ ] **Step 3: Write `lib/attrs.mjs`**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/attrs.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Wire into `build.js`**

In `build.js`, import: add `applyLangAttrs` from `./lib/attrs.mjs`.
In the per-page/per-lang pipeline, call it right after `unwrapLang`:
```js
html = unwrapLang(html, code);
html = applyLangAttrs(html, code);     // NEW
html = rewriteLinks(html, code);
```
Add a structural assertion (with the existing per-output assertions):
```js
assert(!/data-(alt|aria-label)-en=/.test(html), `${relPath} [${code}]: leftover data-*-en override attr`);
```

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: all suites pass (urls, spans, head, sitemap, attrs, build). Build still green because no `data-*-en` exist in source yet (no-op), so the structural assertion trivially holds.

- [ ] **Step 7: Commit**

```bash
git add lib/attrs.mjs test/attrs.test.mjs build.js
git commit -m "feat: per-language alt/aria-label attribute overrides in generator"
```

---

### Task B: Localize lightbox controls in `medu-gallery.js`

**Files:**
- Modify: `src/assets/medu-gallery.js`

**Interfaces:**
- Produces: lightbox close/prev/next/dialog labels chosen from `document.documentElement.lang` at runtime (default NL).

- [ ] **Step 1: Add a label dictionary and use it**

In the gallery IIFE, near the top, add:
```js
var L = document.documentElement.lang === 'en'
  ? { close: 'close', prev: 'previous', next: 'next', dialog: 'screenshot viewer' }
  : { close: 'sluiten', prev: 'vorige', next: 'volgende', dialog: 'screenshot-weergave' };
```
Replace the hardcoded Dutch `aria-label` values in `buildLightbox()`:
- `lb.setAttribute("aria-label", "screenshot-weergave")` → `lb.setAttribute("aria-label", L.dialog)`
- close button `aria-label="sluiten"` → use `L.close`
- prev button `aria-label="vorige"` → `L.prev`
- next button `aria-label="volgende"` → `L.next`

(The labels are built into an HTML string; switch to setting them after creation, or interpolate `L.*` into the template string. Keep the SVGs unchanged.)

- [ ] **Step 2: Verify**

Run: `node --check src/assets/medu-gallery.js && echo "js ok"`
Expected: `js ok`. Confirm no hardcoded `"sluiten"`/`"vorige"`/`"volgende"`/`"screenshot-weergave"` remain:
`grep -nE '"(sluiten|vorige|volgende|screenshot-weergave)"' src/assets/medu-gallery.js && echo REMAINING || echo clean` → `clean`.

- [ ] **Step 3: Commit**

```bash
git add src/assets/medu-gallery.js
git commit -m "feat: localize lightbox control labels by document lang"
```

---

### Task C: Author EN overrides across the five source pages

**Files:**
- Modify: `src/index.html`, `src/modules/{abcde,als,ecg,reanimatie-aed}.html`

**Interfaces:**
- Produces: every Dutch `alt`/`aria-label` carries an adjacent `data-alt-en`/`data-aria-label-en` with an English translation; proper names/brand left unchanged.

- [ ] **Step 1: For each Dutch `alt`/`aria-label`, add the EN override immediately after it**

Rule: `alt="<dutch>"` → `alt="<dutch>" data-alt-en="<english>"`; same for `aria-label`. Skip values that are proper names or brand (e.g. `alt="tanja beldman"`, `alt="dr. diederik gommers"`, `aria-label="LinkedIn"`, `alt="Medu.game cardioloog"` → translate "cardioloog"→"cardiologist" so this one DOES get an override). Match EN wording to the page's existing `<span lang="en">` phrasing.

Examples (index.html):
- `alt="beeld uit Medu.game, klinisch redeneren in een 3D-spoedopvang"` → add `data-alt-en="still from Medu.game, clinical reasoning in a 3D emergency department"`
- `aria-label="speel de Medu.game intro-video af"` → add `data-aria-label-en="play the Medu.game intro video"`
- `alt="de content-builder van Medu.game, scenario's samenstellen uit herbruikbare bouwblokken"` → `data-alt-en="the Medu.game content builder, assembling scenarios from reusable building blocks"`
- `alt="beeld uit de abcde-module"` → `data-alt-en="still from the ABCDE module"` (and similar for each module page)

Leave already-bilingual generated markup alone (the lang-switch is injected at build time and is not in source).

- [ ] **Step 2: Verify every Dutch alt/aria has an override (manual sweep)**

List remaining base `alt`/`aria-label` values and confirm each leftover without a `data-*-en` is a proper name/brand:
```bash
grep -onE '(alt|aria-label)="[^"]*"( data-(alt|aria-label)-en="[^"]*")?' src/index.html src/modules/*.html | grep -v 'data-.*-en=' | grep -viE '="(LinkedIn|Medu\.game|)"'
```
Inspect the output; everything still listed must be a person name or intentionally identical. (`alt=""` decorative and brand-only values are fine.)

- [ ] **Step 3: Commit**

```bash
git add src/index.html src/modules
git commit -m "i18n: add English alt/aria-label overrides across all pages"
```

---

### Task D: Regression assertion + final verification + docs

**Files:**
- Modify: `build.js` (add Dutch-token scan over EN attribute text), `CLAUDE.md`, `docs/superpowers/specs/2026-06-24-multilingual-seo-rebuild-design.md`

**Interfaces:**
- Produces: build fails if EN output `alt`/`aria-label` text contains curated Dutch tokens; docs mark the follow-up done and document the override convention.

- [ ] **Step 1: Add the EN Dutch-token assertion to `build.js`**

After writing an EN page (only when `code === 'en'`), scan its `alt`/`aria-label` values:
```js
if (code === 'en') {
  const DUTCH = /\b(beeld|uit|de|het|een|tijdens|speel|bekijk|sluiten|vorige|volgende|weergave|redeneren|ziekenhuis|spoedopvang|herbruikbare|bouwblokken|samenstellen|elk|apparaat|uitnodigt|voor|naar|met|onwel)\b/i;
  for (const m of html.matchAll(/(?:alt|aria-label)="([^"]*)"/g)) {
    assert(!DUTCH.test(m[1]), `${relPath} [en]: untranslated Dutch in attribute: "${m[1]}"`);
  }
}
```
(Tune the token list against the actual EN output — remove any token that legitimately appears in an English string to avoid false positives. Confirm the build passes after Task C.)

- [ ] **Step 2: Full build + verify**

Run:
```bash
npm test
npm run build
grep -rhoE '(alt|aria-label)="[^"]*"' dist/en/index.html dist/en/modules/*.html | sort -u | head -40   # eyeball: all English
grep -rl 'data-alt-en\|data-aria-label-en' dist && echo "LEFTOVER (bad)" || echo "no override attrs leaked"
```
Expected: tests pass; EN attribute values are English; no override attrs in `dist/`.

- [ ] **Step 3: Update docs**

- In `CLAUDE.md`, under "Bilingual (NL/EN)", replace the "Known limitation … alt/aria-label … NL-only" note with a short description of the override convention (`data-<attr>-en` immediately after the base `alt`/`aria-label`; resolved by `lib/attrs.mjs`; lightbox labels localize from `document.documentElement.lang`).
- In the design doc Follow-ups section, mark the alt/aria item done (or remove it).

- [ ] **Step 4: Commit**

```bash
git add build.js CLAUDE.md docs/superpowers/specs/2026-06-24-multilingual-seo-rebuild-design.md
git commit -m "feat: guard EN output against untranslated Dutch; document override convention"
```

---

## Self-Review

- Mechanism (override + strip) → Task A, with unit tests. ✓
- Lightbox JS labels → Task B. ✓
- Author EN overrides (all pages) → Task C. ✓
- Structural assertion (no leftover data-*-en) → Task A; Dutch-token regression scan → Task D. ✓
- Docs updated, follow-up closed → Task D. ✓
- Ordering: A (no-op safe) → B → C (translations) → D (token assertion goes live after C). Build stays green throughout.
