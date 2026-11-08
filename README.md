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

The project is divided into four independent layers:

**1. Compiler (`src/compiler/`)**
A pipeline of pure functions (00 to 09) that transforms raw text into clean numerical columns.

    00_reading            -> text normalization and BOM handling
    01_sampling           -> extraction of the central block and random sampling
    02_lexer              -> structural classification of tokens (n, z, |, ,)
    03_ir                 -> intermediate representation and frequency analysis
    04_canon              -> grammar inference and center-out expansion
    04b_disambiguation    -> candidate resolutions and garbage filtering
    04c_block_canon       -> abstract column typing (n, z, i, v)
    05_fixation           -> plan generation for the parser
    06_parser             -> line-by-line extraction using the fixed plan
    07_semantics          -> structural validation and ambiguity resolution
    08_codegen            -> column population (null-preserving)
    09_diagnostics        -> centralized diagnostic accumulator

**2. Visualization Engine (`src/plot/`)**
A modular, high-performance rendering engine with hybrid SVG/Canvas rendering.

    state.js              -> centralized graph state (zoom, limits, styles, frame)
    axes.js               -> tick generation (Linear/Log10, Auto/Count/Step/Nice)
    renderer.js           -> hybrid SVG/Canvas rendering with clipping
    downsampler.js        -> MinMaxLTTB algorithm for massive datasets
    interaction.js        -> box zoom, pan, crosshair, and pin logic
    controls.js           -> floating toolbar for zoom navigation
    index.js              -> orchestrator: drawPlot + range panel update

**3. Services (`src/services/`)**
Pure logic that the UI consumes.

    columns.js            -> column deduplication (null-aware)
    pipeline.js           -> math pipeline application (immutable)
    export.js             -> SVG / PNG / JPEG / PDF / CSV export
    yaml.js               -> minimal YAML parser + stringifier
    config.js             -> state <-> YAML bridge

**4. User Interface (`src/ui/` + `ui.js`)**
Modular DOM components for the browser.

    ui/rolePanel.js       -> Y-series selection, colors, styles, inline labels
    ui/pipelinePanel.js   -> math pipeline operation builder
    ui/axesPanel.js       -> axis scale, mode, format, minors
    ui/framePanel.js      -> canvas presets, custom dimensions, frame modes
    ui/configPanel.js     -> YAML save / load / apply
    ui/rangePanel.js      -> editable view limits, per-axis shift, undo, reset
    ui/disambiguationModal.js -> comma disambiguation
    ui/columnsModal.js    -> duplicate column collapsing
    ui.js                 -> orchestrator (event wiring + state updates)

## Implementation Status

**Current Version:** `v0.5.0-alpha-dev` (Visualization Complete, Config System Ready)

**Canonical model (v5.7):** Two-level canon.

- **Literal canon (per row):** `n` (dot-decimal), `z` (integer), `,` (literal comma), `|` (hard separator).
- **Abstract canon (per block):** `n` / `z` / `i` / `v`, one symbol per column.

**Status:**

- **Compiler:** Fully functional (00-09). Handles American, European, sparse, and wide-format files with automatic garbage filtering.
- **Visualization Engine:** Modularized into `src/plot/`. Features Log/Linear scales, dynamic tick generation, interactive Box Zoom/Pan, crosshair tooltips, custom styling (colors/dashes), smart legend positioning, frame presets, and per-axis view control.
- **Performance:** Integrated MinMaxLTTB downsampling and binary search, allowing smooth rendering of 100,000+ point datasets in the browser.
- **Configuration:** YAML serialization of the entire visual state (frame, axes, graph, series, view limits). Configurations can be saved, loaded, and applied to reproduce the exact same visualization across files.
- **UI:** Modularized into `src/services/` and `src/ui/`. Complete i18n (English + Spanish).

## Key Features

**Robust Parsing:**

- Handles American (`.` decimal, `,` separator) and European (`,` decimal, `;` separator) formats.
- Automatically detects and ignores metadata headers.
- Pads missing columns with `null` (never `0`).
- Provides interactive disambiguation when the file structure is truly ambiguous.

**Publication-Ready Visualization:**

- **Scales:** Linear and Log10.
- **Ticks:** Auto (nice numbers), Fixed Count, Exact Step, or Forced Nice Step.
- **Grid:** Major and minor grid lines with optional labels.
- **Legend:** Placed inside (4 corners, vertical/horizontal layout) or outside (Right Columns, Bottom Rows). The plot area never compresses; the SVG expands to accommodate the legend.
- **Frame:** 7 presets (16:10, 16:9, 21:9, A4 landscape, 1:1, A4 portrait, 9:16) plus custom dimensions (200-3000px). Three modes: Stretch (fill), Extend (show more data when bigger), Crop (show less data when smaller).
- **Interactivity:** Box Zoom, Pan, Crosshair, and Pin (click to freeze crosshair). Double-click to reset.
- **Performance:** Binary search isolates visible data points during zoom; MinMaxLTTB reduces massive datasets while preserving peak shapes.
- **View Limits:** Editable min/max inputs for each axis, deterministic shifts (Δ), and per-axis undo/reset.

**Reproducibility (YAML):**

- Save the entire visual state as a `.yaml` file.
- Load a `.yaml` file and apply it to any file to reproduce the same view.
- Includes frame dimensions, axis configuration, series styles, legend settings, and current zoom range.

## Usage & Deployment

The compiler is designed to run locally. To start the development environment:

    git clone https://github.com/edgar-castillo-sci/Vispectra.git
    cd Vispectra
    npm run dev

Access the local server in your browser and drop a spectroscopic file into the interface. Drag and drop is supported. The file will be parsed, plotted, and ready for analysis.

## License and Open Science

Vispectra is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

This license was chosen to ensure that any modifications to the compiler—including those used to provide network services—remain open-source. The AGPL-3.0 protects the scientific core from proprietary forks. For commercial or proprietary integration, dual-licensing negotiations are available by contacting the author.

## References

- Gold, E. M. (1967). *Language identification in the limit*. Information and Control, 10(5), 447-474. https://doi.org/10.1016/S0019-9958(67)91165-5

## Citation

Coming soon...

## Author

**Edgar Castillo**  
Independent Researcher  
[ORCID: 0009-0006-4268-3323](https://orcid.org/0009-0006-4268-3323)
