import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deduplicateColumns } from '../../src/services/columns.js';

test('deduplicateColumns: identical columns', () => {
  const cols = [[1, 2, 3], [1, 2, 3], [4, 5, 6]];
  const { unique, originalIndices } = deduplicateColumns(cols);
  assert.equal(unique.length, 2);
  assert.deepEqual(originalIndices, [0, 2]);
});

test('deduplicateColumns: distinct columns', () => {
  const cols = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
  const { unique } = deduplicateColumns(cols);
  assert.equal(unique.length, 3);
});

test('deduplicateColumns: within epsilon', () => {
  const cols = [[1.0, 2.0], [1.0000001, 2.0000001]];
  const { unique } = deduplicateColumns(cols, 1e-6);
  assert.equal(unique.length, 1);
});

test('deduplicateColumns: null === null', () => {
  const cols = [[1, null, 3], [1, null, 3]];
  const { unique } = deduplicateColumns(cols);
  assert.equal(unique.length, 1);
});

test('deduplicateColumns: null !== number', () => {
  const cols = [[1, null, 3], [1, 2, 3]];
  const { unique } = deduplicateColumns(cols);
  assert.equal(unique.length, 2);
});

test('deduplicateColumns: different lengths never duplicate', () => {
  const cols = [[1, 2], [1, 2, 3]];
  const { unique } = deduplicateColumns(cols);
  assert.equal(unique.length, 2);
});

test('deduplicateColumns: empty input', () => {
  const { unique, originalIndices } = deduplicateColumns([]);
  assert.deepEqual(unique, []);
  assert.deepEqual(originalIndices, []);
});
