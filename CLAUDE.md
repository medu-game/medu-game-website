# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static, bilingual (NL/EN) marketing/overview site for the medu.game learning platform.
Plain HTML/CSS/JS — **no build step, no framework, no package manager, no tests.**

- `index.html` — platform overview (home). Links the shared `medu.css` for tokens + primitives, and keeps only overview-specific layout in an inline `<style>` block.
- `modules/*.html` — per-module detail pages (ABCDE, ALS, ECG, reanimatie-aed). These link the shared stylesheets instead of inlining CSS.
- `assets/` — `medu.css` (shared design system), `medu-gallery.css` (gallery/lightbox/video/i18n), `medu-gallery.js` (all behaviour), fonts, images, video.

## Developing

Open `index.html` directly in a browser, or serve the repo root (e.g. `python3 -m http.server`) so relative asset paths resolve. There is nothing to build or compile. Hosted on GitHub (`medu-game/medu-game-website`).

After editing `assets/*.css` or `assets/*.js`, run **`./bump-version.sh`** so browsers re-fetch instead of serving a stale cache. It bumps the `?v=N` query string on every `<link>`/`<script>` across `index.html` and all four `modules/*.html` in one go (`./bump-version.sh N` sets an explicit version). Currently `?v=8`.

## Bilingual (NL/EN) — how it works

This is the central mechanism; get it right on every text change.

- Every visible string is authored **twice**, wrapped in `<span lang="nl">…</span><span lang="en">…</span>`. NL comes first and is the default.
- CSS (`medu-gallery.css`) hides `[lang="en"]` by default; `html[data-lang="en"]` flips which language shows. Note these rules use `display:inline` for EN, so wrap inline phrases in inline elements (don't put block content inside a `[lang]` span).
- `medu-gallery.js` (second IIFE) sets `html[data-lang]` from `localStorage["medu-lang"]` (default `nl`), wires the `[data-lang-btn]` toggle, and swaps `document.title` from the `<html data-title-nl/data-title-en>` attributes.
- **When adding or editing any user-facing text, always supply both the `lang="nl"` and `lang="en"` variant, and update both `data-title-*` attributes if the page title changes.**

## Design system / tokens

CSS custom properties (colors, spacing, type scale, radii, shadows, motion) are the single styling vocabulary — use the `var(--…)` tokens, don't hardcode values.

**Single source of truth:** `assets/medu.css` holds the token `:root{…}` block plus the shared primitives (reset, `.eyebrow`, `.btn*`, `.badge*`, topbar base, section rhythm, `.section-num`, `.loops`). Both the home page and the module pages link it, so changing a token there updates everything. `index.html`'s inline `<style>` contains only overview-page-specific layout (hero, modules grid, features, etc.) and loads *after* `medu.css`, so any inline rule overrides the shared one. Brand rules baked into comments: buttons are always pill-shaped (`--radius-pill`), body font is `Fieldwork Geo` (self-hosted via `medu-fonts.css`), display font is `MuseoModerno` (loaded from Google Fonts in each page `<head>`).

`medu-fonts.css` resolves `url(fonts/…)` relative to itself, so it works from both the root page and `modules/` — keep font references there, not inline.

## JavaScript behaviour (`medu-gallery.js`)

Vanilla, dependency-free, progressive enhancement (everything degrades to static posters/thumbnails without JS). Three independent features driven entirely by markup:

- **Click-to-play video:** `<button class="video-embed" data-src="…webm" data-src-mp4="…mp4" data-poster="…">`. webm is listed first, mp4 second so Safari falls through. Builds a `<video>` on click.
- **Gallery + lightbox:** `.gallery-grid > button.gallery-item > img`. Optional `data-full` on the button overrides the lightbox source (defaults to the `<img src>`). Keyboard: Esc / ← / →.
- **Language switch:** see the bilingual section above.

To add media, write the markup with the right classes/data-attributes — no JS changes needed.
