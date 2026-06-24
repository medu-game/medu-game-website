// test/urls.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonical, altUrls, outputPath, switchHref, rewriteLinks, urlPath } from '../lib/urls.mjs';

test('urlPath strips index.html', () => {
  assert.equal(urlPath('index.html'), '');
  assert.equal(urlPath('modules/abcde.html'), 'modules/abcde.html');
});

test('canonical builds pretty home and module urls', () => {
  assert.equal(canonical('index.html', 'nl'), 'https://medu.game/');
  assert.equal(canonical('index.html', 'en'), 'https://medu.game/en/');
  assert.equal(canonical('modules/abcde.html', 'nl'), 'https://medu.game/modules/abcde.html');
  assert.equal(canonical('modules/abcde.html', 'en'), 'https://medu.game/en/modules/abcde.html');
});

test('altUrls returns nl, en, x-default', () => {
  assert.deepEqual(altUrls('modules/ecg.html'), {
    nl: 'https://medu.game/modules/ecg.html',
    en: 'https://medu.game/en/modules/ecg.html',
    xDefault: 'https://medu.game/modules/ecg.html',
  });
});

test('outputPath maps to dist-relative file', () => {
  assert.equal(outputPath('index.html', 'nl'), 'index.html');
  assert.equal(outputPath('index.html', 'en'), 'en/index.html');
  assert.equal(outputPath('modules/als.html', 'en'), 'en/modules/als.html');
});

test('switchHref points at the counterpart', () => {
  assert.equal(switchHref('index.html', 'en'), '/en/');
  assert.equal(switchHref('index.html', 'nl'), '/');
  assert.equal(switchHref('modules/als.html', 'en'), '/en/modules/als.html');
  assert.equal(switchHref('modules/als.html', 'nl'), '/modules/als.html');
});

test('rewriteLinks prefixes internal page links for EN only', () => {
  const html = '<a href="/">h</a><a href="/modules/abcde.html">m</a><a href="/assets/x.css">a</a><a href="mailto:x@y.z">e</a><a href="#contact">c</a>';
  assert.equal(rewriteLinks(html, 'nl'), html);
  const en = rewriteLinks(html, 'en');
  assert.match(en, /href="\/en\/"/);
  assert.match(en, /href="\/en\/modules\/abcde\.html"/);
  assert.match(en, /href="\/assets\/x\.css"/);   // untouched
  assert.match(en, /href="mailto:x@y\.z"/);       // untouched
  assert.match(en, /href="#contact"/);            // untouched
});
