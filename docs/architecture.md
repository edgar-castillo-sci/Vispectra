# Vispectra Architecture

## Overview

Vispectra reads messy spectroscopy files — UV-Vis, XRD, XPS, Raman, IR — with different dialects, variable headers, and mixed separators, and converts them into clean numerical columns, ready for plotting and publication.

It does this in independent phases, each with a clear responsibility, communicating through explicit contracts. The compiler does not guess: it transcribes, groups, and only interprets when the user authorizes it. When it cannot decide honestly, it fails explicitly with a typed diagnostic instead of silently producing corrupt data.

All phases return a named object, except `08_codegen`, which directly mutates `columns` and returns nothing.

## Two-Level Canonical Model

The canon operates at two distinct levels that must never be conflated.

### Level 1 — Literal canon (per row)

Transcription of a single line into the alphabet `n`, `z`, `,`, `|`. No comma is interpreted at this level.

| Symbol | Meaning |
|---|---|
| `n` | Number with a decimal point |
| `z` | Number without a decimal point (integer) |
| `,` | Literal comma (can be decimal or separator) |
| `|` | Hard column separator (;, space, tab, etc.) |

Examples:

| Line | Literal canon |
|---|---|
| `350.0,0.523,0.001` | `n,n,n` |
| `350,0;0,523;0,001` | `z,z|z,z|z,z` |
| `1,,3` | `z,,z` |

The literal canon is produced by `02_lexer`. It contains no heuristics.

### Level 2 — Abstract canon (per block)

One symbol per column, describing the nature of that column across all rows of a block.

| Symbol | Meaning |
|---|---|
| `n` | All non-empty values in the column are `n` (dot-decimal) |
| `z` | All non-empty values in the column are `z` (integer) |
| `i` | Mix of `n` and `z` in the same column (`MIXED_NOTATION`) |
| `v` | Column is entirely empty |

Gaps (`v` in some rows but not others) do NOT change the column symbol. The abstract canon is produced by `04c_block_canon`, AFTER the disambiguation phase has fixed the comma roles.

## Compiler Pipeline

    [File]
        |
        v
    [00_reading]         -> text + diagnostics
        |
        v
    [01_sampling]        -> lines, centralBlock, sample + diagnostics
        |
        v
    [02_lexer]           -> literal structure per line (n / z / v / , / |)
        |
        v
    [03_ir]              -> totalCount + frequencies + lengths
        |
        v
    [04_canon]           -> literal canon + blocks (by comma pattern) + body
        |
        v
    [04b_disambiguation] -> per-block candidate resolutions + hasAmbiguity
        |
        v
    [04c_block_canon]    -> per-block abstract canon (n / z / i / v)
        |
        v
    [05_fixation]        -> per-block executable plan
        |
        v
    [06_parser]          -> values per line, driven by plan
        |
        v
    [07_semantics]       -> verified values
        |
        v
    [08_codegen]         -> filled columns (mutation)
        |
        v
    [09_diagnostics]     -> diagnostics accumulator
        |
        v
    [Normalized data + diagnostics]

`main.js` orchestrates the pipeline. Each phase is a pure function (except `08_codegen`) and returns a named object.

## Phase Contracts

### 02_lexer

- **Function**: `lex(line)`
- **Input**: string (raw line)
- **Output**: `{ structure: string, diagnostics: [diag] }`
- **Does**: transcribes the line into `n`, `z`, `v`, `,`, `|`. Consumes numbers atomically. Emits `|` for hard separators.
- **Does NOT**: interpret commas, apply parity.
- **Depends on**: `compiler/tokenizer.js`.

### 04b_disambiguation

- **Function**: `detectAmbiguities(blocks, lines)`
- **Input**: blocks from `04_canon`, all lines.
- **Output**: `{ blocks, hasAmbiguity, diagnostics }`
- **Does**: enumerates valid resolutions per block. If a block pattern contains hard separators (`|`), assumes all commas are decimal (`dec`) and skips enumeration. Filters out garbage blocks.
- **Does NOT**: resolve, apply, or build abstract canon.

### 06_parser

- **Function**: `parseLine(line, plan)`
- **Input**: `{ index, content }`, plan from `05_fixation`.
- **Output**: `{ index, ok, values: (number|null)[], diagnostics }`
- **Does**: walks the pattern left to right. `_` consumes a number. `v` consumes a gap. `,` with role `sep` finalizes. `,` with role `dec` fuses numbers. `|` consumes a hard separator.
- **Does NOT**: resolve ambiguity, apply heuristics.

## Layers Outside the Compiler

### main.js

The orchestrator. Stateless: every `compile()` call re-reads and re-processes the file from scratch.

**Block Filtering Strategy:**

1. The compiler calculates the maximum number of columns across all valid blocks.
2. If the largest block (by row count) already produces that maximum, any smaller block with fewer columns is considered garbage and is skipped entirely.
3. If the largest block has fewer columns (sparse file), all blocks are processed and shorter rows are padded with `null`.
4. Rows from skipped blocks are filled with `null` in every column.

**CompileResult:**

    {
      status: 'ok' | 'partial' | 'failed' | 'needs_disambiguation',
      columns: number[][] | null,
      segments: Segment[],
      ambiguities: { blocks } | null,
      body: { start, end },
      canonLiteral: string,
      numColumns: number | null,
      failedRows: number,
      totalRows: number,
      failureRatio: number,
      log: Accumulator,
      diagnostics: Diagnostic[],
    }

### Visualization Engine (`src/plot/`)

The plotting module is fully decoupled from the compiler and the UI logic. It is designed for high-performance scientific visualization.

#### Architecture

- **`state.js`**: Centralized state. Holds `viewLimits`, `viewHistory` (each step stores `{ limits, axis }`), `currentTool`, `frame`, `axisConfig`, `graphConfig`, `seriesConfig`, `exportMode`, `zoomControlsHidden`. Exposes `resetView`, `clearPin`, `pushHistory`, `undo`, `redo`, `undoAxis`, `resetAxis`, `adjustViewForFrameChange`.
- **`axes.js`**: Pure functions for generating ticks (Linear/Log10, Auto/Count/Step/Nice) and formatting labels.
- **`renderer.js`**: The core engine. Uses a **Hybrid SVG/Canvas** approach. Axes, grid, text, and legend are drawn in SVG (for perfect vector sharpness). Dense data lines are drawn in a Canvas overlay (for speed). Uses binary search to isolate visible data points during zoom.
- **`downsampler.js`**: Implements the **MinMaxLTTB** algorithm. Reduces datasets with >2,000 points while preserving visual peaks and valleys, allowing smooth rendering of 100,000+ point files.
- **`interaction.js`**: Handles mouse events (Box Zoom, Pan, Crosshair/Pin). Uses `frozenRect` to prevent coordinate drift during drag and `requestAnimationFrame` to throttle pan redraws. Ignores `e.detail > 1` on mousedown/mouseup/click so double-click fires cleanly.
- **`controls.js`**: Manages the floating zoom toolbar. Global undo/redo only (per-axis undo lives in the range panel).
- **`index.js`**: The orchestrator. Prepares data, calls `render()`, connects interaction, updates controls, and updates the range panel below the plot.

#### Two Modes of Rendering

- **Interactive (default):** Data with ≤2,000 points per series is drawn in SVG (crisp vectors). Data with >2,000 points uses Canvas + MinMaxLTTB.
- **Export mode (`state.exportMode = true`):** Forces SVG for all series, with a higher downsample budget (10,000 points per series). Used by the export flow to guarantee vector output in SVG/PDF/PNG.

#### View Limits and History

- `viewLimits` holds the current visible range (`minX`, `maxX`, `minY`, `maxY`). `null` means "full data range".
- Every change (zoom, pan, shift, manual edit, reset) pushes a new step to `viewHistory` with `{ limits, axis }` where `axis ∈ 'x' | 'y' | 'xy'`.
- `undo()` / `redo()` walk the history globally.
- `undoAxis('x' | 'y')` walks back to the last step that affected that axis and applies only that axis's values.
- `resetAxis('x' | 'y')` sets that axis's limits to `null` (full range) and pushes the step.

#### Frame System

- `state.frame` holds `{ width, height, mode }`. Min 200x200, max 3000x3000.
- Seven presets (16:10, 16:9, 21:9, A4 landscape, 1:1, A4 portrait, 9:16) plus Custom.
- Three modes:
  - **Stretch:** `viewLimits` unchanged. Data visually stretched.
  - **Extend:** On grow, `viewLimits` expands so density (px/unit) stays constant.
  - **Crop:** On shrink, `viewLimits` shrinks so density stays constant.

#### Legend Positions

- **Box (4 corners):** Rendered inside the plot, vertical or horizontal layout. Does not affect SVG size.
- **Right (Columns):** Rendered outside, to the right. The SVG expands horizontally (never compresses the plot). Multiple columns if needed.
- **Bottom (Rows):** Rendered outside, below. The SVG expands vertically. Multiple rows if needed.
- A dashed separator line marks the boundary between plot and legend.

### Services (`src/services/`)

Pure logic consumed by the UI.

- **`columns.js`**: `deduplicateColumns(columns, epsilon)` — null-aware column deduplication.
- **`pipeline.js`**: `applyPipeline(columns, xIndex, yIndices, operations)` — immutable math pipeline.
- **`export.js`**: Plot export (SVG, PNG, JPEG, PDF) with forced-SVG mode, explicit width/height, 3x raster for PNG/JPEG, exact frame dimensions for PDF. CSV export for raw and processed data.
- **`yaml.js`**: `parseYAML(text)` and `stringifyYAML(obj)` — minimal YAML parser/stringifier in Vanilla JS. Supports scalars, nested objects, arrays of scalars/objects, comments. No anchors, aliases, multi-doc, or tags.
- **`config.js`**: `stateToConfig()`, `configToState()`, `exportStateToYAML()`, `importYAMLToState()`. Serializes and hydrates the entire visual state.

### UI (`src/ui/` + `ui.js`)

Each panel is an independent module that renders its own DOM, handles its own events, and calls a callback (`onUpdate`) whenever the state changes. `ui.js` orchestrates the toggles, the file flow, and the redraw loop.

## Configuration System (YAML)

The entire visual state can be serialized to YAML and reapplied later.

**Config Schema (v1):**

    version: 1
    frame:
      width: 800
      height: 500
      mode: stretch
    axis:
      x:
        scale: linear
        mode: auto
        count: 5
        step: 0.5
        format: auto
        minor: 0
        label: ""
        showMinorLabels: false
      y:
        scale: linear
        mode: auto
        count: 5
        step: 0.5
        format: auto
        minor: 0
        label: ""
        showMinorLabels: false
    graph:
      title: ""
      legend:
        show: false
        position: top-right
        layout: vertical
    series:
      "1":
        color: "#cc0000"
        style: dashed
        width: 1.5
        label: "Sample A"
    view:
      minX: 100.0
      maxX: 800.0
      minY: 14.0
      maxY: 20.0

**Flow:**

1. User configures the plot manually (or via a loaded YAML).
2. **Save .yaml** serializes the current state and downloads the file.
3. **Load .yaml** populates the textarea from a file.
4. **Apply** parses the YAML and hydrates the state, then triggers a redraw.

This allows reproducible visualization: the same YAML applied to different files produces the same frame, axes, series styles, and zoom range (clamped to the new data extent).

## Design Decisions

### Why two levels of canon?

Because the nature of a row (which tokens are on that line) and the nature of a column (which token types appear across all rows) are different questions. Conflating them loses the column-level information needed for diagnostics.

### Why a literal canon?

Because comma interpretation is not the lexer's job. `350,0;0,523` is genuinely ambiguous at the line level (3 decimals or 6 integers?). Only the file context can decide.

### Why hard separators (`|`)?

Because if a line uses semicolons (`;`), the commas can only be decimal separators. Marking `|` prevents the compiler from wasting time enumerating combinations that don't exist.

### Why hybrid SVG/Canvas?

Because SVG is crisp for axes, grid, and text, but slow for dense data (thousands of DOM nodes). Canvas is fast for dense data but rasterized. The hybrid gives vector-sharp axes and 60fps interaction on 100,000+ point files.

### Why MinMaxLTTB?

Because LTTB preserves visual peaks better than averaging, and MinMax pre-selection makes LTTB ~30x faster. Together they allow 100k-point files to render in <100ms while preserving the shape of every peak.

### Why binary search for zoom?

Because without it, every mousemove during pan iterates the full dataset (100k points) to recompute Y bounds. Binary search reduces that to O(log n) to find visible range, then only the visible points are processed. This is the difference between laggy and smooth.

### Why per-axis undo?

Because if the user shifts X and then Y, the global undo reverts Y (the last step). To revert X specifically, they need `undoAxis('x')` which walks back to the last step that affected X. This gives independent control per axis without a complex tree.

### Why force-SVG export mode?

Because Canvas is invisible to SVG serialization. If the user has a massive file, exporting would produce an SVG with only the axes (no data lines). Forcing SVG in export mode (with a higher downsample budget) ensures the exported file is complete and vector-sharp.

### Why YAML?

Because it is machine-readable, human-editable, and future-proof. When the scientific phase arrives (Savitzky-Golay, baseline, peak picking), the same YAML will hold the pipeline configuration alongside the visual configuration. One file = one reproducible analysis.

### Why diagnostic codes instead of strings?

So the compiler is language-agnostic. The UI translates via `i18n.js`.

## Data Processing (Planned)

**Phase 10: Data Treatment Engine.** Will consume a YAML configuration to apply mathematical operations (Savitzky-Golay smoothing, baseline correction, peak detection, normalization) to the extracted columns. Operations will be pure functions in `src/processor.js`.

The YAML will grow to include:

    pipeline:
      - type: smooth_savgol
        window: 11
        order: 3
      - type: baseline
        method: linear
        anchors: [[350, 0.5], [800, 0.2]]
      - type: normalize
        method: max_peak

**Phase 11: Batch Processing.** Users drop a folder + a `.yaml` config. Vispectra compiles every file, applies the same treatment, and offers a unified export.

## Out of Scope

- **R84**: thousands notation (`1.234,56`).
- **R85**: literal missing values (`NaN`, `---`, `>3.0`).
- **R86**: rows split across multiple lines.
- **R87**: units attached to numbers (`250nm`).
- **R88**: comments at the end of lines.
