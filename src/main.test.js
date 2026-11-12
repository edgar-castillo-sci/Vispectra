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

test('compile: R109 keeps widest block, smaller is discarded', async () => {
  // 10 n,n rows (2 columns) + 10 z,z,z rows (3 columns). Equal row count;
  // the R109 tiebreaker in main.js prefers the wider block, so the 2-column
  // block is discarded as garbage and its rows are null-padded to width 3.
  const content = [
    ...lines(10, (i) => `${350 + i}.0,${0.5 - i * 0.01}`),
    ...lines(10, (i) => `${i},${i + 1},${i + 2}`),
  ].join('\n');

  const r = await compile(mockFile('mixed.csv', content), {
    resolutions: { '_,_,_': ['sep', 'sep'] },
  });

  assert.equal(r.status, 'ok');
  assert.equal(r.numColumns, 3);
  assert.equal(r.columns.length, 3);
  assert.equal(r.totalRows, 20);

  const codes = r.diagnostics.map((d) => d.code);
  assert.ok(
    !codes.includes('BLOCK_COUNT_MISMATCH'),
    'R109 should discard the smaller block instead of aborting'
  );

  // Rows from the discarded 2-column block (rows 0-9) are null-padded.
  for (let i = 0; i < 10; i++) {
    assert.equal(r.columns[0][i], null);
    assert.equal(r.columns[1][i], null);
    assert.equal(r.columns[2][i], null);
  }

  // Rows from the winning 3-column block (rows 10-19) carry real values.
  for (let i = 10; i < 20; i++) {
    assert.equal(r.columns[0][i], i - 10);
    assert.equal(r.columns[1][i], i - 9);
    assert.equal(r.columns[2][i], i - 8);
  }
});
