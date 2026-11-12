# Vispectra Architecture

## Overview

Vispectra reads messy spectroscopy files — UV-Vis, XRD, XPS, Raman, IR —
with different dialects, variable headers, and mixed separators, and
converts them into clean numerical columns, ready for plotting and
publication.

It does this in independent phases, each with a clear responsibility,
communicating through explicit contracts. The compiler does not guess: it
transcribes, groups, and only interprets when the user authorizes it.
When it cannot decide honestly, it fails explicitly with a typed
diagnostic instead of silently producing corrupt data.

All phases return a named object, except `08_codegen`, which directly
mutates `columns` and returns nothing.

For the grammar rules each phase implements (R1–R109), see
[`rules.md`](rules.md). For what is planned but not yet built, see
[`../ROADMAP.md`](../ROADMAP.md).

## Two-Level Canonical Model

The canon operates at two distinct levels that must never be conflated.

### Level 1 — Literal canon (per row)

Transcription of a single line into the alphabet `n`, `z`, `v`, `,`, `|`.
No comma is interpreted at this level.

| Symbol | Meaning |
|---|---|
| `n` | Number with a decimal point |
| `z` | Number without a decimal point (integer) |
| `v` | Explicit empty slot |
| `,` | Literal comma (can be decimal or separator) |
| `\|` | Hard column separator (`;`, space, tab, etc.) |

Examples:

| Line | Literal canon |
|---|---|
| `350.0,0.523,0.001` | `n,n,n` |
| `350,0;0,523;0,001` | `z,z\|z,z\|z,z` |
| `1,,3` | `z,,z` |
| `1, ,3` | `z,\|,z` |

The literal canon is produced by `02_lexer`. It contains no heuristics.

### Level 2 — Abstract canon (per block)

One symbol per column, describing the nature of that column across all
rows of a block.

| Symbol | Meaning |
|---|---|
| `n` | All non-empty values in the column are `n` (dot-decimal) |
| `z` | All non-empty values in the column are `z` (integer) |
| `i` | Mix of `n` and `z` in the same column (`MIXED_NOTATION`) |
| `v` | Column is entirely empty |

Gaps (`v` in some rows but not others) do NOT change the column symbol.
The abstract canon is produced by `04c_block_canon`, **after** the
disambiguation phase has fixed the comma roles.

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
    [01b_trailing_comma] -> lines normalized + policy (preserve/trim/none)
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
    [04b_disambiguation] -> per-block resolutions (R107 / R98 / enumer.) + hasAmbiguity
        |
        v
    [04c_block_canon]    -> per-block abstract canon (n / z / i / v)
        |
        v
    [05_fixation]        -> per-block executable plan
        |
        v
    [06_parser]          -> values per line, driven by plan (R16 fusion)
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

`main.js` orchestrates the pipeline. Each phase is a pure function
(except `08_codegen`) and returns a named object.

## Phase Contracts

### 01b_trailing_comma

- **Function**: `detectTrailingCommaPolicy(lines, centralBlock)`
- **Input**: raw lines (array of `{index, content}`), central block bounds.
- **Output**: `{ lines, policy, diagnostics }`.
- **Does**: detects whether data lines in the central block end in `,`.
  Returns one of three policies: `preserve` (trailing comma = empty
  column), `trim` (mixed → normalize to strip), `none` (no trailing).
  When `trim`, returns a new `lines` array with trailing commas removed.
  When `preserve` or `none`, returns `lines` unchanged.
- **Does NOT**: interpret the comma. That happens in `04b`.
- **Depends on**: `01_sampling` (central block bounds).

### 02_lexer

- **Function**: `lex(line)`
- **Input**: string (raw line).
- **Output**: `{ structure: string, diagnostics: [diag] }`.
- **Does**: transcribes the line into `n`, `z`, `v`, `,`, `|`. Consumes
  numbers atomically. Emits `|` for hard separators (`;`, space, tab).
  Preserves trailing `,` (per R13). Trims trailing `|` (decorative in
  instrument exports).
- **Does NOT**: interpret commas, apply parity, fuse values.
- **Depends on**: `compiler/tokenizer.js`.

### 04b_disambiguation

- **Function**: `detectAmbiguities(blocks, lines)`
- **Input**: blocks from `04_canon`, all lines.
- **Output**: `{ blocks, hasAmbiguity, diagnostics }`.
- **Does**: for each block, determines the set of valid comma
  resolutions (`dec` / `sep`) and whether user intervention is needed.
  Decision order:
  1. **R107** (hard separator present): all commas are `dec`. Validate
     the `allDec` resolution structurally; if it does not compose (e.g.
     `z,|,z`), the block is garbage.
  2. **R98** (no hard separator, some `n` present): commas can only be
     `sep` (a dot-decimal `n` cannot be fused with a comma).
  3. **MAX_COMMAS** guard: if `commaCount > 20`, fall back to `allSep`
     with a `TOO_MANY_COMMAS` warning (prevents 2^k blowup).
  4. Otherwise, enumerate all `2^k` combinations and filter by
     structural compatibility across every row of the block.
- **Does NOT**: apply the resolution (that's `05_fixation`), or build
  the abstract canon (that's `04c_block_canon`).
- **Depends on**: `02_lexer` (per-row structures), `04_canon` (blocks).

### 04c_block_canon

- **Function**: `buildBlockCanon(block, lines, resolution)`
- **Input**: block from `04_canon`, lines, resolution from `04b`.
- **Output**: `{ canon, columns, completeness, diagnostics }`.
- **Does**: applies the resolution to every row and computes the
  abstract canon per column (`n` / `z` / `i` / `v`). Tracks
  `completeness` (filled/total per column). Emits `MIXED_NOTATION`
  for `i` columns and `COLUMN_GAPS` for partially filled columns.
- **Does NOT**: decide the resolution (that was `04b`), or build the
  parser plan (that's `05_fixation`).

### 06_parser

- **Function**: `parseLine(line, plan)`
- **Input**: `{ index, content }`, plan from `05_fixation`.
- **Output**: `{ index, ok, values: (number|null)[], diagnostics }`.
- **Does**: walks the pattern left to right. `_` consumes a number
  token. `v` consumes a gap and asserts no number is present. `,` with
  role `sep` finalizes the pending slot. `,` with role `dec` consumes
  the comma and the next number, then fuses them (R16): the fusion is
  valid iff `Number(leftRaw + '.' + rightRaw)` returns a finite number.
  `|` consumes a hard separator and finalizes.
- **Does NOT**: resolve ambiguity, apply heuristics, decide comma roles.
- **Depends on**: `tokenizer.js` (token stream with `raw` preserved).

## Layers Outside the Compiler

### main.js

The orchestrator. Stateless: every `compile()` call re-reads and
re-processes the file from scratch.

**Block Filtering Strategy (R109):**

1. Compute `maxNumColumns` across all valid blocks.
2. Identify the **dominant block**: the one with the most rows, breaking
   ties by column count. The tiebreaker matters when two blocks tie on
   row count (synthetic test cases) and prevents a wide-but-short
   metadata header from stealing dominance from a narrow-but-real data
   block.
3. If the dominant block's width equals `maxNumColumns`, blocks with
   fewer columns are classified as garbage and skipped. Their rows are
   null-padded in every column.
4. Otherwise (dominant block is narrower than `maxNumColumns`), all
   blocks are merged. This is the safety guard: a wide metadata header
   must not discard a narrow but real data block.

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

### Services (`src/services/`)

Pure logic consumed by the UI. **None of these functions import the
`state` singleton.** They receive plain objects and return plain
objects. The UI layer is responsible for wiring state in and out.

- **`columns.js`**: `deduplicateColumns(columns, epsilon)` — null-aware
  column deduplication. Empty columns are never collapsed among
  themselves; each keeps its own index.
- **`pipeline.js`**: `applyPipeline(columns, xIndex, yIndices, operations)`
  — immutable math pipeline.
- **`export.js`**: `exportarPlot(svg, format)` and
  `exportarCSV(columns, xIndex, yIndices, pipeline, procesar)` — SVG,
  PNG, JPEG, PDF (forced-SVG mode for vector output on massive files),
  CSV (raw and processed).
- **`yaml.js`**: `parseYAML(text)` and `stringifyYAML(obj)` — minimal
  YAML parser/stringifier in Vanilla JS. Supports scalars, nested
  objects, arrays of scalars/objects, comments. No anchors, aliases,
  multi-doc, or tags.
- **`config.js`**: pure readers between state objects and YAML patches.
  - `stateToConfig(state)` — reads a state object, returns a
    YAML-serializable config. Never mutates.
  - `configToStatePatch(config)` — reads a config object, returns a
    sanitized partial-state patch. Never mutates. Invalid enum values,
    non-finite numbers, and unknown fields are dropped.
  - `exportStateToYAML(state)` — pure convenience wrapper.
  - `importYAMLToPatch(yamlText)` — pure convenience wrapper.

The matching mutator lives in `src/plot/state.js`:
`applyConfigPatch(patch)` merges the sanitized patch into `state` and
resets `viewHistory` / `historyIndex` when `viewLimits` is present.
The `services/` layer never touches `state`.

### Visualization Engine (`src/plot/`)

Fully decoupled from the compiler and the UI logic. Designed for
high-performance scientific visualization.

#### Architecture

- **`state.js`**: centralized state. Holds `viewLimits`, `viewHistory`
  (each step is `{ limits, axis }` with `axis ∈ 'x'|'y'|'xy'`),
  `currentTool`, `frame`, `columnConfig`, `axisConfig`, `graphConfig`,
  `seriesConfig`, `seriesConfigLocked`, `seriesWidthLocked`,
  `masterWidth`, `exportMode`. Exposes `resetView`, `clearPin`,
  `pushHistory`, `undo`, `redo`, `undoAxis`, `resetAxis`,
  `adjustViewForFrameChange`, `applyConfigPatch`.
- **`axes.js`**: pure tick generation (Linear/Log10, Auto/Count/Step/Nice)
  and label formatting. `formatLabelParts` returns `{ pre, sup }` so the
  renderer can emit `<tspan baseline-shift="super">` for real
  superscripts.
- **`renderer.js`**: hybrid SVG/Canvas. Axes, grid, ticks, frame, text,
  and legend in SVG (crisp vectors). Data lines in Canvas overlay for
  >2,000 points. Uses binary search to isolate visible data during zoom.
  Honors `graphConfig` style options (frame, tick direction, mirror
  ticks, grid, legend frame, font, super-exponent).
- **`downsampler.js`**: MinMaxLTTB algorithm. Reduces dense series while
  preserving peak shapes and valleys.
- **`interaction.js`**: hover crosshair, floating X tooltip, legend live
  values, pin (click to freeze), box zoom (drag), double-click reset.
  No floating toolbar; all interactions are direct gestures or via the
  range panel.
- **`index.js`**: orchestrator. Prepares data, calls `render()`, attaches
  interaction, updates range panel.

#### Style System (per graph)

`state.graphConfig` holds publication-grade styling options, all
serialized to YAML:

| Key | Values | Default | Effect |
|---|---|---|---|
| `fontFamily` | `'cm'` / `'serif'` / `'sans'` | `'cm'` | Computer Modern (KaTeX webfont), Times, or system sans |
| `frame` | boolean | `true` | Full box around the plot (LaTeX-style) |
| `tickDirection` | `'in'` / `'out'` / `'inout'` | `'in'` | Tick marks direction |
| `mirrorTicks` | boolean | `true` | Inward ticks on top and right edges |
| `grid` | `'none'` / `'major'` / `'both'` | `'none'` | Grid lines |
| `legendFrame` | `'none'` / `'thin'` / `'default'` | `'thin'` | Legend background border |
| `useSuperExponent` | boolean | `true` | `1.5e-3` → `1.5x10^-3` via `<tspan>`; log ticks as `10^-2` |

#### Per-axis options

`state.axisConfig.{x,y}` holds per-axis settings:

| Key | Values | Default |
|---|---|---|
| `scale` | `'linear'` / `'log10'` | `'linear'` |
| `mode` | `'auto'` / `'count'` / `'step'` / `'nice'` | `'auto'` |
| `count`, `step` | number | 5, 0.5 |
| `format` | `'auto'` / `'fixed'` / `'scientific'` | `'auto'` |
| `minor` | number (0–10) | 0 |
| `label` | string | `''` |
| `showMinorLabels` | boolean | false |
| `invert` | boolean | false |

`invert` reverses the visual direction of the axis (ticks + data
together). There is **no `flip`**: reflecting only the data while
leaving ticks fixed is incoherent with zoom and was retired.

#### Two rendering modes

- **Interactive (default):** series with ≤2,000 points are drawn in SVG
  (crisp). Dense series use Canvas + MinMaxLTTB.
- **Export mode (`state.exportMode = true`):** forces SVG for all series
  (up to 10,000 points per series after downsampling). Used by the
  export flow to guarantee vector output in SVG/PDF/PNG.

#### Range panel

Deterministic counterpart to zoom. Four inputs (`X min`, `X max`,
`Y min`, `Y max`), two Δ shift inputs (per axis), per-axis undo
(`undoAxis`), per-axis reset (`resetAxis`), and per-axis shift values.
Edits apply on Enter or blur. Invalid ranges (min ≥ max) are highlighted
red and rejected.

#### Frame system

`state.frame` holds `{ width, height, mode }`. Min 200×200, max
3000×3000. Seven presets (16:10, 16:9, 21:9, A4 landscape, 1:1, A4
portrait, 9:16) plus custom.

Three modes:
- **`stretch`**: `viewLimits` unchanged; data visually stretched.
- **`extend`**: on grow, `viewLimits` expands so px-per-unit stays constant.
- **`crop`**: on shrink, `viewLimits` shrinks so px-per-unit stays constant.

#### Legend

6 positions (`top-right`, `top-left`, `bottom-right`, `bottom-left`,
`right`, `bottom`). Three frame styles. When placed outside (right or
bottom), the SVG viewBox expands rather than compressing the plot.

On hover, legend labels are replaced by the value at the crosshair. On
click (pin), the values freeze. A floating `X = ...` tooltip appears
above the plot and follows the mouse, hiding when the pointer leaves.

#### Column roles and series

`state.columnConfig` holds the YAML-driven selection:

- `x: null | int` — forced X column (null = heuristic).
- `discard: [int]` — indices hidden from the panel and plot.
- `selectedY: null | 'all' | 'first' | [indices]` — active Y series.

**Heuristic X selection**: if column 0 is a sequential integer index
(step +1 or -1), skip it and use the first monotonic numeric column.
Falls back to column 0.

**Empty columns** (all `null`) are:
- Rendered with `(empty)` badge and reduced opacity.
- Checkbox disabled.
- No color/style/width pickers.
- Excluded from `yIndices` (not drawn, not in legend).

**Series styling**:
- Colors and styles auto-compact across active non-empty Y series (no
  gaps from discarded or empty columns).
- `seriesConfigLocked` (Lock styles): preserves manual color/style
  across selection changes.
- `seriesWidthLocked` (Lock all widths, default `true`): master width
  slider applies to all active series. When `false`, each series has its
  own width slider in its expanded panel.
- Each series row has a swatch SVG (mimicking a legend item). Click the
  swatch to expand the color/style/width panel.

### User Interface (`src/ui/` + `ui.js`)

Each panel is an independent module that renders its own DOM, handles
its own events, and calls a callback (`onUpdate`) whenever the state
changes. `ui.js` orchestrates the toggles, the file flow, and the
redraw loop.

## Configuration System (YAML)

The entire visual state can be serialized to YAML and reapplied later.

**Config Schema (v2):**

    version: 2
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
        invert: false
      y:
        scale: linear
        mode: auto
        count: 5
        step: 0.5
        format: auto
        minor: 0
        label: ""
        showMinorLabels: false
        invert: false
    graph:
      fontFamily: cm
      frame: true
      tickDirection: in
      mirrorTicks: true
      grid: none
      legendFrame: thin
      useSuperExponent: true
      seriesWidthLocked: true
      masterWidth: 1.5
    columns:
      x: null
      discard: []
      selected_y: all
    series:
      "1":
        color: "#cc0000"
        style: dashed
        width: 1.5
        label: "Sample A"
    series_locked: false
    view:
      minX: 100.0
      maxX: 800.0
      minY: 14.0
      maxY: 20.0

**Flow:**

1. User configures the plot manually (or via a loaded YAML).
2. **Save .yaml** serializes the current state and downloads the file
   (`exportStateToYAML(state)`).
3. **Load .yaml** populates the textarea from a file.
4. **Apply** parses the YAML into a sanitized patch
   (`importYAMLToPatch(text)`), merges it into state
   (`applyConfigPatch(patch)`), then triggers a redraw.

This allows reproducible visualization: the same YAML applied to
different files produces the same frame, axes, series styles, and zoom
range (clamped to the new data extent).

## Design Decisions

### Why two levels of canon?

Because the nature of a row (which tokens are on that line) and the
nature of a column (which token types appear across all rows) are
different questions. Conflating them loses the column-level information
needed for diagnostics.

### Why a literal canon?

Because comma interpretation is not the lexer's job. `350,0;0,523` is
genuinely ambiguous at the line level (3 decimals or 6 integers?). Only
the file context can decide.

### Why hard separators (`|`)?

Because if a line uses semicolons (`;`), the commas can only be decimal
separators. Marking `|` prevents the compiler from wasting time
enumerating combinations that don't exist (R107), and it lets the
compiler resolve files that mix european and scientific notation
without guessing.

### Why reformulate R16 (fusion validity by `Number`)?

Because `/^\d+$/` was over-conservative. The parser receives a **closed
plan** from `04b` (the comma role is already decided); R16 only asks
whether that role produces a valid number. `-9,58E-06` is objectively a
number; rejecting it as `FUSION_UNSAFE` was a bug. `Number` is strict
enough to reject `-1.-5`, `1e5.2`, `1.2.5`, `1.+2`, so no ambiguity is
reintroduced.

### Why R109 needs a tiebreaker?

Because "dominant block" was previously "block with the most rows", with
ties going to the first iterated. In files where a metadata header and a
data block have the same row count (synthetic test cases), the wrong
block could win dominance and silently disable the garbage filter. The
tiebreaker (prefer more rows, then wider) makes the decision
deterministic regardless of iteration order, and the merge-fallback
guard prevents a wide-but-short header from discarding a narrow data
block.

### Why hybrid SVG/Canvas?

Because SVG is crisp for axes, grid, and text, but slow for dense data
(thousands of DOM nodes). Canvas is fast for dense data but rasterized.
The hybrid gives vector-sharp axes and 60fps interaction on 100,000+
point files.

### Why MinMaxLTTB?

Because LTTB preserves visual peaks better than averaging, and MinMax
pre-selection makes LTTB ~30x faster. Together they allow 100k-point
files to render in <100ms while preserving the shape of every peak.

### Why binary search for zoom?

Because without it, every mousemove during pan iterates the full dataset
(100k points) to recompute Y bounds. Binary search reduces that to
O(log n) to find visible range, then only the visible points are
processed. This is the difference between laggy and smooth.

### Why per-axis undo?

Because if the user shifts X and then Y, the global undo reverts Y (the
last step). To revert X specifically, they need `undoAxis('x')` which
walks back to the last step that affected X. This gives independent
control per axis without a complex tree.

### Why force-SVG export mode?

Because Canvas is invisible to SVG serialization. If the user has a
massive file, exporting would produce an SVG with only the axes (no data
lines). Forcing SVG in export mode (with a higher downsample budget)
ensures the exported file is complete and vector-sharp.

### Why YAML?

Because it is machine-readable, human-editable, and future-proof. When
the scientific pipeline lands (Savitzky-Golay, baseline, peak picking —
see `ROADMAP.md` Area 3), the same YAML will hold the pipeline
configuration alongside the visual configuration. One file = one
reproducible analysis.

### Why diagnostic codes instead of strings?

So the compiler is language-agnostic. The UI translates via `i18n.js`.
