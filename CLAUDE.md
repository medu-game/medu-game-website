# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static, bilingual (NL/EN) marketing/overview site for the medu.game learning platform.
A zero-dependency Node.js generator (`build.js`) reads sources from `src/` and writes two
language variants to `dist/` — NL at the root (`/`) and EN under `/en/`. `dist/` is gitignored;
it is rebuilt on every deploy by the GitHub Action.

Source layout:
- `src/index.html` — platform overview (home).
- `src/modules/*.html` — per-module detail pages (abcde, als, ecg, reanimatie-aed).
- `src/assets/` — `medu.css` (shared design system), `medu-gallery.css`, `medu-gallery.js`, fonts, images, video.
- `src/robots.txt`, `src/CNAME` — copied verbatim into `dist/`.
- `lib/` — generator helpers: `urls.mjs`, `spans.mjs`, `head.mjs`, `sitemap.mjs`.
- `build.js` — orchestrates the full build.

## Developing

```
npm run build   # generate dist/ from src/
npm run serve   # serve dist/ on http://localhost:8080/
npm test        # node --test: lib unit tests + build smoke test
```

Run `npm test` after touching anything in `lib/` or `build.js`.

After editing `src/assets/*.css` or `src/assets/*.js`, run **`./bump-version.sh`** to bump the `?v=N`
cache-buster across all HTML sources in `src/` (`./bump-version.sh N` to set an explicit version).
The script updates `src/index.html` and all `src/modules/*.html` in one go.

Do not edit files in `dist/` directly — they are overwritten on every build.

Hosted on GitHub Pages (`medu-game/medu-game-website`). Pushing to `master` triggers
`.github/workflows/deploy.yml`, which runs `npm run build` and deploys `dist/` to GitHub Pages.
Custom domain is set via `src/CNAME`.

## Bilingual (NL/EN) — how it works

Sources in `src/` are bilingual templates. `build.js` produces two outputs per page:
- NL → `dist/index.html`, `dist/modules/*.html` (served at `/`, `/modules/*`)
- EN → `dist/en/index.html`, `dist/en/modules/*.html` (served at `/en/`, `/en/modules/*`)

**Dual-language content spans** — every user-facing string is authored twice:
```html
<span lang="nl">Bezig met laden…</span><span lang="en">Loading…</span>
```
`lib/spans.mjs` (`unwrapLang(html, keep)`) strips the spans for the language not being built,
leaving only the kept text. Spans must be inline elements; don't put block-level content inside them.
For nested HTML (e.g. a paragraph containing links), author two complete sibling elements each
wrapped in a `lang` span.

**Page metadata** — set on the `<html>` element:
```html
<html lang="nl"
  data-title-nl="NL title"
  data-title-en="EN title"
  data-desc-nl="NL meta description"
  data-desc-en="EN meta description"
  data-og-image="/assets/some-image.jpg">
```
`lib/head.mjs` (`parseMeta` / `applyHead`) reads these attributes and injects the correct
`<title>`, `<meta name="description">`, canonical, hreflang, OG, and Twitter tags per language.
The `data-*` attributes are removed from the generated output.

**Language switch** — place `<!--LANG-SWITCH-->` exactly once in each source file (inside the topbar).
The build replaces it with a `<div class="lang-switch">` containing real `<a href="…">` links to
the NL and EN versions of that page. There is no client-side JS language toggle.

**Internal links** — use root-absolute paths starting with `/` (e.g. `/modules/abcde.html`).
`lib/urls.mjs` (`rewriteLinks`) prefixes them with `/en/` in the EN output automatically.
Do not use relative paths for inter-page links.

**Adding a language** — add an entry to `LANGS` in `lib/urls.mjs` with `{ code, prefix, locale }`,
then author the matching `lang="<code>"` spans throughout the sources. Two regexes still hardcode
the current languages and must be updated too: the `(nl|en)` match in `lib/spans.mjs` and the
`en/` skip in `rewriteLinks` (`lib/urls.mjs`).

**`alt`/`aria-label` override convention** — The dual-span mechanism covers visible text, not
attribute values. For image `alt` and `aria-label` strings, author the NL text in the base
attribute and add an English override as `data-<attr>-en` placed immediately after the base
attribute:
```html
<img alt="beeld uit Medu.game" data-alt-en="still from Medu.game" />
<button aria-label="sluiten" data-aria-label-en="close">
```
`lib/attrs.mjs` (`applyLangAttrs`) resolves this at build time: for EN, it swaps in the override
value; for both languages, it strips the `data-*-en` attribute from the output. Lightbox control
labels (`close`, `previous`, `next`) are localized from `document.documentElement.lang` in
`medu-gallery.js`. A build assertion in `build.js` scans every EN page's `alt`/`aria-label`
values against a curated Dutch-token list and fails the build if an untranslated Dutch string
is found, so this cannot regress silently.

## Design system / tokens

CSS custom properties (colors, spacing, type scale, radii, shadows, motion) are the single styling
vocabulary — use the `var(--…)` tokens, don't hardcode values.

**Single source of truth:** `src/assets/medu.css` holds the token `:root{…}` block plus shared
primitives (reset, `.eyebrow`, `.btn*`, `.badge*`, topbar base, section rhythm, `.section-num`,
`.loops`). Both the home page and module pages link it. `src/index.html`'s inline `<style>` contains
only overview-page-specific layout and loads *after* `medu.css`.

`medu-fonts.css` resolves `url(fonts/…)` relative to itself, so it works from both root and
`modules/` output paths — keep font references there, not inline.

## JavaScript behaviour (`medu-gallery.js`)

Vanilla, dependency-free, progressive enhancement (everything degrades to static posters/thumbnails
without JS). Features are driven entirely by markup:

- **Click-to-play video:** `<button class="video-embed" data-src="…webm" data-src-mp4="…mp4" data-poster="…">`. webm listed first, mp4 second so Safari falls through. Builds a `<video>` on click.
- **Gallery + lightbox:** `.gallery-grid > button.gallery-item > img`. Optional `data-full` on the button overrides the lightbox source. Keyboard: Esc / ← / →.

To add media, write the markup with the right classes/data-attributes — no JS changes needed.
