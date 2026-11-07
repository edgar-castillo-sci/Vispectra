import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compile } from './main.js';

function mockFile(name, content) {
  return { name, text: async () => content };
}

function lines(n, fn) {
  return Array.from({ length: n }, (_, i) => fn(i));
}

// --- Happy path ---

test('compile: clean n,n file → status ok', async () => {
  const content = lines(20, (i) => `${350 + i}.0,${0.5 - i * 0.01}`).join('\n');
  const r = await compile(mockFile('clean.csv', content));
  assert.equal(r.status, 'ok');
  assert.equal(r.numColumns, 2);
  assert.equal(r.columns.length, 2);
  assert.equal(r.columns[0].length, r.totalRows);
  assert.equal(r.failedRows, 0);
  assert.equal(r.segments.length, 1);
  assert.equal(r.segments[0].isException, false);
});

// --- Ambiguity ---

test('compile: ambiguous z,z file → needs_disambiguation', async () => {
  const content = lines(20, (i) => `${i},${i + 1}`).join('\n');
  const r = await compile(mockFile('ambiguous.csv', content));
  assert.equal(r.status, 'needs_disambiguation');
  assert.equal(r.columns, null);
  assert.ok(r.ambiguities);
  assert.equal(r.ambiguities.blocks.length, 1);
  assert.ok(r.ambiguities.blocks[0].resolutions.length >= 2);
});

test('compile: ambiguity resolved manually → ok', async () => {
  const content = lines(20, (i) => `${i},${i + 1}`).join('\n');
  const r = await compile(mockFile('ambiguous.csv', content), {
    resolutions: { '_,_': ['dec'] },
  });
  assert.equal(r.status, 'ok');
  assert.equal(r.numColumns, 1);
  assert.equal(r.columns[0].length, r.totalRows);
});

test('compile: auto resolution skips editor', async () => {
  const content = lines(20, (i) => `${i},${i + 1}`).join('\n');
  const r = await compile(mockFile('ambiguous.csv', content), {
    resolutions: 'auto',
  });
  assert.notEqual(r.status, 'needs_disambiguation');
});

// --- Partial ---

test('compile: FUSION_UNSAFE rows become partial', async () => {
  // 10 valid fusions (`8,12` → 8.12) + 10 unsafe (`-1,-5` has signs).
  // Structurally all rows are `z,z`, so the block parses; the parser
  // rejects the signed fusions with FUSION_UNSAFE.
  const content = [
    ...lines(10, (i) => `${i + 1},${i + 5}`),
    ...lines(10, (i) => `${-1 - i},${-5 - i}`),
  ].join('\n');

  const r = await compile(mockFile('signed.csv', content), {
    resolutions: { '_,_': ['dec'] },
    maxFailureRatio: 0.6,
  });

  assert.equal(r.status, 'partial');
  assert.equal(r.failedRows, 10);
  assert.equal(r.totalRows, 20);
  assert.equal(r.columns[0].length, 20);

  const codes = r.diagnostics.map((d) => d.code);
  assert.ok(codes.includes('FUSION_UNSAFE'));
  assert.ok(codes.includes('ROW_SKIPPED'));
});

// --- Failed ---

test('compile: resolution rejected by 04c → failed', async () => {
  // Resolution declares 2 comma roles for a pattern that has only 1.
  // 04c rejects it (RESOLUTION_LENGTH_MISMATCH), plans is empty,
  // and main.js returns status: 'failed' with columns: null.
  const content = lines(20, (i) => `${i},${i + 1}`).join('\n');
  const r = await compile(mockFile('rejected.csv', content), {
    resolutions: { '_,_': ['dec', 'dec'] },
    maxFailureRatio: 0.01,
  });
  assert.equal(r.status, 'failed');
  assert.equal(r.columns, null);
});

test('compile: two blocks with different numColumns → failed', async () => {
  // 10 n,n rows (2 columns) + 10 z,z,z rows (3 columns). Sample
  // straddles both patterns, body captures all 20 rows, two blocks
  // produce incompatible counts → BLOCK_COUNT_MISMATCH.
  const content = [
    ...lines(10, (i) => `${350 + i}.0,${0.5 - i * 0.01}`),
    ...lines(10, (i) => `${i},${i + 1},${i + 2}`),
  ].join('\n');

  const r = await compile(mockFile('mixed.csv', content), {
    resolutions: { '_,_,_': ['sep', 'sep'] },
  });

  assert.equal(r.status, 'failed');
  assert.equal(r.columns, null);

  const codes = r.diagnostics.map((d) => d.code);
  assert.ok(codes.includes('BLOCK_COUNT_MISMATCH'));
});
