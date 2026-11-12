import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyPipeline } from '../../src/services/pipeline.js';

const cols = [
  [1, 2, 3, 4, 5],        // x
  [10, 20, 30, 40, 50],   // y0
  [5, 4, 3, 2, 1],        // y1
];

test('applyPipeline: empty pipeline is identity', () => {
  const out = applyPipeline(cols, 0, [1], []);
  assert.deepEqual(out, cols);
  assert.notEqual(out, cols); // new array
});

test('applyPipeline: does not mutate input', () => {
  const original = JSON.parse(JSON.stringify(cols));
  applyPipeline(cols, 0, [1], [{ type: 'max' }]);
  assert.deepEqual(cols, original);
});

test('applyPipeline: normalize max on y0', () => {
  const out = applyPipeline(cols, 0, [1], [{ type: 'max' }]);
  assert.deepEqual(out[1], [0.2, 0.4, 0.6, 0.8, 1.0]);
});

test('applyPipeline: normalize minmax on y1', () => {
  const out = applyPipeline(cols, 0, [2], [{ type: 'minmax' }]);
  assert.deepEqual(out[2], [1, 0.75, 0.5, 0.25, 0]);
});

test('applyPipeline: skips x column', () => {
  const out = applyPipeline(cols, 0, [0, 1], [{ type: 'max' }]);
  // y0 normalized, x untouched
  assert.deepEqual(out[0], cols[0]);
  assert.deepEqual(out[1], [0.2, 0.4, 0.6, 0.8, 1.0]);
});

test('applyPipeline: skips out-of-range index', () => {
  const out = applyPipeline(cols, 0, [99], [{ type: 'max' }]);
  assert.deepEqual(out, cols);
});

test('applyPipeline: unknown op is ignored', () => {
  const out = applyPipeline(cols, 0, [1], [{ type: 'unknown-op' }]);
  assert.deepEqual(out[1], cols[1]);
});
