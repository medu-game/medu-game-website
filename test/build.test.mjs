// test/build.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

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
  // entity-encoded demo title: escaped once in HTML, plain in JSON-LD and llms.txt
  const demo = readFileSync('dist/en/demo.html', 'utf8');
  assert.doesNotMatch(demo, /&amp;amp;/);
  assert.match(demo, /"name":"Demo & contact \| Medu\.game"/);
  assert.match(llms, /\[Demo & contact\]/);
  // pricing page + Course offers
  assert.ok(existsSync('dist/pricing.html') && existsSync('dist/en/pricing.html'));
  assert.match(readFileSync('dist/en/pricing.html', 'utf8'), /"@type":"OfferCatalog"/);
  assert.match(readFileSync('dist/modules/abcde.html', 'utf8'), /"offers":\{"@type":"Offer"[^}]*"price":"100\.00","priceCurrency":"EUR"/);
  assert.match(llms, /ABCDE €100/);
  assert.match(readFileSync('dist/pricing.md', 'utf8'), /\| \[ABCDE\]\(https:\/\/medu\.game\/en\/modules\/abcde\.html\) \| €100 \|/);
  // ARD manifest + discovery
  const ard = JSON.parse(readFileSync('dist/.well-known/ard.json', 'utf8'));
  assert.ok(ard.entries.length >= 3);
  for (const e of ard.entries) {
    assert.match(e.identifier, /^urn:air:medu\.game:[a-z-]+:[a-z-]+$/);
    assert.ok(e.displayName && e.type && e.url && !e.data);
    assert.ok(e.representativeQueries.length >= 2 && e.representativeQueries.length <= 5);
  }
  assert.match(nl, /<link rel="ard" type="application\/json" href="\/\.well-known\/ard\.json">/);
  assert.match(readFileSync('dist/robots.txt', 'utf8'), /Agentmap: https:\/\/medu\.game\/\.well-known\/ard\.json/);
  // Content signals in robots.txt
  assert.match(readFileSync('dist/robots.txt', 'utf8'), /User-agent: \*\nContent-Signal: search=yes, ai-input=yes, ai-train=no\n/);
  // HTML link equivalents of Link headers
  assert.match(nl, /<link rel="describedby" type="text\/plain" href="\/llms\.txt">/);
  assert.match(en, /<link rel="alternate" type="text\/markdown" href="\/index\.md">/);
  // Agent Skills Discovery index: digest matches the published SKILL.md
  const skills = JSON.parse(readFileSync('dist/.well-known/agent-skills/index.json', 'utf8'));
  assert.equal(skills.$schema, 'https://schemas.agentskills.io/discovery/0.2.0/schema.json');
  for (const s of skills.skills) {
    assert.match(s.name, /^[a-z0-9-]+$/);
    assert.equal(s.type, 'skill-md');
    assert.ok(s.description);
    const file = 'dist' + new URL(s.url).pathname;
    const hex = createHash('sha256').update(readFileSync(file)).digest('hex');
    assert.equal(s.digest, `sha256:${hex}`);
    assert.match(readFileSync(file, 'utf8'), new RegExp(`^---\nname: ${s.name}\ndescription: `));
  }
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
