// ============================================================
// CITATION — single source of truth for the UI
// ============================================================
// These values drive the badge row and the citation modal in the
// browser UI. They MUST stay in sync with:
//   - CITATION.cff  (source of truth for GitHub / Zenodo)
//   - package.json  (source of truth for npm)
//
// tests/citation.test.js enforces the sync: if any of these drift,
// `npm test` fails with a clear message telling you which field and
// which file to update.
//
// When bumping the version for a new release, update the version
// and DOI fields here AND in CITATION.cff AND in package.json.
// The test will catch whichever one you forget.
// ============================================================

export const CITATION = {
  author: 'Castillo, Edgar',
  orcid: '0009-0006-4268-3323',
  github: 'edgar-castillo-sci/Vispectra',
  version: 'v0.1.1-alpha',
  year: 2026,
  dateReleased: '2026-11-12',
  license: 'AGPL-3.0',
  zenodoVersion: '10.5281/zenodo.24153400',
  zenodoConceptual: '10.5281/zenodo.23177822',
};
