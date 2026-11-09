# Changelog

All notable changes to Vispectra will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
