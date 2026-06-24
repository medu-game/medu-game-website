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
