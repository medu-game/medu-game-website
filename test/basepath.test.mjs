import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyBasePath } from '../lib/basepath.mjs';

test('empty base is a no-op', () => {
  const h = '<a href="/en/"><img src="/assets/x.png"></a>';
  assert.equal(applyBasePath(h, ''), h);
});

test('prefixes root-absolute href/src/data-* with the base', () => {
  const h = '<a href="/en/modules/x.html"><img src="/assets/x.png" data-src="/assets/v.webm" data-src-mp4="/assets/v.mp4" data-poster="/assets/p.webp"></a>';
  const out = applyBasePath(h, '/medu-game-website');
  assert.match(out, /href="\/medu-game-website\/en\/modules\/x\.html"/);
  assert.match(out, /src="\/medu-game-website\/assets\/x\.png"/);
  assert.match(out, /data-src="\/medu-game-website\/assets\/v\.webm"/);
  assert.match(out, /data-src-mp4="\/medu-game-website\/assets\/v\.mp4"/);
  assert.match(out, /data-poster="\/medu-game-website\/assets\/p\.webp"/);
});

test('does not touch absolute, mailto, anchor, or protocol-relative urls', () => {
  const h = '<a href="https://medu.game/x">a</a><a href="mailto:x@y.z">b</a><a href="#c">c</a><img src="//cdn/x.png">';
  assert.equal(applyBasePath(h, '/base'), h);
});
