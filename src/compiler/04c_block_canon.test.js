import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBlockCanon } from './04c_block_canon.js';

function setup(strings, pattern) {
  const lines = strings.map((content, index) => ({ index, content }));
  const block = { pattern, instances: lines.map(l => l.index) };
  return { lines, block };
}

// --- Pure cases ---

test('all n → canon n,n', () => {
  const { lines, block } = setup(
    ['1.5,2.5', '3.5,4.5', '5.5,6.5'],
    '_,_'
  );
  const r = buildBlockCanon(block, lines, { commas: ['sep'] });
  assert.equal(r.canon, 'n,n');
  assert.equal(r.diagnostics.length, 0);
  assert.equal(r.columns[0].completeness.filled, 3);
});

test('all z with sep,sep → canon z,z,z', () => {
  const { lines, block } = setup(['1,0,1', '1,1,0'], '_,_,_');
  const r = buildBlockCanon(block, lines, { commas: ['sep', 'sep'] });
  assert.equal(r.canon, 'z,z,z');
  assert.equal(r.columns.length, 3);
  assert.equal(r.diagnostics.length, 0);
});

test('all z with dec,sep → fused n,z', () => {
  const { lines, block } = setup(['1,0,1', '1,1,0'], '_,_,_');
  const r = buildBlockCanon(block, lines, { commas: ['dec', 'sep'] });
  assert.equal(r.canon, 'n,z');
  assert.equal(r.columns.length, 2);
});

test('all z with sep,dec → fused z,n', () => {
  const { lines, block } = setup(['1,0,1', '1,1,0'], '_,_,_');
  const r = buildBlockCanon(block, lines, { commas: ['sep', 'dec'] });
  assert.equal(r.canon, 'z,n');
});

// --- Mixed notation ---

test('mix of n and z in same column → i + MIXED_NOTATION', () => {
  const { lines, block } = setup(
    ['1.5,2.5', '3,4', '5.5,6.5'],
    '_,_'
  );
  const r = buildBlockCanon(block, lines, { commas: ['sep'] });
  assert.equal(r.canon, 'i,i');
  const mixed = r.diagnostics.filter(d => d.code === 'MIXED_NOTATION');
  assert.equal(mixed.length, 2);
  assert.equal(mixed[0].severity, 'info');
});

// --- Gaps ---

test('empty slot in middle column → v + COLUMN_GAPS', () => {
  const { lines, block } = setup(
    ['1.5,2.5,3.5', '1.5,,3.5'],
    '_,_,_'
  );
  const r = buildBlockCanon(block, lines, { commas: ['sep', 'sep'] });
  assert.equal(r.canon, 'n,n,n');
  assert.equal(r.columns[0].type, 'n');
  assert.equal(r.columns[1].type, 'n');
  assert.deepEqual(r.columns[1].completeness.gapIndices, [1]);
  const gaps = r.diagnostics.filter(d => d.code === 'COLUMN_GAPS');
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].params.column, 1);
});

test('explicit v column → type v', () => {
  const { lines, block } = setup(['1.5, ,3.5', '2.5, ,4.5'], '_,v,_');
  const r = buildBlockCanon(block, lines, null); // no resolution → default all-sep
  assert.equal(r.canon, 'n,v,n');
  assert.equal(r.columns[1].type, 'v');
  assert.equal(r.columns[1].completeness.filled, 0);
  assert.equal(r.columns[1].completeness.total, 2);
});

// --- Edge cases ---

test('single column (no commas)', () => {
  const { lines, block } = setup(['42.5', '43.0'], '_');
  const r = buildBlockCanon(block, lines, null);
  assert.equal(r.canon, 'n');
  assert.equal(r.columns.length, 1);
});

test('resolution length mismatch → error', () => {
  const { lines, block } = setup(['1.5,2.5'], '_,_');
  const r = buildBlockCanon(block, lines, { commas: ['sep', 'sep'] });
  assert.equal(r.canon, '');
  assert.equal(r.diagnostics[0].code, 'RESOLUTION_LENGTH_MISMATCH');
});

test('resolution invalid for structure → error', () => {
  const { lines, block } = setup(['1.5,2.5'], '_,_');
  // dec invalid: '1.5' has a dot
  const r = buildBlockCanon(block, lines, { commas: ['dec'] });
  assert.equal(r.canon, '');
  assert.equal(r.diagnostics[0].code, 'RESOLUTION_MISMATCH');
});
