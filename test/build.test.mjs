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
  // no leftover bilingual spans / toggle attributes (word-boundary avoids matching hreflang="en")
  assert.doesNotMatch(nl, /\blang="en"/);
  assert.doesNotMatch(en, /\blang="nl"/);
  assert.doesNotMatch(nl, /data-lang|data-title-|data-desc-/);
  // SEO present
  assert.match(nl, /rel="canonical" href="https:\/\/medu\.game\/"/);
  assert.match(en, /hreflang="x-default"/);
  // switch links to counterpart
  assert.match(nl, /href="\/en\/"/);
  assert.match(en, /href="\/"/);
});
