# Vispectra Roadmap

## Vision

To turn Vispectra into a reference compiler for spectroscopic file formats:
a local, cross-platform tool that reads messy files from any technique and
converts them into clean columns, without relying on servers or external
services.

The compiler core is technique-agnostic. UV-Vis is the first implementation,
not the limit of the project.

## Current Status

Last updated: 2026-11-12.

- **Current release:** `v0.1.1-alpha` (2026-11-11).
- **Compiler:** stable (phases 00-09, including 01b). Handles American,
  European, mixed-notation, sparse, and wide-format files with automatic
  garbage filtering and empty-column exclusion.
- **Visualization engine:** publication-ready. Hybrid SVG/Canvas,
  MinMaxLTTB downsampling, binary-search zoom isolation, full styling
  (frame, ticks, grid, legend frame, Computer Modern, super-exponent),
  per-axis invert, per-series width control.
- **Configuration:** YAML v2, round-trip faithful for the entire visual
  state (columns, frame, axes, graph, series, view).
- **Tests:** 112 passing (`npm test`), covering compiler phases, services,
  and orchestrator integration.
- **Fixtures:** 5 real-world UV-Vis files in `examples/`, including a
  Cary 60 export with mixed notation that drove the recent R107/R16/R109
  fixes.
- **Documentation:** English + Spanish READMEs, `docs/architecture.md`,
  `docs/rules.md` (R1-R109), `docs/examples.md`, `docs/processing_rules.md`,
  `docs/origen.md`, `CHANGELOG.md`.

**Not yet started:** scientific pipeline (smoothing, baseline, peak
detection), calibration, batch processing, multi-technique validation.

## How to read this roadmap

Organized by **thematic areas**, not linear versions. Each area groups a
related set of work and has its own checklist.

Work can proceed in parallel across areas. Dependencies are explicit where
they exist: for example, calibration assumes the scientific pipeline works.

**Public releases** (`v0.1`, `v0.2`, ...) are published when a coherent set
of features is ready, even if other areas are still in exploration. They do
not mark internal development phases; they mark GitHub Releases and Zenodo
archives.

Effort sizes are indicative:

- **Small**: days of work.
- **Medium**: weeks of work.
- **Large**: months of work.

There are no dates. Milestones are completed when they are ready.

## Work Areas

### Area 1 - Compiler Core
**Effort: large (mostly done)**

**Pipeline:**
- [x] Phase 00 - reading and normalization
- [x] Phase 01 - random sampling of the central block
- [x] Phase 01b - trailing comma policy (preserve / trim / none)
- [x] Phase 02 - lexer (point, comma, hard separator)
- [x] Phase 03 - IR (intermediate representation)
- [x] Phase 04 - canon (inference + center-out expansion)
- [x] Phase 04b - disambiguation (R107, R98, MAX_COMMAS)
- [x] Phase 04c - abstract canon (n/z/i/v per column)
- [x] Phase 05 - fixation (executable plan per block)
- [x] Phase 06 - master parser (plan-driven, R16 fusion)
- [x] Phase 07 - semantics (verification)
- [x] Phase 08 - codegen (clean columns, null-preserving)
- [x] Phase 09 - diagnostics accumulator
- [x] Orchestrator (`main.js`) with R109 dominant-block tiebreaker

**Robustness:**
- [x] Support for preamble and residue (delimited data body)
- [x] Support for comma runs
- [x] Support for empty slots
- [x] Hard separators (`|`) distinguish commas from semicolons/spaces
- [x] Mixed notation within a single row (european + scientific)
- [x] R107 (hard separator forces decimal commas)
- [x] R16 (`Number(...)` fusion, accepts sign/exponent)
- [x] R109 (deterministic dominant block with row/col tiebreaker)

**Validation:**
- [x] Full pipeline tests (112 assertions)
- [x] Five real UV-Vis fixtures (Cary 60, CNNi, L1Ref, FORTH, curvedata)
- [ ] Unit tests for `01b_trailing_comma.js` (three policies:
      preserve / trim / none). Currently exercised indirectly via CNNi.csv.
- [ ] Documented edge cases in `docs/examples.md` (7 cases done;
      more as real-world files expose them).

**Area closure criteria:** `01b` test coverage. The rest is complete.

### Area 2 - UI and Visualization
**Effort: large (mostly done)**

**Minimal UI:**
- [x] Functional drop zone (drag and drop)
- [x] Multiple file handling (single file at a time; queue for batch
      is Area 3)
- [x] Results panel: detected columns, canon, diagnostics
- [x] Visible error handling for the user

**Visualization:**
- [x] Hybrid SVG/Canvas renderer
- [x] Axes labeled with column names (inline editable)
- [x] Zoom (box), pan (via range panel), crosshair, pin
- [x] PNG / JPEG / PDF / SVG export (vector output on massive files)
- [x] Log10 scales per axis
- [x] Tick modes (Auto / Count / Step / Nice), minor ticks
- [x] Per-axis invert (no `flip`)
- [x] Frame presets (7 layouts + custom), 3 resize modes
- [x] Legend: 6 positions, 3 frame styles, live values on hover, freeze on pin
- [x] Publication-grade styling: Computer Modern font, super-exponent
      rendering, tick direction, mirror ticks, grid modes
- [x] Per-series width with master slider and "Lock all" toggle
- [x] MinMaxLTTB downsampling, binary-search zoom isolation

**Configuration:**
- [x] YAML v2: full visual state round-trip (columns, frame, axes, graph,
      series, view)
- [x] Save / Load / Apply workflow
- [x] Pure-reader services layer (`services/config.js`)

**Area closure criteria:** done. Next visualization work belongs to Area 3
(annotations, multi-spectrum overlays, publication templates) or Area 4
(export formats).

### Area 3 - Scientific Pipeline
**Effort: large**

The scientific pipeline is the next major phase. It consumes YAML
configuration to apply mathematical operations to the extracted columns.
Operations are pure functions in `src/processor.js` (per
`docs/processing_rules.md`).

**Core operations (v0.2.0):**
- [ ] Savitzky-Golay smoothing (currently only Gaussian)
- [ ] Baseline correction: interactive anchors (click on plot)
- [ ] Peak detection with prominence
- [ ] Derivative (1st, 2nd)
- [ ] Normalization: min-max, max-peak, area, vector
- [ ] Pipeline configuration in YAML (extend the current schema with a
      `pipeline:` block)

**Calibration (v0.3.0):**
- [ ] Linear, quadratic, and linear-through-zero fits
- [ ] LOD, LOQ, residuals, standard errors per sample
- [ ] No automatic decisions: Vispectra computes and reports; the user
      decides what the data means

**Batch processing (v0.3.0):**
- [ ] Drop a folder + a `.yaml` config
- [ ] Compile every file, apply the same treatment, unified export
- [ ] Progress reporting for large batches

**Area closure criteria:** a researcher can load a spectrum, apply smoothing
+ baseline + peak detection, and export the processed data with a
reproducible YAML config, without touching code.

### Area 4 - Technique-Specific
**Effort: large**

UV-Vis is polished. Other techniques extend the compiler without rewriting
the core.

**UV-Vis polished:**
- [ ] UV-Vis validation ranges (190-1100 nm, absorbance 0-4)
- [ ] Typical operations: baseline, smoothing, peak detection
- [ ] Validation with real instrument files from different brands
- [ ] Documentation of UV-Vis-specific limitations

**Multi-technique:**
- [ ] Technique configuration layer (per-technique ranges, labels, defaults)
- [ ] XRD: specific ranges (2θ, intensity)
- [ ] Raman: specific ranges (wavenumber, intensity)
- [ ] IR: specific ranges
- [ ] XPS: specific ranges (binding energy)

**Area closure criteria:** Vispectra handles UV-Vis completely and reliably,
and at least two other techniques are parsed and visualized with the same
architecture.

### Area 5 - Infrastructure
**Effort: medium**

**Internationalization:**
- [x] `locales/en.js` and `locales/es.js`
- [x] Language switcher in the UI
- [ ] Complete diagnostic code coverage (R60-R109 codes exposed as i18n keys)
- [ ] Automatic browser language detection

**API and export:**
- [ ] Documented public API (`compile`, `drawPlot`, `applyPipeline`)
- [ ] Export to JSON (in addition to CSV)
- [ ] Programmatic usage from Node (currently browser-only)

**Documentation:**
- [x] `README.md` (English)
- [x] `README.es.md` (Spanish)
- [x] `CHANGELOG.md`
- [x] `docs/architecture.md`
- [x] `docs/rules.md` (R1-R109)
- [x] `docs/examples.md` (7 worked cases)
- [x] `docs/processing_rules.md` (planned pipeline spec)
- [x] `docs/origen.md` (design history, in Spanish)
- [x] `ROADMAP.md` (this file)
- [ ] Regression tests for the browser UI (currently only compiler/services
      are tested)

**Publication:**
- [x] First GitHub release (`v0.1.0-alpha`, 2026-11-09)
- [x] Second GitHub release (`v0.1.1-alpha`, 2026-11-11)
- [x] Zenodo conceptual DOI (`10.5281/zenodo.23177822`)
- [ ] GitHub Release for `v0.1.1-alpha` (dispatches Zenodo webhook,
      generates version-specific DOI)
- [ ] Update Zenodo description to reflect the parser being operational
      (currently says "does not yet parse files")
- [ ] Stable version `v1.0.0` published in Zenodo without embargo

**Area closure criteria:** Vispectra is usable by third parties without the
author's assistance, with complete documentation and a citable DOI per
release.

## Public Releases

Versions are published when a coherent set of features is ready. Numbering
follows [SemVer](https://semver.org/).

| Version | Minimum Content | Status |
| --- | --- | --- |
| `v0.1.0-alpha` | Complete pipeline, simple UV-Vis parsed | **Released** 2026-11-09 |
| `v0.1.1-alpha` | Parser robustness (R107, R16, R109), bilingüe README | **Released** 2026-11-11 |
| `v0.2.0-alpha` | Scientific pipeline: Savitzky-Golay, interactive baseline, peak detection, YAML `pipeline:` block | planned |
| `v0.3.0-alpha` | Calibration (fits, LOD/LOQ), batch processing | planned |
| `v0.4.0-alpha` | Multi-technique validation (XRD, Raman, IR, XPS) | planned |
| `v1.0.0` | Stable, public API, full docs, DOI per release | planned |

Releases are **snapshots in time**, not development phases. A release can
be published even if some areas are still in exploration.

## Out of scope (for now)

- Thousands separator notation (`1,234.56`).
- Literal missing values (`NaN`, `---`, `>3.0`).
- Rows split across multiple lines.
- Units attached to numbers (`250nm`).
- Comments at the end of lines.
- Processing of massive datasets (>1M points per series).
- Desktop version with native processing.
- Mobile app.

These points can be added in later versions if demand justifies it. They
are not discarded.

## Publication and DOI

Each release is archived on Zenodo via GitHub integration. The conceptual
DOI (`10.5281/zenodo.23177822`) always points to the latest archived
version. Specific version DOIs are generated per release.

The `.zenodo.json` at the repository root controls the metadata Zenodo
attaches to each archived snapshot: title, description, creators, ORCID,
license, keywords. **It must be updated before each release**; otherwise
the DOI ships with stale metadata from the previous version.

## How to follow progress

- **GitHub Issues**: each item in the areas is broken down into issues.
- **GitHub Milestones**: each release has its associated milestone.
- **Releases**: each version is published as a tagged release.
- **Zenodo**: each release is archived automatically via GitHub integration,
  generating a version DOI.
- **CHANGELOG.md**: every release has a section documenting what changed.

## Notes on scope

Vispectra is a single-author project in active development. Milestones have
no assigned dates. The priority is the quality of the compiler, not the
speed of delivery.

The author can work on multiple areas in parallel. The roadmap describes
where the project is heading, not the order in which it will get there.

## Acknowledgments

Vispectra grew out of the LMAERPS laboratory context at DACB-UJAT, where
the practical pain of reading spectroscopic files became impossible to
ignore. The idea of a phone-first plotter was originally proposed by
Javier. See [`docs/origen.md`](docs/origen.md) for the full origin story.
