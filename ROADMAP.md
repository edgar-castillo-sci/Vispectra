# Vispectra Roadmap

## Vision

To turn Vispectra into a reference compiler for spectroscopic file formats: a local, cross-platform tool that reads messy files from any technique and converts them into clean columns, without relying on servers or external services.

The compiler core is technique-agnostic. UV-Vis is just the first implementation, not the limit of the project.

## Current Status

Last updated: 2026-10-06.

- **Implemented**: phases 00 (reading), 02 (lexer), 09 (diagnostics), orchestrator (`main.js`), complete specification (R1–R95), documented architecture.
- **In development**: phase 01 (sampling), phases 03–08 of the compiler.
- **Not operational**: Vispectra does not parse files yet.

## How to read this roadmap

This roadmap is organized by **thematic areas**, not linear versions. Each area groups a related set of work and has its own checklist.

The author can work on multiple areas in parallel depending on motivation or need. There is no strict order between areas. Dependencies are explicitly indicated where they exist: for example, editorial visualization assumes that basic visualization works.

**Public releases** (`v0.1`, `v0.2`, ...) are published when a coherent set of features is ready, even if other areas are still in exploration. They do not mark internal development phases; they mark GitHub releases and Zenodo archives.

Effort sizes are indicative:

- **Small**: days of work.
- **Medium**: weeks of work.
- **Large**: months of work.

There are no dates. Milestones are completed when they are ready.

## Work Areas

### Area 1 — Compiler Core
**Effort: large**

The goal is for the pipeline to work end-to-end with simple UV-Vis files, and to handle messy files.

**Basic pipeline:**
- [x] Phase 00 — reading and normalization
- [ ] Phase 01 — random sampling of the central block
- [x] Phase 02 — lexer (point and comma classification)
- [ ] Phase 03 — IR (intermediate representation)
- [ ] Phase 04 — canon (inference + center-out expansion)
- [ ] Phase 05 — fixation (parity, `c,c,c` conversion)
- [ ] Phase 06 — master parser (line interpretation)
- [ ] Phase 07 — semantics (verification)
- [ ] Phase 08 — codegen (clean columns)
- [x] Phase 09 — diagnostics accumulator
- [x] Orchestrator (`main.js`)

**Robustness:**
- [ ] Support for preamble and residue (delimited data body)
- [ ] Support for comma runs with `i` as anchor
- [ ] Support for empty slots
- [ ] Complete diagnostics (codes R60–R69)

**Validation:**
- [ ] Full pipeline tests
- [ ] Tests with cases: pure American, pure European, mixed, run, empty slot
- [ ] First UV-Vis file successfully parsed
- [ ] Documentation of edge cases in `docs/examples.md`

**Area closure criteria**: the parser handles the five documented test cases without manual intervention, using real UV-Vis files.

### Area 2 — UI and Visualization
**Effort: large**

The goal is for the user to interact with Vispectra without touching the console, view their spectra, and export them.

**Minimal UI:**
- [ ] Functional drop zone
- [ ] Multiple file processing
- [ ] Results panel: detected columns, canon, diagnostics
- [ ] Visible error handling for the user

**Basic visualization** *(depends on minimal UI)*:
- [ ] Functional `plot.js` with Canvas or SVG
- [ ] Axes labeled with generic names (`column 0`, `column 1`)
- [ ] Basic zoom and pan
- [ ] PNG export (screen resolution)

**Hybrid UI** *(depends on basic visualization)*:
- [ ] Detection of more than 2 columns
- [ ] Role assignment modal (wavelength, absorbance, etc.)
- [ ] Basic operations: normalization, smoothing
- [ ] Strict / permissive mode for diagnostics

**Editorial visualization** *(depends on hybrid UI; effort: large)*:
- [ ] Configurable typography and colors
- [ ] SVG and vector PDF export
- [ ] Annotations (peaks, labels, regions)
- [ ] Multiple overlaid spectra
- [ ] Style templates (paper, presentation, thesis)

**Area closure criteria**: an exported plot is acceptable for a scientific publication without external retouching, and the user can assign roles to columns from the interface.

### Area 3 — Technique-Specific
**Effort: large**

The goal is for UV-Vis to be completely polished, and then to extend the compiler to other techniques without rewriting the core.

**UV-Vis polished:**
- [ ] UV-Vis validation ranges (190–1100 nm, absorbance 0–4)
- [ ] Typical operations: baseline, smoothing, peak detection
- [ ] Clean CSV export
- [ ] Validation with real instrument files (different brands)
- [ ] Documentation of UV-Vis specific limitations

**Multi-technique** *(depends on polished UV-Vis; effort: large)*:
- [ ] Technique configuration layer
- [ ] XRD: specific ranges (2θ, intensity)
- [ ] Raman: specific ranges (wavenumber, intensity)
- [ ] IR: specific ranges
- [ ] XPS: specific ranges (binding energy)

**Area closure criteria**: Vispectra handles UV-Vis completely and reliably, and at least two different techniques are parsed and visualized with the same architecture.

### Area 4 — Infrastructure
**Effort: medium**

The goal is for Vispectra to be usable by third parties, citable, and documented.

**Internationalization:**
- [ ] Complete `locales/en.js` (all diagnostic codes)
- [ ] Complete `locales/es.js`
- [ ] Automatic browser language detection
- [ ] Manual language selector in the UI

**API and export:**
- [ ] Documented public API
- [ ] Export to standard formats (clean CSV, JSON)

**Documentation:**
- [ ] Complete documentation for end users
- [x] `docs/origen.md` (design history)
- [ ] Regression tests

**Publication:**
- [x] First GitHub release (`v0.1.0-alpha`)
- [x] Zenodo DOI (`10.5281/zenodo.23177822`)
- [ ] Conceptual DOI updated in README and `package.json`
- [ ] Stable version `v1.0.0` published in Zenodo without embargo

**Area closure criteria**: Vispectra is usable by third parties without the author's assistance, with complete documentation and a citable DOI.

## Public Releases

Versions are published when a coherent set of features is ready. Numbering follows [SemVer](https://semver.org/).

Planned releases:

| Version | Minimum Content | Areas Involved |
| --- | --- | --- |
| `v0.1.0` | Complete pipeline, simple UV-Vis parsed | Area 1 (partial) |
| `v0.2.0` | Parser robustness, messy cases | Area 1 (complete) |
| `v0.3.0` | Minimal UI, Spanish i18n | Area 2 (partial), Area 4 (partial) |
| `v0.4.0` | Basic visualization | Area 2 (partial) |
| `v0.5.0` | Hybrid UI | Area 2 (partial) |
| `v0.6.0` | Polished UV-Vis | Area 3 (partial) |
| `v0.7.0` | Complete i18n | Area 4 (partial) |
| `v1.0.0` | Stable UV-Vis, public API, DOI | All areas |
| `v2.0.0` | Editorial visualization | Area 2 (complete) |
| `v3.0.0` | Multi-technique | Area 3 (complete) |

Releases are **snapshots in time**, not development phases. A release can be published even if some areas are still in exploration.

## Out of scope (for now)

- Thousands separator notation (`1,234.56`).
- Literal missing values (`NaN`, `---`, `>3.0`).
- Rows split across multiple lines.
- Units attached to numbers (`250nm`).
- Comments at the end of lines.
- Processing of massive datasets (>1M points).
- Desktop version with native processing.

These points can be added in later versions if demand justifies it. They are not discarded.

## Publication and DOI

The Zenodo DOI is not a milestone, but a procedure performed at the first GitHub release (`v0.1.0`). Once obtained:

- The "How to cite" section is added to `README.md`.
- The `package.json` is updated with the DOI.
- It is documented in `docs/origen.md`.

The Zenodo conceptual DOI will always point to the latest published version. Specific version DOIs are generated with each release.

## How to follow progress

- **GitHub Issues**: each item in the areas is broken down into issues.
- **GitHub Milestones**: each release has its associated milestone.
- **Releases**: each version is published as a tagged release.
- **Zenodo**: each release is automatically archived via GitHub integration, generating a version DOI.

## Notes on scope

Vispectra is a single-author project in active development. Milestones have no assigned dates. The priority is the quality of the compiler, not the speed of delivery.

The author can work on multiple areas in parallel. The roadmap only describes where the project is heading.
