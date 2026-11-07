import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixCanon } from './05_fixation.js';

function blockCanon(types) {
  return {
    canon: types.join(','),
    columns: types.map(t => ({
      type: t,
      completeness: { filled: 2, total: 2, gapIndices: [] },
    })),
  };
}

test('fixCanon: n,n with sep resolution', () => {
  const r = fixCanon(blockCanon(['n', 'n']), { commas: ['sep'] }, '_,_');
  assert.notEqual(r.plan, null);
  assert.equal(r.plan.pattern, '_,_');
  assert.deepEqual(r.plan.commaRoles, ['sep']);
  assert.deepEqual(r.plan.columnTypes, ['n', 'n']);
  assert.equal(r.plan.numColumns, 2);
  assert.equal(r.diagnostics.length, 0);
});

test('fixCanon: z,z,z with dec,sep (fused)', () => {
  const r = fixCanon(blockCanon(['n', 'z']), { commas: ['dec', 'sep'] }, '_,_,_');
  assert.deepEqual(r.plan.commaRoles, ['dec', 'sep']);
  assert.deepEqual(r.plan.columnTypes, ['n', 'z']);
  assert.equal(r.plan.numColumns, 2);
});

test('fixCanon: v slot', () => {
  const r = fixCanon(blockCanon(['z', 'v', 'z']), { commas: ['sep', 'sep'] }, '_,v,_');
  assert.deepEqual(r.plan.columnTypes, ['z', 'v', 'z']);
  assert.equal(r.plan.numColumns, 3);
});

test('fixCanon: resolution length mismatch → error', () => {
  const r = fixCanon(blockCanon(['n', 'n']), { commas: ['sep', 'sep'] }, '_,_');
  assert.equal(r.plan, null);
  assert.equal(r.diagnostics[0].code, 'RESOLUTION_LENGTH_MISMATCH');
  assert.equal(r.diagnostics[0].params.expected, 1);
  assert.equal(r.diagnostics[0].params.got, 2);
});

test('fixCanon: missing blockCanon → error', () => {
  const r = fixCanon(null, { commas: ['sep'] }, '_,_');
  assert.equal(r.plan, null);
  assert.equal(r.diagnostics[0].code, 'MISSING_BLOCK_CANON');
});

test('fixCanon: blockCanon with no columns → error', () => {
  const r = fixCanon({ canon: '', columns: [] }, { commas: ['sep'] }, '_,_');
  assert.equal(r.plan, null);
  assert.equal(r.diagnostics[0].code, 'MISSING_BLOCK_CANON');
});

test('fixCanon: no commas (single column)', () => {
  const r = fixCanon(blockCanon(['n']), { commas: [] }, '_');
  assert.equal(r.plan.numColumns, 1);
  assert.deepEqual(r.plan.commaRoles, []);
});
