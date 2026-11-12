import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createColumns, inject } from '../../src/compiler/08_codegen.js';

// --- createColumns ---

test('createColumns: correct length and empty arrays', () => {
  const cols = createColumns(3);
  assert.equal(cols.length, 3);
  assert.deepEqual(cols, [[], [], []]);
});

test('createColumns: rejects zero', () => {
  assert.throws(() => createColumns(0), /invalid numColumns/);
});

test('createColumns: rejects negative', () => {
  assert.throws(() => createColumns(-1), /invalid numColumns/);
});

test('createColumns: rejects non-integer', () => {
  assert.throws(() => createColumns(2.5), /invalid numColumns/);
});

// --- inject ---

test('inject: numeric values', () => {
  const cols = createColumns(3);
  inject([1.5, 2.5, 3.5], cols);
  assert.deepEqual(cols, [[1.5], [2.5], [3.5]]);
});

test('inject: null preserved (not 0)', () => {
  const cols = createColumns(3);
  inject([1.5, null, 3.5], cols);
  assert.deepEqual(cols, [[1.5], [null], [3.5]]);
  assert.equal(cols[1][0], null);
  assert.notEqual(cols[1][0], 0);
});

test('inject: all nulls', () => {
  const cols = createColumns(2);
  inject([null, null], cols);
  assert.deepEqual(cols, [[null], [null]]);
});

test('inject: multiple calls accumulate', () => {
  const cols = createColumns(2);
  inject([1, 2], cols);
  inject([3, 4], cols);
  inject([5, null], cols);
  assert.deepEqual(cols, [[1, 3, 5], [2, 4, null]]);
});

test('inject: preserves order per column', () => {
  const cols = createColumns(2);
  inject([10, 20], cols);
  inject([11, 21], cols);
  inject([12, 22], cols);
  assert.deepEqual(cols[0], [10, 11, 12]);
  assert.deepEqual(cols[1], [20, 21, 22]);
});

// --- Errors ---

test('inject: length mismatch throws', () => {
  const cols = createColumns(3);
  assert.throws(
    () => inject([1, 2], cols),
    /length mismatch \(values=2, columns=3\)/
  );
});

test('inject: non-array values throws', () => {
  assert.throws(
    () => inject(null, []),
    /values and columns must be arrays/
  );
});

test('inject: non-array columns throws', () => {
  assert.throws(
    () => inject([], null),
    /values and columns must be arrays/
  );
});
