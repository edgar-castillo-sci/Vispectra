# Vispectra

## Abstract

Vispectra is a compiler for spectroscopic file formats (UV-Vis, XRD, XPS, Raman, IR). It is designed to ingest heterogeneous, unformatted instrument outputs and transform them into strict numerical matrices.

Rather than relying on hardcoded parsers for specific proprietary formats, Vispectra infers the grammatical structure of the file from a statistical sample of its contents. It operates entirely client-side within a web browser, ensuring zero telemetry, no backend dependencies, and complete data privacy.

## Theoretical Background

Reading an unknown file format without prior specification is equivalent to the **identification of grammars from positive presentations**. In 1967, E. M. Gold demonstrated that this problem is formally impossible to solve in the general case using only positive examples.

Vispectra does not attempt to solve the general problem. Instead, it restricts the domain to spectroscopic data and applies **inductive biases** (heuristics) to make the problem tractable:

1.  **Central Block Sampling:** It assumes that preambles and residues occupy the extremes of the file, while the central block contains the raw data.
2.  **Canonicalization:** It extracts a structural contract (the *canon*) by comparing line structures.
3.  **The Hard Separator (`|`):** It distinguishes hard separators (semicolons, spaces) from literal commas, allowing it to resolve European and American formats without guessing.

When the compiler cannot decide on a valid structure, it fails explicitly by emitting typed diagnostics rather than silently producing corrupt data.

## System Architecture

Four independent layers:

**1. Compiler (`src/compiler/`)**
Pipeline of pure functions (00-09) that transforms text into clean numerical columns.
- 00_reading, 01_sampling, 02_lexer, 03_ir, 04_canon, 04b_disambiguation,
  04c_block_canon, 05_fixation, 06_parser, 07_semantics, 08_codegen,
  09_diagnostics.

**2. Visualization Engine (`src/plot/`)**
Hybrid SVG/Canvas renderer.
- `state.js` — centralized graph state
- `axes.js` — tick generation + label formatting (with super-exponent support)
- `renderer.js` — hybrid SVG/Canvas drawing, frame, ticks, grid, legend
- `downsampler.js` — MinMaxLTTB algorithm for massive datasets
- `interaction.js` — hover crosshair, pin, box zoom, dblclick reset
- `index.js` — orchestrator (drawPlot + range panel)

**3. Services (`src/services/`)**
Pure logic the UI consumes.
- `columns.js` — null-aware deduplication
- `pipeline.js` — math pipeline (immutable)
- `export.js` — SVG/PNG/JPEG/PDF/CSV
- `yaml.js` — minimal YAML parser/stringifier (Vanilla JS)
- `config.js` — state ↔ YAML bridge

**4. User Interface (`src/ui/` + `ui.js`)**
Modular DOM components.
- `rolePanel.js` — Y-series selection, colors, styles, widths, inline labels
- `pipelinePanel.js` — math pipeline builder
- `axesPanel.js` — axis scale, mode, format, minors, invert
- `framePanel.js` — canvas presets, custom dimensions, frame modes
- `configPanel.js` — YAML save/load/apply
- `rangePanel.js` — editable view limits, per-axis shift/undo/reset
- `appearancePanel.js` — font, frame, ticks, grid, legend frame, super-exponent
- `disambiguationModal.js` / `columnsModal.js` — decision modals

## Implementation Status

**Current Version:** `v0.1.1-alpha-dev`

**Canonical model:** Two-level canon.
- **Literal (per row):** `n` (dot-decimal), `z` (integer), `v` (empty slot), `|` (hard separator), `,` (literal comma).
- **Abstract (per block):** `n` / `z` / `i` / `v`, one symbol per column.

**Status:**
- **Compiler:** Stable (00-09). Handles American, European, sparse, and wide-format files with automatic garbage filtering and empty-column exclusion.
- **Visualization Engine:** Publication-ready. Hybrid SVG/Canvas, MinMaxLTTB downsampling, binary-search zoom isolation, per-axis invert (no `flip`), frame/ticks/grid/legend-frame/Computer-Modern/super-exponent options.
- **Configuration (YAML v2):** Full visual state serialization (columns, frame, axis, graph, series, view). Round-trip faithful.
- **UI:** Modular. Custom modals, per-series width lock, color/style compaction with lock, hover legend with live values, floating X tooltip.

## Key Features

**Robust Parsing:**
- American (`.` decimal, `,` separator) and European (`,` decimal, `;` separator) formats.
- Automatic metadata/header filtering.
- Missing columns padded with `null` (never `0`).
- Empty columns excluded from plot and legend automatically.
- Heuristic X detection: skips sequential integer index columns and picks the first monotonic numeric column.
- Interactive disambiguation when structure is truly ambiguous.

**Publication-Ready Visualization:**
- **Scales:** Linear and Log10 per axis.
- **Ticks:** Auto (nice numbers), Fixed Count, Exact Step, Forced Nice Step; inward/outward/in+out; mirrored on top/right.
- **Frame:** Full box around the plot (LaTeX-style), on by default.
- **Grid:** `none` / `major` / `both`.
- **Font:** Computer Modern (via KaTeX webfont), Times, or system sans.
- **Super-exponent:** `1.5e-3` rendered as `1.5x10^-3`, log ticks as `10^-2`, `10^-1`, `1`, `10`.
- **Legend:** 6 positions (4 box corners + right + bottom), 3 frame styles (`none`, `thin`, `default`).
- **Hover interaction:** Crosshair follows mouse; sidebar and legend values update live; floating `X = ...` tooltip over the plot.
- **Pin (click):** Freezes crosshair, sidebar values, legend values, and X tooltip. Click again to release.
- **Box zoom:** Drag on the plot to zoom; double-click to reset.
- **Range panel:** Direct min/max editing, deterministic shift (Δ) per axis, per-axis undo, per-axis reset.
- **Frame presets:** 7 layouts + custom (200-3000px), 3 resize modes (stretch, extend, crop).
- **Series styling:** Per-series color/style/width; color and style auto-compact across active non-empty series; optional "Lock styles" to freeze manual choices; per-series width with master width slider and "Lock all" toggle.
- **Performance:** Binary-search isolates visible points during zoom; MinMaxLTTB downsamples datasets >2,000 points while preserving peak shapes; force-SVG export mode for vector output on massive files.

**Calibration (Planned for v0.3.0):**
- Linear, quadratic, and linear-through-zero fits.
- LOD, LOQ, residuals, standard errors per sample.
- No automatic decisions: Vispectra computes and reports; the user decides what the data means.

## Usage & Deployment

    git clone https://github.com/edgar-castillo-sci/Vispectra.git
    cd Vispectra
    npm run dev

Open the local URL, drop a spectroscopic file into the interface. Drag and drop is supported.

## License and Open Science

Licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. The AGPL-3.0 protects the scientific core from proprietary forks. For commercial or proprietary integration, dual-licensing negotiations are available by contacting the author.

## References

- Gold, E. M. (1967). *Language identification in the limit*. Information and Control, 10(5), 447-474. https://doi.org/10.1016/S0019-9958\(67\)91165-5

## Author

**Edgar Castillo**
Independent Researcher
[ORCID: 0009-0006-4268-3323](https://orcid.org/0009-0006-4268-3323)
