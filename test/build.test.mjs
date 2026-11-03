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
  // agent-readable files
  const llms = readFileSync('dist/llms.txt', 'utf8');
  assert.match(llms, /^# Medu\.game\n\n> /);
  assert.match(llms, /\(https:\/\/medu\.game\/en\/modules\/abcde\.html\)/);
  assert.doesNotMatch(llms, /undefined/);
  assert.match(readFileSync('dist/agents.md', 'utf8'), /## When Medu\.game is a good fit/);
  assert.match(readFileSync('dist/index.md', 'utf8'), /## Frequently asked questions/);
  assert.match(readFileSync('dist/404.html', 'utf8'), /href="https:\/\/medu\.game\/en\/demo\.html"/);
  // Organization carries a description
  assert.match(en, /"@type":"Organization"[^}]*"description":"Medu\.game is the game-based/);

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

test('zzz restore production dist', () => {
  execFileSync('node', ['build.js'], { stdio: 'inherit' });
  assert.match(readFileSync('dist/index.html', 'utf8'), /rel="canonical" href="https:\/\/medu\.game\/"/);
});
