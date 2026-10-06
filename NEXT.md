# NEXT — review humanizer + better-interface (06-10-2026, read-only)

## KLAAR
- Review op medu.game (7 pagina's × NL/EN × 320/390/1280, Playwright) en de uitgelogde homepage van learn.medu.game. Niets gewijzigd en niets gedeployed.
- Gevonden en in de bron bevestigd: HIGH in `src/assets/medu.css:111-113`. Het gesloten mobiele menu is alleen `opacity:0`, dus Tab landt op 11 onzichtbare links. Verdict website: **Block**.

- **Gefixt (06-10, website, v=42, lokaal gecommit, NIET gepusht):** het gesloten mobiele menu heeft nu `visibility:hidden` (Playwright 390 px: 0 van 5 links focusbaar als het dicht is, 5 als het open is; desktop ongewijzigd). Body is 400 in plaats van 300, Regular wordt gepreload en `.section-lede` en quotes blijven Light. h3 `clamp(24px,3vw,32px)`: 24 px bij 390, 32 px bij 1280. 29/29 tests.

## ONGEVERIFIEERD
- De domeinen accessibility en colors zijn niet gereviewd: de skills `better-accessibility` en `better-colors` zijn niet geïnstalleerd.
- Ook niet bekeken: Safari, Firefox, 200% zoom en de Calendly-iframe. Op Moodle is reduced-motion alleen uit de code afgeleid, niet in de browser getest.
- Moodle-console: 404's op bootstrap.js en design-system index.js. Of daardoor iets niet werkt, is niet uitgezocht.

## OPEN (beslissing Tim)
- Moodle: de typografie- en lang-fixes staan op branch `fix/u5-home-typografie` (`0dcb740`, moodle-backend, worktree `../moodle-backend-home`). Build en 76 tests OK, nog geen PR. Ze komen pas live na een merge plus `deploy.sh --apply` (akkoord Tim). Afgestemd met de 5.3-sessie: de console-404's zijn daar opgelost met nginx `try_files`.
- Moodle-punten voor Tim: de stage valt op mobiel onder de vouw, en de copy is "telefoon" tegenover "app" met koppen die medu.game herhalen.
- Kleine letters in de bron: `°c`, `seh`, `pq, qrs`, `engels`.
- Team-meta "remote, verspreid over Europa" tegenover "makers uit Nederland": welke klopt?
- Moodle: "op tablet of telefoon" (browser) tegenover medu.game "als app". Ook ontbreekt `lang="nl"` op `.mhome`.
- De humanizer-voorstellen (±25) staan in het sessieverslag van 06-10. Copy pas na akkoord.

## VOLGENDE STAP
`git push origin master` (de deploy), daarna `curl -s https://medu.game/ | grep -o 'medu.css?v=[0-9]*'` → v=42.

---

# NEXT — review 02-10-2026 + leeromgeving-CTA (LIVE)

## KLAAR (met bewijs)
- **CTA "Kijk rond in onze leeromgeving"** (`916bca6`, deploy-run `37012465455` success): navy blok in `#platform`
  met screenshot van cursus 701 "SBMS 2 Daagse - Voorbeeld" (`src/assets/platform/learn-cursus.webp`, beheerknoppen
  verborgen, naam "Lisa"; SBMS-inhoud mag van Tim) + knop naar `https://learn.medu.game/`. Feature-regel
  "Ons leerplatform, optioneel" is erin opgegaan.
- **Review-fixes** (`41d7fa2`, deploy-run `37012944586` success, live: 200 op /, /en/, abcde; v=41; inloglink 1×):
  0 middenpunten, decoratieve stipjes/labels over beelden/demo-chips weg, 3 sectielabels over (modules,
  ervaringen, faq), nummering weg (incl. "05 · debriefing", ABCDE 01-03), hero zonder stats ("2000+" in de
  vertrouwensregel), mobiel kop → knoppen → gameplay (stage op y=456 i.p.v. 974), moduleverkenner: Cmd/middelklik
  werkt + paneel scrolt in beeld, geen auto-wissel (WCAG 2.2.2), partnernamen .72, roze focusring op navy,
  footer "inloggen" → learn.medu.game/login. 29/29 tests.

## ONGEVERIFIEERD
- Safari/Firefox niet opnieuw bekeken. Footer-tikvlak 44px geldt alleen bij `pointer:coarse` (niet gemeten op
  een echt toestel). `.bignum` op reanimatie-aed (3×) bewust ongemoeid (niet gemeten op contrast).

## KLAAR — copy (akkoord Tim, `2904375`, deploy-run `37013487234` success, live NL+EN nagemeten)
- Hero-lede 18 woorden; quotes Bindraban + IC eerst; ABCDE "speel in de demo" → "plan een demo (30 min)";
  3 dubbele platformkenmerken weg; FAQ "Hoe gaan jullie om met privacy en de AVG?" (feiten uit privacy.html §7).

## OPEN
- **Bron voor "2000+ professionals getraind"** — onbekend, staat nu in de vertrouwensregel. Tim: bron/datum, of weghalen.
- FAQ over accreditatie en implementatietijd: geen feiten beschikbaar, niet toegevoegd.
- learn.medu.game-homepage herhaalt de koppen van medu.game (de CTA linkt daarheen); eigen opening overwegen.

---

# NEXT — redesign live (2026-09-30), beslismoment in review

## KLAAR (met bewijs)
- **LIVE sinds 2026-09-30:** `master` fast-forward naar `0bde330` en gepusht; deploy-run `36708315477`
  `completed success`. Live gecontroleerd: 200 + geldige TLS op /, /en/, modules, team, OG-kaart, sitemap;
  titel, cache-buster v40, x-default EN en en_GB kloppen; browsercheck op https://medu.game zonder
  JS-fouten of overflow. Vóór livegang ook WebKit (Safari) en Firefox gecontroleerd: schoon.
- Homepage + 4 modulepagina's in het design "medu.game homepage" (Claude Design), NL + EN.
- UI-polish-ronde (richtlijnen uit open-design: anti-ai-slop, slop-test, motion):
  - `e834432` tier 1 — geen eindeloze animaties meer (pulse alleen op de hero-gameplaychip,
    drift statisch, marquee → statische logo-rij, leerlijn-stip → lijn die eenmalig vult),
    geen hover-lift op niet-klikbare kaarten, hover-transforms alleen bij `(hover:hover)`,
    focusringen zonder fade-in, pijltjes schuiven 3px mee, `text-wrap:pretty`, `tabular-nums`,
    `overflow-x:clip`.
  - `67d8567` tier 2 (los terug te draaien met `git revert 67d8567`) — sectienummers weg
    (lost ook ontbrekende 05 op ABCDE op), 3-kaarten-icoongrids → kolommen onder een lijn
    (`.grid-3.ruled`), 5 platformkaarten → specificatielijst. Tekst alleen aangepast in de
    sectielabels (nummering eraf); verder geen copy gewijzigd. Let op: de commitboodschap zegt
    "Geen tekst gewijzigd", dat klopt dus niet helemaal.
  - `135bf7a` — 320px-overflow opgelost (hamburger viel 18px buiten beeld, bestond al vóór deze
    ronde; ABCDE-grid 3px), trust-rij met vaste gap, lijn boven `.ruled`-kolommen tekent eenmalig in.
  - `fb6e598` — ui-skills.com-playbook: klik-tabwissels direct, feedback ≤200ms, knop-press
    scale(.97), tikvlakken ≥44px (gemeten op 390px, alle 7 paginatypes), quote-bolletjes animeren
    geen `width` meer, specificatielijst met witruimte i.p.v. lijnen, `.textlink` gedeeld (was
    ongestyled op modulepagina's).
  - `d2fba8d` — 8 ontworpen OG-cards 1200×630 (4 modules × NL/EN) i.p.v. kale screenshots;
    opnieuw renderen met `scripts/og-cards.mjs`.
  - `832cc5a` — SEO-besluiten Tim: x-default → EN, ABCDE-hoofdterm EN "ABCDE approach" /
    NL "ABCDE-methode" (titel, H1, desc, Course-schema, share-card), titels "Pagina | Medu.game",
    en_GB. Tests aangepast aan x-default EN en en_GB; 29/29 pass.
  - `d89daa8` — keuzes Tim: trustlabel "samengewerkt met" (zoals live), "Meertalig & bewezen" als
    6e regel in de platformlijst, footer-regel "nederlands · english · português (br)" weg,
    ECG-bijschriften 6–7 blijven neutraal.
  - `b03aa0c` — feedback Tim 30 sep: footer "Medu.game B.V.", 2 chips weg, videolabel linksboven,
    leerlijn-tekst volle breedte, Triage Cockpit-teaser i.p.v. "In ontwikkeling"-regel (screenshot
    zelf gemaakt uit `~/Projects/triage-cockpit`, lokaal gedraaid), apparaatwisselaar met eigen
    screenshot per apparaat (geschaald, landscape-telefoon), avatar-randje weg, CTA-figuur
    char-cardio-think.
  - `7c0f7c0` — videochip massief; avatar-randje in Safari opgelost (bronbestanden: zwarte/transparante
    hoeken → effen roze, gemeten in WebKit 26); Triage Cockpit als 5e module "binnenkort" in de kiezer.
  - `f9eefd1` chips dekkend · `aafe54a` punt weg uit moduletitels + share-cards ·
    `1f6ddec` dode klikvlakken statisch (ABCDE-stappen, BLS-stappen, ECG-patiëntkaarten), NL-termen
    vertaald (gameplay/walkthrough/content/screenshot…), nieuwe 3D-teamportretten, teamtitel in Fieldwork ·
    `2c7771c` ABCDE-stappen: niet-klikbare markering die 1→4 doorloopt (alleen in beeld, pauze bij hover,
    uit bij reduced motion).
- **Branch `beslismoment`** (worktree `../medu-game-website-beslismoment`, 2 commits bovenop
  redesign-interactief, gerebased op `b03aa0c`): speelbare mini-casus op de ABCDE-pagina (`#probeer`), NL + EN.
  Doorgespeeld in Chromium: goede route 10→20→30 met SpO₂ 94% · O₂, foute route 0/30 met 87%,
  dubbele klik genegeerd, focus naar vraag/resultaat, geen JS-fouten, geen overflow 320–1440px.
  **Niet mergen vóór expertcheck** (besluit Tim).
- UI-skills globaal geïnstalleerd in `~/.claude/skills/` (via `npx skills add … -g -a claude-code`):
  ibelick (baseline-ui, fixing-accessibility, fixing-metadata, fixing-motion-performance, improve-ui,
  ui-skills-root), emilkowalski (emil-design-eng, improve-animations, review-animations,
  find-animation-opportunities, animate), jakubkrehel (better-interface, better-ui, better-layout,
  better-typography, interface-review), vercel-labs/web-design-guidelines, addyosmani (seo,
  web-quality-audit, core-web-vitals, accessibility).
- `npm test`: 29/29 pass. `npm run build`: 9 pagina's × 2 talen, asserties groen. Cache-buster v27.
- Chromium (headless 1234): overflow-vrij op 320, 390, 768, 1024, 1180 en 1440 px. Op 390 en 1440 px, met én zonder JS, alle 18 pagina's: geen
  horizontale overflow, geen JS-fouten, geen zichtbare `.js-only`. Zonder JS tonen testimonials
  en ECG-vragen bewust allemaal (`html:not(.js)`-regels).
- Auto-rotatie stopt bij klik/tik op triggers en pijlen (click-handler), hover en focus.

## ONGEVERIFIEERD
- Netto minder beweging dan voorheen (5 lussen/hovers weg, 3 eenmalige animaties erbij): een bewuste keuze, Tim moet hem nog beoordelen.
- Echte telefoons/tablets, screenreaders.

## GEBLOKKEERD
- Beslismoment: een expert moet de klinische inhoud checken (casus mevrouw Jansen, 3 stappen,
  9 opties + feedback, NL én EN). Wie, beslist Tim. Daarna: `git merge beslismoment`.

## OPVOLGING ELDERS
- Gedaan: `medu-game-social/.agents/product-marketing.md` v7 legt de hoofdterm vast (NL
  "ABCDE-methode", EN "ABCDE approach", YouTube-EN mag "ABCDE assessment").

## VOLGENDE STAP
Beslismoment reviewen (branch `beslismoment`, bovenop de live stand):
```
cd ../medu-game-website-beslismoment && npm run build && python3 -m http.server -d dist 8092   # → http://localhost:8092/modules/abcde.html#probeer
```
Na akkoord van Tim + expertcheck: `git switch master && git merge --ff-only beslismoment && git push origin master`.
