# Multilingual SEO rebuild — design

**Date:** 2026-06-24
**Status:** approved (pending spec review)
**Goal:** Turn the single-URL bilingual site into real per-language URLs (NL at root, EN under `/en/`) so English content is crawlable and rankable, and add the missing SEO infrastructure (meta descriptions, canonical, hreflang, Open Graph, sitemap, robots).

---

## Background

Today every page contains both languages inline (`<span lang="nl">…</span><span lang="en">…</span>`); a JS toggle flips `html[data-lang]` and CSS hides the other language (`[lang="en"]{display:none}`). Consequences:

- Google indexes one URL per page and sees mainly the visible NL content; CSS-hidden EN content is heavily discounted → EN barely ranks.
- No separate EN URL exists, so hreflang is impossible.
- `<html lang="nl">` never changes (JS sets `data-lang`, not `lang`).

The site will be published at the apex domain **`https://medu.game`** (non-www canonical).

## Decisions (from brainstorming)

- **One source, generated output.** Keep authoring in bilingual dual-span files; a zero-dependency Node generator emits single-language pages.
- **Hosting:** GitHub Pages, **source-only repo** — a GitHub Action runs `node build.js` and deploys `dist/`. No generated HTML committed.
- **Root-absolute internal paths** (`/assets/…`, `/modules/…`, `/en/…`) so output works at any depth without `../` rewriting.
- **Per-page metadata via `data-*` attributes** on `<html>` (consistent with existing `data-title-*`).
- **og:image:** per-module thumbnail; PNG/JPG only (LinkedIn often won't render WebP).
- **Demo CTAs → `mailto:`** to `aad.lievaart@medu.game`.
- **pt-BR:** out of scope now (no content); generator built to accept more languages.

---

## 1. Repository structure

```
src/                      # authoring — bilingual dual-span (single source of truth)
  index.html
  modules/{abcde,als,ecg,reanimatie-aed}.html
  assets/**               # moved here; relative url() in medu-fonts.css still resolves
  robots.txt
build.js                  # zero-dependency Node (fs, path only)
bump-version.sh           # stays (now operates on src/)
dist/                     # generated; git-ignored
.github/workflows/deploy.yml
docs/superpowers/specs/…  # this spec
CLAUDE.md
```

`node build.js` reads `src/`, writes `dist/`. Local preview: `node build.js && python3 -m http.server -d dist` (root-absolute paths need a server, not `file://`).

## 2. Generator behaviour (`build.js`)

For each source page, emit two single-language outputs:

| | NL (default) | EN |
|---|---|---|
| output path | `dist/<path>` | `dist/en/<path>` |
| `<html lang>` | `nl` | `en` |
| `<title>` | `data-title-nl` | `data-title-en` |
| kept spans | unwrap `lang="nl"`, drop `lang="en"` | unwrap `lang="en"`, drop `lang="nl"` |
| canonical | `https://medu.game/<path>` | `https://medu.game/en/<path>` |

Driven by a `LANGS` array (`[{code:'nl', prefix:''}, {code:'en', prefix:'en/'}]`) so a third language is "add entry + author spans". `x-default` → NL.

Asset/static files under `src/assets/` are copied to `dist/assets/` verbatim. `robots.txt` copied to `dist/`. `sitemap.xml` generated into `dist/`.

### 2a. Span unwrapping must be nesting-aware

Lang spans can contain other spans, e.g. `…<span lang="nl">Klaar om Medu<span class="dot">.</span>game…</span>`. A non-greedy regex would stop at the first `</span>` (the `.dot`) and corrupt output. The generator uses a **depth-aware scanner**: on `<span lang="nl|en">`, walk forward counting `<span`/`</span>` until balanced, capture the inner HTML, then keep-or-drop based on the requested language. Unwrapping removes the wrapper but preserves inner markup (including nested `.dot` spans).

### 2b. Head injection (per page + language)

Generator strips `data-title-*` / `data-desc-*` from `<html>`, sets `lang`, and injects into `<head>`:

- `<meta name="description" content="<data-desc-{lang}>">`
- `<link rel="canonical" href="…">`
- hreflang set (reciprocal, on every page):
  - `<link rel="alternate" hreflang="nl" href="https://medu.game/<path>">`
  - `<link rel="alternate" hreflang="en" href="https://medu.game/en/<path>">`
  - `<link rel="alternate" hreflang="x-default" href="https://medu.game/<path>">`
- Open Graph: `og:type=website`, `og:site_name=Medu.game`, `og:title`, `og:description`, `og:url` (= canonical), `og:image` (absolute), `og:locale` (`nl_NL` / `en_US`) + `og:locale:alternate`
- Twitter: `twitter:card=summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`
- favicon set + `<meta name="theme-color" content="#000048">`

OG/Twitter title+description reuse the page title and `data-desc-{lang}`.

## 3. Per-page metadata (authored in `src/`)

On each page's `<html>`: existing `data-title-nl/en` plus new `data-desc-nl/en`, and `data-og-image` (root-absolute path).

Draft meta descriptions (≈150–160 chars; **for review**):

- **Home** — NL: "Medu.game is hét game-based leerplatform voor de zorg: oefen klinisch redeneren in realistische 3D-simulaties, in de browser en als app. Plan een demo." · EN: "Medu.game is the game-based learning platform for healthcare: practise clinical reasoning in realistic 3D simulations, in the browser and as an app. Book a demo."
- **ABCDE** — NL: "Oefen de ABCDE-systematiek voor de acuut zieke patiënt in realistische 3D-scenario's met directe feedback. 4 scenario's + tutorial, op elk apparaat." · EN: "Practise the ABCDE approach to the acutely ill patient in realistic 3D scenarios with instant feedback. 4 scenarios + tutorial, on any device."
- **Reanimatie & AED** — NL: "Train basic life support en AED-gebruik in realistische reanimatiescenario's, van volwassene tot kind. Veilig oefenen met directe feedback." · EN: "Train basic life support and AED use in realistic resuscitation scenarios, from adult to child. Practise safely with instant feedback."
- **ECG** — NL: "Leer het 12-afleidingen-ECG: plaats de 10 elektroden en interpreteer via de 7+2-methode, van ritme tot diagnose. 6 scenario's in 3D." · EN: "Learn the 12-lead ECG: place the 10 electrodes and interpret with the 7+2 method, from rhythm to diagnosis. 6 scenarios in 3D."
- **ALS** — NL: "Speel een volledig code blue-scenario: het ALS-algoritme, ritme-analyse, de 4 H's & 4 T's en teamleiding met closed-loop communicatie. Gevorderd, in 3D." · EN: "Play a full code blue scenario: the ALS algorithm, rhythm analysis, the 4 H's & 4 T's and team leadership with closed-loop communication. Advanced, in 3D."

og:image per page (PNG/JPG):

- Home → `/assets/char-hero.png`
- ABCDE → `/assets/modules/abcde.png`
- Reanimatie & AED → `/assets/modules/reanimatie.png`
- ECG → `/assets/modules/ecg.jpg`
- ALS → `/assets/modules/als.jpg` — **prep step:** ALS thumbnail is currently `als.webp`; create a JPG copy (`sips -s format jpeg`) for OG compatibility.

## 4. Language switcher = real links

The JS toggle and CSS visibility i18n are removed:

- `.lang-switch` buttons become `<a>` links to the counterpart URL; the active language gets `aria-current="page"`. Generator knows both paths.
- No auto-redirect (safe for crawlers).
- `medu-gallery.js`: remove the language IIFE (localStorage + `data-lang` + title swap). Keep the video + gallery IIFE.
- `medu-gallery.css`: remove `[lang="en"]{display:none}`, `html[data-lang="en"] [lang…]` rules. Rewrite `html[data-lang="en"] .hero-title{…}` → `html[lang="en"] .hero-title{…}` (now driven by the real `lang` attribute on the EN page). `.lang-switch` styles apply to `a` as well as `button`.

## 5. CTA changes

- All "plan een demo" / "book a demo" buttons (header, hero, module heroes, contact section) → `mailto:aad.lievaart@medu.game?subject=…` (NL "Demo-aanvraag Medu.game", EN "Demo request Medu.game").
- The contact-section secondary button "bezoek Medu.game" / "visit Medu.game" linked to `https://www.medu.game` — now self-referential; **remove it**, leaving the single primary demo CTA.

## 6. sitemap.xml + robots.txt

- `src/robots.txt`: `User-agent: *` / `Allow: /` / `Sitemap: https://medu.game/sitemap.xml`.
- `dist/sitemap.xml` (generated): all 10 URLs, each `<url>` with `<xhtml:link>` alternates for `nl`, `en`, `x-default` (namespace `xmlns:xhtml`). Absolute URLs.

## 7. Deploy (GitHub Pages via Actions)

- `.github/workflows/deploy.yml`: on push to `master`, checkout → setup-node → `node build.js` → upload `dist/` as Pages artifact → deploy. (Node built-ins only; no `npm install`.)
- GitHub Pages source = GitHub Actions.
- Custom domain `medu.game` (CNAME in repo settings / `src/CNAME` copied to dist), **Enforce HTTPS** on, `www.medu.game` → apex redirect. Canonical = non-www.

## 8. Verification

`build.js` runs post-build assertions and fails the build (non-zero exit) on:

- any output containing a leftover `lang="nl"`/`lang="en"` span or a `data-lang`/`data-title-` reference;
- a page missing canonical, description, or the full hreflang trio;
- hreflang non-reciprocity (every nl↔en pair points back);
- a referenced og:image / asset path that doesn't exist in `dist/`.

Manual: serve `dist/`, confirm each URL shows one language, the switch jumps to the counterpart, and validate `sitemap.xml` + Rich Results / hreflang.

## Out of scope

- pt-BR pages (no content yet).
- Clean URLs without `.html` (keep `.html`; static host, no rewrites).
- JSON-LD structured data — worthwhile follow-up (Organization sitewide, Course/Product per module) but not required for this rebuild; track separately.

## Follow-ups (post-merge)

- **Translate `alt` / `aria-label` text for EN pages.** The dual-span mechanism handles visible
  text only; image `alt` and `aria-label` attributes currently render in Dutch on the EN output
  (~60 strings). Extend the authoring convention to per-language attributes (e.g.
  `data-alt-nl`/`data-alt-en`) resolved by `applyHead`/the generator, author the EN values, and add
  a build assertion that flags Dutch text on EN output so it can't regress. Surfaced by the final
  whole-branch review; matters for EN image SEO and accessibility.
- **Generalize the hardcoded language regexes** (`(nl|en)` in `lib/spans.mjs`; `en/` skip in
  `rewriteLinks`) so adding a language is truly a single `LANGS` edit.

## Open items to confirm during review

1. Meta-description drafts (§3) — wording.
2. mailto address `aad.lievaart@medu.game` correct as demo destination, and removing the secondary "visit" CTA.
