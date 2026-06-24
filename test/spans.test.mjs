import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unwrapLang } from '../lib/spans.mjs';

test('keeps chosen language, drops the other', () => {
  const h = '<p><span lang="nl">hallo</span><span lang="en">hello</span></p>';
  assert.equal(unwrapLang(h, 'nl'), '<p>hallo</p>');
  assert.equal(unwrapLang(h, 'en'), '<p>hello</p>');
});

test('preserves nested non-lang spans inside a lang span', () => {
  const h = '<h2><span lang="nl">Medu<span class="dot">.</span>game NL</span><span lang="en">Medu<span class="dot">.</span>game EN</span></h2>';
  assert.equal(unwrapLang(h, 'nl'), '<h2>Medu<span class="dot">.</span>game NL</h2>');
  assert.equal(unwrapLang(h, 'en'), '<h2>Medu<span class="dot">.</span>game EN</h2>');
});

test('preserves nested markup like <b> and <br/>', () => {
  const h = '<span lang="nl">a<br/><b>b</b></span><span lang="en">c</span>';
  assert.equal(unwrapLang(h, 'nl'), 'a<br/><b>b</b>');
});

test('leaves text without lang spans untouched', () => {
  assert.equal(unwrapLang('<div>plain</div>', 'nl'), '<div>plain</div>');
});
