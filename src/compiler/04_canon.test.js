import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCanon } from './04_canon.js';
import { buildIR } from './03_ir.js';
import { lex } from './02_lexer.js';

function makeIR(structures) {
  return buildIR(structures.map((s, i) => ({ index: i, structure: s })));
}

function makeLines(strings) {
  return strings.map((content, index) => ({ index, content }));
}

test('canon: single n-pattern, not ambiguous', () => {
  const lines = makeLines([
    '350.0,0.523,0.001',
    '351.0,0.510,0.002',
    '352.0,0.498,0.003',
  ]);
  const ir = makeIR(lines.map((l) => lex(l.content).structure));
  const result = buildCanon(ir, lines, { start: 0, end: 3 });
  assert.equal(result.canonLiteral, 'n,n,n');
  assert.equal(result.blocks.length, 1);
  assert.equal(result.blocks[0].pattern, '_,_,_');
  assert.equal(result.blocks[0].hasAmbiguity, false);
  assert.equal(result.blocks[0].instances.length, 3);
});

test('canon: all z with commas is ambiguous', () => {
  const lines = makeLines(['1,0,1', '1,1,0', '0,1,1']);
  const ir = makeIR(lines.map((l) => lex(l.content).structure));
  const result = buildCanon(ir, lines, { start: 0, end: 3 });
  assert.equal(result.canonLiteral, 'z,z,z');
  assert.equal(result.blocks[0].hasAmbiguity, true);
});

test('canon: mixed n and z disambiguates', () => {
  const lines = makeLines(['1.5,2,3', '1,2,3', '1.5,2,3']);
  const ir = makeIR(lines.map((l) => lex(l.content).structure));
  const result = buildCanon(ir, lines, { start: 0, end: 3 });
  assert.equal(result.blocks.length, 1);
  assert.equal(result.blocks[0].hasAmbiguity, false);
});

test('canon: explicit v does not trigger ambiguity', () => {
  const lines = makeLines(['1, ,3', '2, ,4']);
  const ir = makeIR(lines.map((l) => lex(l.content).structure));
  const result = buildCanon(ir, lines, { start: 0, end: 2 });
  assert.equal(result.blocks[0].pattern, '_,v,_');
  assert.equal(result.blocks[0].hasAmbiguity, false);
});

test('canon: body expansion stops at non-matching rows', () => {
  const lines = makeLines([
    '# Header',
    '350.0,0.523',
    '351.0,0.510',
    '352.0,0.498',
    '# Footer',
  ]);
  const ir = makeIR(lines.slice(1, 4).map((l) => lex(l.content).structure));
  const result = buildCanon(ir, lines, { start: 2, end: 3 });
  assert.deepEqual(result.body, { start: 1, end: 4 });
});

test('canon: two patterns, two blocks', () => {
  const lines = makeLines([
    '350.0,0.5',
    '351.0,0.6',
    '1,0,1,0',
    '1,1,0,1',
  ]);
  const ir = makeIR(lines.map((l) => lex(l.content).structure));
  const result = buildCanon(ir, lines, { start: 0, end: 4 });
  assert.equal(result.blocks.length, 2);
  const patterns = result.blocks.map((b) => b.pattern).sort();
  assert.deepEqual(patterns, ['_,_', '_,_,_,_']);
});

test('canon: empty input returns empty canon', () => {
  const lines = makeLines([]);
  const ir = makeIR([]);
  const result = buildCanon(ir, lines, { start: 0, end: 0 });
  assert.equal(result.canonLiteral, '');
  assert.deepEqual(result.blocks, []);
});
