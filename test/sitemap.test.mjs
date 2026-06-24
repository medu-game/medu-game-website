import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSitemap } from '../lib/sitemap.mjs';

test('sitemap lists every page in every language with alternates', () => {
  const xml = buildSitemap(['index.html', 'modules/abcde.html']);
  assert.match(xml, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
  assert.match(xml, /<loc>https:\/\/medu\.game\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/medu\.game\/en\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/medu\.game\/modules\/abcde\.html<\/loc>/);
  assert.match(xml, /<loc>https:\/\/medu\.game\/en\/modules\/abcde\.html<\/loc>/);
  assert.match(xml, /<xhtml:link rel="alternate" hreflang="x-default" href="https:\/\/medu\.game\/"\s*\/>/);
  // 4 url blocks
  assert.equal((xml.match(/<url>/g) || []).length, 4);
});
