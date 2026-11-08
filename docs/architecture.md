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
| `i` | Mix of `n` and `z` in the same column (`MIXED_NOTATION` diagnostic) |
| `v` | Column is entirely empty |

Gaps (`v` in some rows but not others) do NOT change the column symbol. The abstract canon is produced by `04c_block_canon`, AFTER the disambiguation phase has fixed the comma roles.

## Pipeline

    [File]
        |
        v
    [00_reading]         -> text + diagnostics
        |
        v
    [01_sampling]        -> lines, centralBlock, sample + diagnostics
        |
        v
    [02_lexer]           -> literal structure per line (n / z / v / , / |) + diagnostics
        |
        v
    [03_ir]              -> totalCount + frequencies + lengths + diagnostics
        |
        v
    [04_canon]           -> literal canon + blocks (grouped by comma pattern) + body
        |
        v
    [04b_disambiguation] -> per-block candidate resolutions + hasAmbiguity
        |
        v
    [04c_block_canon]    -> per-block abstract canon (n / z / i / v) + completeness
        |
        v
    [05_fixation]        -> per-block executable plan (pattern + commaRoles + columnTypes)
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
- **Rules**: R1-R6, R96, R106.

### 04b_disambiguation

- **Function**: `detectAmbiguities(blocks, lines)`
- **Input**: blocks from `04_canon`, all lines.
- **Output**: `{ blocks, hasAmbiguity, diagnostics }`
- **Does**: 
  - Enumerates valid resolutions per block.
  - **Optimization:** If a block pattern contains hard separators (`|`), it immediately assumes all commas are decimal (`dec`) and skips enumeration.
  - Filters out garbage blocks (e.g., text headers) that fail their own default resolution on >50% of rows.
- **Does NOT**: resolve, apply, or build abstract canon.
- **Rules**: R44-R46, R97, R99.

### 06_parser

- **Function**: `parseLine(line, plan)`
- **Input**: `{ index, content }`, plan from `05_fixation`.
- **Output**: `{ index, ok, values: (number|null)[], diagnostics }`
- **Does**: walks the pattern left to right. `_` consumes a number. `v` consumes a gap. `,` with role `sep` finalizes. `,` with role `dec` fuses numbers. `|` consumes a hard separator.
- **Does NOT**: resolve ambiguity, apply heuristics.
- **Depends on**: `compiler/tokenizer.js`.
- **Rules**: R48-R56.

## Layers Outside the Compiler

### main.js

The orchestrator. Implements no phase logic. Consumes each phase's output, threads it to the next phase, and packages the final result into a `CompileResult`. Stateless: every `compile()` call re-reads and re-processes the file from scratch.

#### Contract

    compile(file, options) -> CompileResult

**Options:**

- `resolutions`: `undefined | 'auto' | { [pattern]: ('sep'|'dec')[] }`
- `maxFailureRatio`: `number`, default `0.20`.

**Block Filtering and Alignment Strategy:**
1. The compiler calculates the maximum number of columns across all valid blocks (`maxNumColumns`).
2. If the largest block (by row count) already produces the `maxNumColumns`, any smaller block with fewer columns is considered "garbage" (e.g., text headers) and is skipped entirely.
3. If the largest block has fewer columns (e.g., a sparse file), all blocks are processed, and shorter rows are padded with `null` to match `maxNumColumns`.
4. Rows from skipped blocks are filled with `null` in every column, preserving table alignment.

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

### ui/

Handles the interface. Consumes `main.js` results and acts. Includes custom modals for comma disambiguation and duplicate column collapsing. Modularized into `services/` (pure logic) and `ui/` (DOM components).

### plot.js

Plots the normalized columns. Sorts the X-axis before drawing to prevent ECG artifacts from unsorted instrument data, and ignores `null` values to avoid zero-scaling.

### plot/ (Visualization Engine)
The visualization engine is fully modularized into `src/plot/`:
- `state.js`: Centralized state (zoom history, axes config, series styles).
- `axes.js`: Tick generation (Linear/Log10, Auto/Count/Step/Nice) and number formatting.
- `renderer.js`: Pure SVG drawing (grid, axes, lines, legend, titles).
- `interaction.js`: Mouse events (Box Zoom, Pan, Crosshair, Pin).
- `controls.js`: External zoom toolbar.

The `state.axisConfig` allows fine-grained control over scales (linear/log), ticks, grid minors, and formatting. The `state.seriesConfig` handles per-series colors, line styles (solid, dashed, dotted, dashdot), and custom labels for the legend.

## Design Decisions

### Why two levels of canon?

Because the nature of a row (which tokens are on that line) and the nature of a column (which token types appear across all rows) are different questions. Conflating them loses the column-level information needed for diagnostics.

### Why a literal canon?

Because comma interpretation is not the lexer's job. `350,0;0,523` is genuinely ambiguous at the line level (3 decimals or 6 integers?). Only the file context can decide.

### Why hard separators (`|`)?

Because if a line uses semicolons (`;`), the commas can only be decimal separators. Marking `|` prevents the compiler from wasting time enumerating combinations that don't exist.

### Why `segments` in the output?

Because the user needs to audit what the compiler did with their data. If 2 rows were interpreted with a different plan from the rest, that is a scientific fact the user must know.

### Why diagnostic codes instead of strings?

So the compiler is language-agnostic. The UI translates via `i18n.js`.

## Data Processing (Planned)

Phase 10: Data Treatment Engine. Performs mathematical operations (smoothing, baseline) guided by a configuration file. All math operations preserve `nulls` and do not mutate the original input.

## Visualization Engine (`src/plot/`)

The plotting module is fully decoupled from the compiler and the UI logic. It is designed for high-performance scientific visualization.

### Architecture
- **`state.js`**: Centralized state for zoom history, axis configuration, series styling, and graph metadata (titles, legend).
- **`axes.js`**: Pure functions for generating ticks (Linear/Log10, Auto/Count/Step/Nice) and formatting labels.
- **`renderer.js`**: The core engine. Uses a **Hybrid SVG/Canvas** approach. Axes, grid, and text are drawn in SVG (for perfect vector sharpness), while dense data lines are drawn in a Canvas overlay.
- **`downsampler.js`**: Implements the **MinMaxLTTB** algorithm. Reduces datasets with >2,000 points to a target size while preserving visual peaks and valleys, allowing smooth rendering of 100,000+ point files.
- **`interaction.js`**: Handles mouse events (Box Zoom, Pan, Crosshair/Pin) and coordinate mapping.
- **`controls.js`**: Manages the floating zoom toolbar.

### Key Features
- **Dynamic Viewport:** Uses **Binary Search** to isolate only the data points within the current zoom window, ensuring 60fps interaction even on massive files.
- **Smart Legend:** Supports different positions (Inside Box, Right Columns, Bottom Rows). When placed outside, the SVG expands its viewBox rather than compressing the plot area.
- **Inline Customization:** Users can rename series directly from the sidebar, changing the axis labels and the legend in real-time.
- **Vector/Canvas Toggle:** Automatically switches between SVG (for <2,000 points) and Canvas (for >2,000 points) to balance crispness and performance.

## Out of Scope

- **R84**: thousands notation (`1.234,56`).
- **R85**: literal missing values (`NaN`, `---`, `>3.0`).
- **R86**: rows split across multiple lines.
- **R87**: units attached to numbers (`250nm`).
- **R88**: comments at the end of lines.
