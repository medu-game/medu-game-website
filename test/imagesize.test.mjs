import { test } from 'node:test';
import assert from 'node:assert/strict';
import { imageSize } from '../lib/imagesize.mjs';

test('reads PNG dimensions (OG card)', () => {
  assert.deepEqual(imageSize('src/assets/og-home.png'), { width: 1200, height: 630 });
});

test('reads JPEG dimensions', () => {
  assert.deepEqual(imageSize('src/assets/modules/als.jpg'), { width: 2495, height: 1402 });
});

test('reads WebP dimensions', () => {
  assert.deepEqual(imageSize('src/assets/char-cardio.webp'), { width: 540, height: 980 });
});

test('throws on unsupported input', () => {
  assert.throws(() => imageSize('src/assets/medu.css'));
});
