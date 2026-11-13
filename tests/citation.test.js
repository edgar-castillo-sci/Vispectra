// citation.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseYAML } from '../src/services/yaml.js';
import { CITATION } from '../src/citation.js';

const cff = parseYAML(readFileSync(new URL('../CITATION.cff', import.meta.url), 'utf8'));
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('citation: version matches CITATION.cff', () => {
  assert.equal(
    CITATION.version,
    cff.version,
    `src/citation.js says "${CITATION.version}" but CITATION.cff says "${cff.version}". Update both.`
  );
});

test('citation: version matches package.json', () => {
  // package.json omits the "v" prefix (npm convention)
  const expected = CITATION.version.replace(/^v/, '');
  assert.equal(
    pkg.version,
    expected,
    `src/citation.js says "${CITATION.version}" but package.json says "${pkg.version}". Update both.`
  );
});

test('citation: version DOI matches CITATION.cff', () => {
  assert.equal(
    CITATION.zenodoVersion,
    cff.doi,
    `src/citation.js says "${CITATION.zenodoVersion}" but CITATION.cff says "${cff.doi}". Update both.`
  );
});

test('citation: conceptual DOI matches CITATION.cff identifiers', () => {
  const conceptual = cff.identifiers.find((i) => i.type === 'doi' && i.value !== cff.doi);
  assert.ok(conceptual, 'CITATION.cff is missing a conceptual DOI under identifiers');
  assert.equal(
    CITATION.zenodoConceptual,
    conceptual.value,
    `src/citation.js says "${CITATION.zenodoConceptual}" but CITATION.cff says "${conceptual.value}". Update both.`
  );
});

test('citation: author matches CITATION.cff', () => {
  const a = cff.authors[0];
  const constructed = `${a['family-names']}, ${a['given-names']}`;
  assert.equal(
    CITATION.author,
    constructed,
    `src/citation.js says "${CITATION.author}" but CITATION.cff says "${constructed}".`
  );
});

test('citation: ORCID matches CITATION.cff', () => {
  const a = cff.authors[0];
  // CITATION.cff uses the full URL, citation.js uses the bare ID
  const normalized = a.orcid.replace(/^https?:\/\/orcid\.org\//, '');
  assert.equal(
    CITATION.orcid,
    normalized,
    `src/citation.js says "${CITATION.orcid}" but CITATION.cff says "${normalized}".`
  );
});

test('citation: dateReleased matches CITATION.cff', () => {
  assert.equal(
    CITATION.dateReleased,
    cff['date-released'],
    `src/citation.js says "${CITATION.dateReleased}" but CITATION.cff says "${cff['date-released']}".`
  );
});

test('citation: license matches CITATION.cff', () => {
  assert.equal(
    CITATION.license,
    cff.license,
    `src/citation.js says "${CITATION.license}" but CITATION.cff says "${cff.license}".`
  );
});
