import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verify } from './07_semantics.js';

const plan = (columnTypes) => ({
  pattern: columnTypes.map(t => (t === 'v' ? 'v' : '_')).join(','),
  commaRoles: new Array(Math.max(0, columnTypes.length - 1)).fill('sep'),
  columnTypes,
  numColumns: columnTypes.length,
});

const parsed = (values) => ({ index: 0, ok: true, values, diagnostics: [] });

// --- Pass-through ---

test('verify: parsed.ok=false propagates unchanged', () => {
  const p = { index: 0, ok: false, values: [], diagnostics: [{ severity: 'error', code: 'EXPECTED_COMMA' }] };
  const r = verify(p, plan(['n', 'n']));
  assert.equal(r, p);
  assert.equal(r.ok, false);
});

// --- Valid cases ---

test('verify: all finite values', () => {
  const r = verify(parsed([1.5, 2.5]), plan(['n', 'n']));
  assert.equal(r.ok, true);
  assert.equal(r.diagnostics.length, 0);
});

test('verify: nulls are tolerated in n/z/i columns', () => {
  const r = verify(parsed([null, 2.5, null]), plan(['n', 'i', 'z']));
  assert.equal(r.ok, true);
  assert.equal(r.diagnostics.length, 0);
});

test('verify: all nulls in v column are fine', () => {
  const r = verify(parsed([1.5, null, 2.5]), plan(['n', 'v', 'n']));
  assert.equal(r.ok, true);
  assert.equal(r.diagnostics.length, 0);
});

test('verify: z column accepts non-integer values (exponents)', () => {
  // 1e-2 has no dot in raw → 'z', but value 0.01 is not integer.
  const r = verify(parsed([0.01]), plan(['z']));
  assert.equal(r.ok, true);
  assert.equal(r.diagnostics.length, 0);
});

// --- Errors ---

test('verify: Infinity rejected', () => {
  const r = verify(parsed([1.5, Infinity]), plan(['n', 'n']));
  assert.equal(r.ok, false);
  assert.equal(r.diagnostics.length, 1);
  assert.equal(r.diagnostics[0].code, 'INVALID_NUMERIC_VALUE');
  assert.equal(r.diagnostics[0].params.column, 1);
});

test('verify: -Infinity rejected', () => {
  const r = verify(parsed([-Infinity]), plan(['n']));
  assert.equal(r.ok, false);
  assert.equal(r.diagnostics[0].code, 'INVALID_NUMERIC_VALUE');
});

test('verify: NaN rejected', () => {
  const r = verify(parsed([NaN]), plan(['n']));
  assert.equal(r.ok, false);
  assert.equal(r.diagnostics[0].code, 'INVALID_NUMERIC_VALUE');
});

test('verify: value in v column rejected', () => {
  const r = verify(parsed([1.5, 2.5]), plan(['n', 'v']));
  assert.equal(r.ok, false);
  assert.equal(r.diagnostics[0].code, 'VALUE_IN_EMPTY_COLUMN');
  assert.equal(r.diagnostics[0].params.column, 1);
});

test('verify: count mismatch rejected', () => {
  const r = verify(parsed([1.5, 2.5]), plan(['n', 'n', 'n']));
  assert.equal(r.ok, false);
  assert.equal(r.diagnostics[0].code, 'SEMANTIC_COUNT_MISMATCH');
});

test('verify: multiple errors accumulate', () => {
  const r = verify(parsed([Infinity, 2.5, NaN]), plan(['n', 'v', 'n']));
  assert.equal(r.ok, false);
  assert.ok(r.diagnostics.length >= 2);
  const codes = r.diagnostics.map(d => d.code);
  assert.ok(codes.includes('INVALID_NUMERIC_VALUE'));
  assert.ok(codes.includes('VALUE_IN_EMPTY_COLUMN'));
});
