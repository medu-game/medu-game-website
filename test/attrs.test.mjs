// test/attrs.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyLangAttrs } from '../lib/attrs.mjs';

test('EN build swaps in the override and drops the data attr', () => {
  const h = '<img alt="beeld uit de module" data-alt-en="still from the module">';
  assert.equal(applyLangAttrs(h, 'en'), '<img alt="still from the module">');
});

test('NL build keeps the base value and drops the data attr', () => {
  const h = '<img alt="beeld uit de module" data-alt-en="still from the module">';
  assert.equal(applyLangAttrs(h, 'nl'), '<img alt="beeld uit de module">');
});

test('aria-label is overridable too', () => {
  const h = '<button aria-label="sluiten" data-aria-label-en="close">x</button>';
  assert.equal(applyLangAttrs(h, 'en'), '<button aria-label="close">x</button>');
  assert.equal(applyLangAttrs(h, 'nl'), '<button aria-label="sluiten">x</button>');
});

test('attrs without an override are untouched', () => {
  const h = '<img alt="tanja beldman"><a aria-label="LinkedIn">x</a>';
  assert.equal(applyLangAttrs(h, 'en'), h);
  assert.equal(applyLangAttrs(h, 'nl'), h);
});

test('multiple overrides on one page all resolve', () => {
  const h = '<img alt="a" data-alt-en="A"><img alt="b" data-alt-en="B">';
  assert.equal(applyLangAttrs(h, 'en'), '<img alt="A"><img alt="B">');
});
