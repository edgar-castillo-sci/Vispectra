import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLine } from './06_parser.js';

const plan = (pattern, commaRoles, numColumns) => ({
  pattern,
  commaRoles,
  columnTypes: new Array(numColumns).fill('n'),
  numColumns,
});

// --- Success cases ---

test('parse: single number, no commas', () => {
  const r = parseLine({ index: 0, content: '42.5' }, plan('_', [], 1));
  assert.equal(r.ok, true);
  assert.deepEqual(r.values, [42.5]);
});

test('parse: two numbers, sep', () => {
  const r = parseLine({ index: 0, content: '1.5,2.5' }, plan('_,_', ['sep'], 2));
  assert.equal(r.ok, true);
  assert.deepEqual(r.values, [1.5, 2.5]);
});

test('parse: three numbers, sep,sep', () => {
  const r = parseLine({ index: 0, content: '1,2,3' }, plan('_,_,_', ['sep', 'sep'], 3));
  assert.equal(r.ok, true);
  assert.deepEqual(r.values, [1, 2, 3]);
});

test('parse: fusion dec,sep', () => {
  const r = parseLine({ index: 0, content: '1,0,1' }, plan('_,_,_', ['dec', 'sep'], 2));
  assert.equal(r.ok, true);
  assert.deepEqual(r.values, [1, 1]);
});

test('parse: fusion sep,dec', () => {
  const r = parseLine({ index: 0, content: '1,0,1' }, plan('_,_,_', ['sep', 'dec'], 2));
  assert.equal(r.ok, true);
  assert.deepEqual(r.values, [1, 0.1]);
});

test('parse: explicit v slot', () => {
  const r = parseLine({ index: 0, content: '1.5, ,2.5' }, plan('_,v,_', ['sep', 'sep'], 3));
  assert.equal(r.ok, true);
  assert.deepEqual(r.values, [1.5, null, 2.5]);
});

test('parse: empty slot via adjacent commas', () => {
  const r = parseLine({ index: 0, content: '1.5,,2.5' }, plan('_,_,_', ['sep', 'sep'], 3));
  assert.equal(r.ok, true);
  assert.deepEqual(r.values, [1.5, null, 2.5]);
});

test('parse: trailing whitespace tolerated', () => {
  const r = parseLine({ index: 0, content: '1.5,2.5   ' }, plan('_,_', ['sep'], 2));
  assert.equal(r.ok, true);
  assert.deepEqual(r.values, [1.5, 2.5]);
});

test('parse: spaces around comma', () => {
  const r = parseLine({ index: 0, content: '1.5 , 2.5' }, plan('_,_', ['sep'], 2));
  assert.equal(r.ok, true);
  assert.deepEqual(r.values, [1.5, 2.5]);
});

// --- Failure cases ---

test('parse: expected comma, got end of line', () => {
  const r = parseLine({ index: 0, content: '1.5' }, plan('_,_', ['sep'], 2));
  assert.equal(r.ok, false);
  assert.equal(r.diagnostics[0].code, 'EXPECTED_COMMA');
});

test('parse: expected comma, got another number', () => {
  const r = parseLine({ index: 0, content: '1.5 2.5' }, plan('_,_', ['sep'], 2));
  assert.equal(r.ok, false);
  assert.equal(r.diagnostics[0].code, 'EXPECTED_COMMA');
});

test('parse: extra tokens at end', () => {
  const r = parseLine({ index: 0, content: '1.5,2.5,3.5' }, plan('_,_', ['sep'], 2));
  assert.equal(r.ok, false);
  assert.equal(r.diagnostics[0].code, 'EXTRA_TOKENS');
});

test('parse: unexpected number in v slot', () => {
  const r = parseLine({ index: 0, content: '1.5,2.5,3.5' }, plan('_,v,_', ['sep', 'sep'], 3));
  assert.equal(r.ok, false);
  assert.equal(r.diagnostics[0].code, 'UNEXPECTED_NUMBER_IN_V_SLOT');
});

test('parse: fusion with sign rejected', () => {
  const r = parseLine({ index: 0, content: '-1,-5' }, plan('_,_', ['dec'], 1));
  assert.equal(r.ok, false);
  assert.equal(r.diagnostics[0].code, 'FUSION_UNSAFE');
});

test('parse: fusion with exponent rejected', () => {
  const r = parseLine({ index: 0, content: '1e5,2' }, plan('_,_', ['dec'], 1));
  assert.equal(r.ok, false);
  assert.equal(r.diagnostics[0].code, 'FUSION_UNSAFE');
});

test('parse: column count mismatch (defensive)', () => {
  const r = parseLine({ index: 0, content: '1.5,2.5' }, plan('_,_', ['sep'], 5));
  assert.equal(r.ok, false);
  assert.equal(r.diagnostics[0].code, 'COLUMN_COUNT_MISMATCH');
});

test('parse: dec without left value', () => {
  // Comma at start: no pending value.
  const r = parseLine({ index: 0, content: ',1.5' }, plan('_,_', ['dec'], 1));
  assert.equal(r.ok, false);
  assert.ok(['DEC_WITHOUT_LEFT_VALUE', 'UNKNOWN_PATTERN_CHAR'].includes(r.diagnostics[0].code));
});
