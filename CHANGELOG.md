# Changelog

All notable changes to Vispectra will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1-alpha] - 2026-11-11

Focus: parser robustness (trailing commas, mixed notation, hard separators),
plus a publication-grade styling pass (font, frame, ticks, grid, legend frame,
super-exponent) and per-series width control. Three fixes dominate this
release: R107 (hard separators force decimal commas), R16 (fusion accepts
any finite numeric concatenation), and R109 (dominant block uses an explicit
tiebreaker).

### Added

**Parser**
- Phase 01b (trailing comma policy): detects file-level trailing-comma
  behavior on the central block and normalizes lines (preserve / trim / none).
- Disambiguation cap: `MAX_COMMAS = 20` prevents 2^k enumeration blowup
  (emits `TOO_MANY_COMMAS` warning, falls back to all-sep).

**Role panel**
- Heuristic X selection: skips sequential integer columns (No. = 1,2,3) and
  picks the first monotonic numeric column (Wavelength, etc.).
- Empty columns: `(empty)` badge, reduced opacity, checkbox disabled, no
  color/style pickers, excluded from `yIndices` (not drawn, not in legend).
- "Show empty columns" toggle: hides empty rows via CSS, no re-render.
- "Lock styles" toggle: preserves manual color/style across selection
  changes; disabling it recompacts immediately.
- Auto-compaction of colors/styles across active non-empty Y series (no
  gaps from discarded or empty columns).

**Per-series width**
- Master width slider with per-series override.
- "Lock all" toggle (`seriesWidthLocked`, default `true`): master slider
  drives all active series.
- Swatch SVG per series (mini legend item) — click to expand a color /
  style / width panel.

**Legend**
- Shown by default.
- Live values on hover: legend labels replaced by the value at the crosshair.
- Freeze on pin (click): values stay visible while the mouse moves;
  unpin/leave/reset restore base labels.
- Floating `X = ...` tooltip over the plot, follows the mouse, hides on leave.

**Style / Appearance (publication-grade)**
- New `src/ui/appearancePanel.js` module (extracted from inline; all
  controls now exposed in the GUI).
- Font family: Computer Modern (KaTeX webfont, SIL OFL), Times, system sans.
- Frame: full box (4-side, LaTeX-style), on by default.
- Tick direction: `in` / `out` / `inout`.
- Mirror ticks on top + right.
- Grid: `none` / `major` / `both` (minor only when `both`).
- Legend frame: `none` / `thin` / `default`.
- Super-exponent rendering: `1.5e-3` → `1.5×10⁻³` via `<tspan>`; log ticks
  as `10⁻²`, `10⁻¹`, `1`, `10`.

**Axis**
- Per-axis `invert` (reverses visual direction of ticks + data together).
  Replaces the old `flip`, which is retired.

**Config (YAML v2)**
- Full visual state now round-trip faithful: `columns.x`, `columns.discard`,
  `columns.selected_y` (`null` | `'all'` | `'first'` | `[indices]`),
  `series_locked`, `axis.*.invert`, `seriesWidthLocked`, `masterWidth`.
- `onSeriesToggle` writes the current active Y indices into
  `columnConfig.selectedY` so the save reflects the actual selection.

**Examples**
- Five real-world UV-Vis fixtures added to `examples/`:
  `cary60_pvdf_hfp_40pctgo_2025-05-13.csv` (renamed from the raw
  instrument name for URL-friendliness), `CNNi.csv`,
  `26032024_Characterisation_UV_T2.3_FORTH.csv`,
  `curvedata_opticaldensity.csv`, and `L1Ref.txt`.
  The Cary 60 file drove the R107/R16 fixes; CNNi drove the
  empty-column preservation fix and the 01b trailing-comma policy.

**Tests**
- Unit tests moved from `src/` to a mirror-structured `tests/`
  directory (`tests/compiler/`, `tests/services/`, `tests/main.test.js`).
  `node --test` recursively discovers `*.test.js` from CWD, so no
  `package.json` change is required.
- Five unit tests for the `services/config.js` refactor: purity of
  `stateToConfig` and `configToStatePatch`, scalar round-trip, sanitizer
  rejects invalid fields, YAML round-trip.

### Changed

**Interaction**
- Floating zoom toolbar removed (redundant with the range panel).
- `mousedown` / `mouseup` simplified to a single drag path (always box zoom).
- Pan via drag retired; use the range panel Δ inputs instead.
- Hover works in all tools (zoom, crosshair); suppressed during drag.
- Crosshair, sidebar values, legend values, and X tooltip all freeze
  together on pin (single source of truth: `state.isPinned`,
  `state.pinnedX`).

**Parser**
- `02_lexer`: trailing `,` preserved as a structural char (was trimmed);
  trailing `|` still trimmed (decorative in instrument exports).
- `04_canon` `patternOf` appends `_` when the structure ends in `,` or `|`
  so the pattern slot count matches `applyResolution`.
- `04b` `countColumns` / `04c` `applyResolution`: count one extra empty slot
  when the structure ends with a sep-comma or `|`.
- R16 reformulated: a `dec` fusion is valid iff `Number(left + '.' + right)`
  returns a finite number. Previously required both operands to be
  `/^\d+$/`, rejecting any fusion with a sign or an exponent. Now `-9,58E-06`
  (european scientific notation with sign) parses correctly. `Number` is
  strict (rejects `-1.-5`, `1e5.2`, `1.2.5`, `1.+2`), so syntactic
  violations still surface as `NaN`. `parseFloat` is deliberately not used:
  it would silently truncate `-1.-5` to `-1`.

**Disambiguation**
- R98 honored: if any structure contains a dot-decimal (`n`), commas can
  only be separators; skip enumeration and use all-sep.
- R107 fixed: the hard-separator check now runs **before** the R98 hasN
  heuristic. Previously R107 was unreachable for any file mixing hard
  separators with dot-decimal values, so every european cell split into
  two columns. The allDec resolution is now validated against every
  structure in the block; if it does not compose (e.g. `z,|,z` where the
  comma is adjacent to a hard separator), the block is discarded as
  garbage (commas are mandated to be decimal but do not fit).

**Services**
- `services/config.js` no longer imports the `state` singleton. New pure
  readers (`stateToConfig`, `configToStatePatch`, `exportStateToYAML`,
  `importYAMLToPatch`) replace the previous state-coupled functions.
  A new `applyConfigPatch(patch)` in `plot/state.js` merges the sanitized
  patch and resets view history when `viewLimits` is present. The
  `services/` layer now matches its documented contract ("pure logic the
  UI consumes").

**Orchestrator**
- R109 dominant-block selection now uses an explicit tiebreaker:
  prefer the block with the most rows; on ties, prefer the wider block.
  Previously the last-iterated block won, which silently disabled the
  garbage filter whenever two blocks tied on row count. This also guards
  against a wide-but-short metadata header stealing dominance from a
  narrow-but-real data block.

### Fixed

- CNNi.csv: 24 columns preserved (was 13 after over-aggressive dedup); empty
  `Abs10`–`Abs20` and `Remark` clearly marked in the UI.
- CNNi.csv trailing-comma case: 24 columns (last one empty), 601 rows, 0
  failed rows.
- Cary 60 UV-Vis export: 36 columns (was 72 spurious columns with 46
  duplicates). The hard-separator fix in `04b` splits `800,010376` once
  instead of twice.
- Parser: `-9,58E-06`, `-1,33E-04`, and other sign+exponent fusions no
  longer rejected as `FUSION_UNSAFE`. The Cary 60 fixture went from many
  failed rows to zero.
- Orchestrator: R109 was silently disabled when two blocks tied on row
  count, mixing both blocks with null-padding instead of discarding the
  smaller one. Now deterministic regardless of iteration order.
- `src/plot/state.js`: removed a stray ESC (0x1B) character that leaked
  into the `masterWidth` line and broke browser parsing.
- Role panel: DOM pickers stayed stale after recompact (Select All / toggle)
  — `refreshRolePanelFromState()` now syncs without a full rebuild.
- Config: `state.columnConfig.selectedY` was never updated on checkbox
  change, so `stateToConfig` serialized it as `null` (auto). Now synced.
- Config: `configToState` ignored the array-form `selected_y`. Now accepts
  `null` | `'all'` | `'first'` | `[indices]`.
- Config: initial series config overwrote YAML-provided colors when
  `seriesConfigLocked` was `false`. Now only fills missing fields.
- State: removed accidental duplicate `seriesConfigLocked` key (copy-paste).

### Removed

- `state.zoomControlsHidden` (kept for forward-compat but unused; the
  floating toolbar and its CSS are gone).
- `src/plot/controls.js` (was the floating toolbar orchestrator).
- `axis.flip` (retired in favor of `axis.invert`).

### Known Limitations

Same as `v0.1.0-alpha` (see below), plus:
- Per-series width and master width are serialized under `graph:` in YAML
  rather than a dedicated `series:` block. Works, but a `v0.3.0` schema
  cleanup will likely move them.
- `src/compiler/01b_trailing_comma.js` has no unit tests. The three
  documented policies (`preserve` / `trim` / `none`) are exercised
  indirectly via integration tests (CNNi.csv), but direct coverage is
  pending.

### Planned for v0.2.0

Unchanged from `v0.1.0-alpha` (Savitzky-Golay smoothing, peak detection,
interactive baseline anchors, pipeline configuration in YAML).

## [0.1.0-alpha] - 2026-11-09

First public release.

### Added

**Compiler (Phases 00-09)**
- Grammar inference from positive presentations with literal + abstract canon model.
- Hard separator detection (`|`) distinguishes commas from semicolons/spaces.
- Automatic garbage filtering (metadata headers, preamble, residue).
- Null-preserving column padding for sparse files.
- Interactive disambiguation modal for ambiguous comma runs.
- Duplicate column collapsing with user confirmation.

**Visualization Engine (`src/plot/`)**
- Modular architecture: state, axes, renderer, interaction, controls, downsampler.
- Hybrid SVG/Canvas rendering: SVG for axes/legend/text, Canvas for dense data.
- Linear and Log10 scales for both axes.
- Tick generation modes: Auto (nice numbers), Fixed Count, Exact Step, Forced Nice Step.
- Minor ticks with optional labels.
- Box Zoom, Pan, and Crosshair/Pin tools.
- Floating toolbar with global undo/redo.
- Smart legend: 4 corner boxes (vertical/horizontal), right columns, bottom rows.
- Frame presets (7 layouts) plus custom dimensions (200-3000 px) with three modes
  (Stretch, Extend, Crop).
- Editable view limits with per-axis shift and per-axis undo/reset.

**Performance**
- MinMaxLTTB downsampling (preserves peaks on 100,000+ point datasets).
- Binary search isolates visible data during zoom.
- requestAnimationFrame throttle during pan.
- Force-SVG export mode for vector output on massive files.

**Configuration**
- Minimal YAML parser/stringifier in Vanilla JS (no dependencies).
- Full visual state serialization: frame, axes, graph, series, view limits.
- Save/Load/Apply workflow for reproducible visualization.

**Export**
- SVG (vector), PNG (3x resolution), JPEG, PDF (exact frame dimensions).
- CSV (raw) and CSV (processed via math pipeline).

**i18n**
- Complete English + Spanish translations.
- Language switcher in the header.

**UI**
- Modular panels: role, pipeline, axes, frame, config, appearance, range.
- Collapsible panels with auto scroll-into-view.
- Inline editing for series labels.
- Custom series colors and line styles (solid, dashed, dotted, dashdot).

### Known Limitations

- No scientific pipeline yet. Smoothing is Gaussian only (Savitzky-Golay
  planned for v0.2.0). Baseline correction uses linear interpolation between
  two anchor points. No peak detection.
- No batch processing yet. One file at a time.
- Canvas is invisible to SVG export. Solved by forcing SVG on export,
  but this re-renders the plot temporarily.
- YAML parser is minimal. No anchors, aliases, multi-doc, or tags.

### Planned for v0.2.0

- Savitzky-Golay smoothing.
- Peak detection with prominence.
- Interactive baseline anchors (click on plot).
- Pipeline configuration in YAML.
