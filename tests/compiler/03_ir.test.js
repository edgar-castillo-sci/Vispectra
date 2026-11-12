// compiler/03_ir.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIR } from '../../src/compiler/03_ir.js';

test('buildIR: single structure', () => {
  const ir = buildIR([
    { index: 0, structure: 'n,n' },
    { index: 1, structure: 'n,n' },
    { index: 2, structure: 'n,n' },
  ]);
  assert.equal(ir.totalCount, 3);
  assert.deepEqual(ir.frequencies, { 'n,n': 3 });
  assert.deepEqual(ir.lengths, [3]);
  assert.equal(ir.diagnostics.length, 0);
});

test('buildIR: mixed structures', () => {
  const ir = buildIR([
    { index: 0, structure: 'n,n' },
    { index: 1, structure: 'z,z' },
    { index: 2, structure: 'n,n' },
  ]);
  assert.equal(ir.totalCount, 3);
  assert.deepEqual(ir.frequencies, { 'n,n': 2, 'z,z': 1 });
  assert.equal(ir.lengths.length, 2);
});

test('buildIR: heterogeneous warning', () => {
  const structures = [];
  for (let i = 0; i < 6; i++) {
    structures.push({ index: i, structure: 'x'.repeat(i + 1) });
  }
  const ir = buildIR(structures);
  assert.equal(ir.diagnostics.length, 1);
  assert.equal(ir.diagnostics[0].code, 'HETEROGENEOUS_STRUCTURES');
});

test('buildIR: empty input', () => {
  const ir = buildIR([]);
  assert.equal(ir.totalCount, 0);
  assert.deepEqual(ir.frequencies, {});
  assert.deepEqual(ir.lengths, []);
  assert.equal(ir.diagnostics.length, 0);
});
