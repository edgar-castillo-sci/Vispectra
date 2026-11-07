// compiler/tokenizer.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize } from './tokenizer.js';

test('tokenize: simple number', () => {
  const t = tokenize('42');
  assert.equal(t.length, 1);
  assert.equal(t[0].type, 'number');
  assert.equal(t[0].value, 42);
  assert.equal(t[0].hasDot, false);
});

test('tokenize: decimal number', () => {
  const t = tokenize('3.14');
  assert.equal(t[0].value, 3.14);
  assert.equal(t[0].hasDot, true);
});

test('tokenize: leading dot', () => {
  const t = tokenize('.5');
  assert.equal(t[0].type, 'number');
  assert.equal(t[0].value, 0.5);
  assert.equal(t[0].hasDot, true);
});

test('tokenize: signed with exponent', () => {
  const t = tokenize('-1.5e-3');
  assert.equal(t[0].value, -0.0015);
  assert.equal(t[0].hasDot, true);
});

test('tokenize: incomplete exponent falls back to gap', () => {
  const t = tokenize('1e 5');
  assert.equal(t.length, 3);
  assert.equal(t[0].type, 'number');
  assert.equal(t[0].value, 1);
  assert.equal(t[1].type, 'gap');
  assert.equal(t[1].raw, 'e ');
  assert.equal(t[2].type, 'number');
  assert.equal(t[2].value, 5);
});

test('tokenize: comma tokens', () => {
  const t = tokenize('1,2,3');
  assert.equal(t.length, 5);
  assert.equal(t[1].type, 'comma');
  assert.equal(t[3].type, 'comma');
});

test('tokenize: gap between commas', () => {
  const t = tokenize('1, ,3');
  assert.equal(t.length, 5);
  assert.equal(t[2].type, 'gap');
});
