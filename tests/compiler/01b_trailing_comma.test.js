// compiler/01b_trailing_comma.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectTrailingCommaPolicy } from '../../src/compiler/01b_trailing_comma.js';

function makeLines(contents) {
  return contents.map((content, i) => ({ index: i, content }));
}

const whole = (lines) => ({ start: 0, end: lines.length });

test('01b: no trailing commas → policy none, same reference', () => {
  const lines = makeLines(['1,2,3', '4,5,6', '7,8,9']);
  const r = detectTrailingCommaPolicy(lines, whole(lines));
  assert.equal(r.policy, 'none');
  assert.equal(r.lines, lines); // same reference (no copy)
});

test('01b: all trailing commas → policy preserve, same reference', () => {
  const lines = makeLines(['1,2,3,', '4,5,6,', '7,8,9,']);
  const r = detectTrailingCommaPolicy(lines, whole(lines));
  assert.equal(r.policy, 'preserve');
  assert.equal(r.lines, lines);
});

test('01b: mixed → policy trim, trailing commas stripped', () => {
  const lines = makeLines(['1,2,3,', '4,5,6', '7,8,9,']);
  const r = detectTrailingCommaPolicy(lines, whole(lines));
  assert.equal(r.policy, 'trim');
  assert.notEqual(r.lines, lines); // new array
  assert.equal(r.lines[0].content, '1,2,3');
  assert.equal(r.lines[1].content, '4,5,6');
  assert.equal(r.lines[2].content, '7,8,9');
  // index preserved
  assert.equal(r.lines[0].index, 0);
  assert.equal(r.lines[2].index, 2);
});

test('01b: trim does not mutate input lines', () => {
  const lines = makeLines(['1,2,3,', '4,5,6', '7,8,9,']);
  const snapshot = lines.map((l) => ({ ...l }));
  detectTrailingCommaPolicy(lines, whole(lines));
  assert.deepEqual(lines, snapshot);
});

test('01b: trim strips whitespace after the trailing comma', () => {
  const lines = makeLines(['1,2,3,   ', '4,5,6', '7,8,9,\t']);
  const r = detectTrailingCommaPolicy(lines, whole(lines));
  assert.equal(r.policy, 'trim');
  assert.equal(r.lines[0].content, '1,2,3');
  assert.equal(r.lines[2].content, '7,8,9');
});

test('01b: whitespace without comma is not trailing', () => {
  const lines = makeLines(['1,2,3   ', '4,5,6', '7,8,9\t']);
  const r = detectTrailingCommaPolicy(lines, whole(lines));
  assert.equal(r.policy, 'none');
});

test('01b: empty lines are ignored for the policy', () => {
  // Empty lines don't count as withoutTrailing, so this stays preserve
  const lines = makeLines(['1,2,3,', '', '4,5,6,', '   ', '7,8,9,']);
  const r = detectTrailingCommaPolicy(lines, whole(lines));
  assert.equal(r.policy, 'preserve');
});

test('01b: only centralBlock lines affect the policy', () => {
  // Preamble and residue end with comma, but central block does not
  const lines = makeLines(['HEADER,', '1,2,3', '4,5,6', 'RESIDUE,']);
  const r = detectTrailingCommaPolicy(lines, { start: 1, end: 3 });
  assert.equal(r.policy, 'none');
  assert.equal(r.lines, lines); // same reference, no copy
});

test('01b: trim normalizes all lines, including those outside the block', () => {
  // When policy is trim, the map applies to the entire array
  const lines = makeLines(['HEADER,', '1,2,3,', '4,5,6', 'RESIDUE,']);
  const r = detectTrailingCommaPolicy(lines, { start: 1, end: 3 });
  assert.equal(r.policy, 'trim');
  assert.equal(r.lines[0].content, 'HEADER'); // outside block, still stripped
  assert.equal(r.lines[1].content, '1,2,3');
  assert.equal(r.lines[2].content, '4,5,6');
  assert.equal(r.lines[3].content, 'RESIDUE'); // outside block, still stripped
});

test('01b: diagnostic emitted with policy and counts', () => {
  const lines = makeLines(['1,2,3,', '4,5,6', '7,8,9,', '']);
  const r = detectTrailingCommaPolicy(lines, whole(lines));
  assert.equal(r.diagnostics.length, 1);
  assert.equal(r.diagnostics[0].code, 'TRAILING_COMMA_POLICY');
  assert.equal(r.diagnostics[0].severity, 'info');
  assert.equal(r.diagnostics[0].params.policy, 'trim');
  assert.equal(r.diagnostics[0].params.withTrailing, 2);
  assert.equal(r.diagnostics[0].params.withoutTrailing, 1);
  assert.equal(r.diagnostics[0].params.empty, 1);
});
