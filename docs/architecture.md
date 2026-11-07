# Vispectra Architecture

## Overview

Vispectra reads messy spectroscopy files — UV-Vis, XRD, XPS, Raman, IR — with different dialects, variable headers, and mixed separators, and converts them into clean numerical columns, ready for plotting and publication.

It does this in independent phases, each with a clear responsibility, communicating through explicit contracts. The compiler does not guess: it infers structure, validates against a contract, and when it cannot decide, it fails with a clear diagnostic instead of silently producing corrupt data.

All phases return a named object, except `08_codegen`, which directly mutates `columns` and returns nothing. Phases that can emit diagnostics include them in their output under the `diagnostics` key; phases that emit nothing return `diagnostics: []` for consistency.

## Pipeline

```
[File]
    ↓
[00_reading]         → text + diagnostics
    ↓
[01_sampling]        → lines, centralBlock, sample + diagnostics
    ↓
[02_lexer]           → literal structure per line (n / z / v / ,) + diagnostics
    ↓
[03_ir]              → totalCount + frequencies + lengths + diagnostics
    ↓
[04_canon]           → literal canon + blocks (grouped by comma pattern) + body
    ↓
[04b_disambiguation] → per-block candidate resolutions + hasAmbiguity
    ↓
[04c_block_canon]    → per-block abstract canon (n / z / i / v) + completeness
    ↓
[05_fixation]        → per-block executable plan (pattern + commaRoles + columnTypes)
    ↓
[06_parser]          → values per line, driven by plan
    ↓
[07_semantics]       → verified values
    ↓
[08_codegen]         → filled columns (mutation)
    ↓
[09_diagnostics]     → diagnostics accumulator
    ↓
[Normalized data + diagnostics]
```

`main.js` orchestrates the pipeline. Each phase is a pure function (except `08_codegen`, which mutates `columns` by explicit design) and returns a named object. Diagnostics are accumulated in `09_diagnostics`.

## Two-Level Canonical Model

The canon operates at two distinct levels that must never be conflated:

1. **Literal canon (per row).** Transcription of a single line into the alphabet `n`, `z`, `v`, `,`. No comma is interpreted. `350.0,0.523,0.001` → `n,n,n`. `1,5` → `z,z`. `1,,3` → `z,,z`. `1.5, ,2.5` → `n,v,n`.

2. **Abstract canon (per block).** One symbol per column, describing the nature of that column across all rows of a block:
   - `n` — all non-empty values in the column are dot-decimals.
   - `z` — all non-empty values are integers.
   - `i` — mix of `n` and `z` in the same column (`MIXED_NOTATION` diagnostic).
   - `v` — column is entirely empty.

   Gaps (`v` in some rows but not others) do **not** change the column symbol. They are reported separately as `completeness: { filled, total, gapIndices }` and as a `COLUMN_GAPS` diagnostic.

The literal canon is produced by `02_lexer`. The abstract canon is produced by `04c_block_canon`, **after** the disambiguation phase has fixed the comma roles.

## Phase Contracts

### 00_reading

- **Function**: `readFile(file)`
- **Input**: `File`
- **Output**: `{ text: string, diagnostics: [diag] }`
- **Does**: reads and normalizes.
- **Possible diagnostics**: `BOM_DETECTED` (info).
- **Does NOT**: split into lines, filter, interpret.
- **Rules**: — (infrastructure phase).

### 01_sampling

- **Function**: `sample(text, rng = Math.random)`
- **Input**: `string`, optionally an injectable random generator.
- **Output**: `{ lines: [{index, content}], centralBlock: {start, end}, sample: [index], diagnostics: [diag] }`
- **Does**: splits into lines, calculates the central block `[start, end)`, and randomly samples lines within it.
- **Possible diagnostics**: `SAMPLING` (info).
- **Does NOT**: clean characters, build structure, generalize.
- **Rules**: R75, R76, R77.

### 02_lexer

- **Function**: `lex(line)`
- **Input**: `string` (raw line)
- **Output**: `{ structure: string, diagnostics: [diag] }`
- **Does**: transcribes the line into `n`, `z`, `v`, `,`. Consumes numbers atomically (via `tokenizer`). Preserves runs of commas. Emits `v` when a gap sits between two commas.
- **Does NOT**: interpret commas, apply parity, generalize, resolve anything.
- **Depends on**: `compiler/tokenizer.js`.

### 03_ir

- **Function**: `buildIR(structures)`
- **Input**: `[{index, structure}]`
- **Output**: `{ totalCount, frequencies, lengths, diagnostics }`
- **Does**: builds a frequency histogram of literal structures. `totalCount` replaces the previous `perLine` array (O(unique) memory).
- **Does NOT**: generalize, interpret.

### 04_canon

- **Function**: `buildCanon(ir, lines, centralBlock)`
- **Input**: IR, all lines, central block.
- **Output**: `{ canonLiteral, body, blocks, diagnostics }`
  - `canonLiteral`: the most frequent literal pattern.
  - `blocks`: `[{ pattern, instances, hasAmbiguity }]` — grouped by comma pattern (`n`/`z` normalized to `_`, `,` and `v` preserved).
- **Does**: computes the literal canon, expands the body from the center while matching any pattern seen in the sample, groups all body lines into blocks.
- **Ambiguity rule**: a block is ambiguous if its pattern contains ≥1 comma, no `v`, at least one `z`, and no `n`. (Dot-decimals and explicit empty slots disambiguate.)
- **Does NOT**: resolve ambiguity (`04b`), build abstract canon (`04c`).

### 04b_disambiguation

- **Function**: `detectAmbiguities(blocks, lines)`
- **Input**: blocks from `04_canon`, all lines.
- **Output**: `{ blocks, hasAmbiguity, diagnostics }`
  - `blocks[i].resolutions`: `[{ id, commas: ['dec'|'sep'], columns, isDefault }]`.
- **Does**: enumerates valid resolutions per block (`2^k` combinations, filtered by fusion safety), computes resulting column counts, assigns parity as default when valid.
- **Ambiguity propagation**: block is ambiguous if it has >1 valid resolution, or if it has 1 valid resolution that is not the default, or if its pattern contains consecutive commas.
- **Does NOT**: resolve, apply, or build abstract canon.

### 04c_block_canon

- **Function**: `buildBlockCanon(block, lines, resolution)`
- **Input**: block, all lines, chosen resolution (or `null` → synthesize all-`sep`).
- **Output**: `{ canon, columns, diagnostics }`
  - `canon`: `'n,n,n'`, `'i,z'`, etc.
  - `columns`: `[{ type: 'n'|'z'|'i'|'v', completeness: { filled, total, gapIndices } }]`.
- **Does**: applies the resolution to each row (via `applyResolution`), aggregates per column, emits `MIXED_NOTATION` and `COLUMN_GAPS` diagnostics.
- **Does NOT**: resolve ambiguity, decide column count (that comes from resolution).

### 05_fixation

- **Function**: `fixCanon(blockCanon, resolution, pattern)`
- **Input**: output of `04c`, chosen resolution, block pattern.
- **Output**: `{ plan: { pattern, commaRoles, columnTypes, numColumns } | null, diagnostics }`
- **Does**: validates inputs and packages them into a single `plan` object — the parser's executable spec.
- **Does NOT**: apply parity, re-derive column counts, interpret values.

### 06_parser

- **Function**: `parseLine(line, plan)`
- **Input**: `{ index, content }`, plan from `05_fixation`.
- **Output**: `{ index, ok, values: (number|null)[], diagnostics }`
- **Does**: walks the pattern left to right, consuming tokens from `tokenize(line)`. `_` consumes a number (or marks empty slot if none available). `v` consumes a gap. `,` with role `sep` finalizes the pending slot. `,` with role `dec` fuses the pending number with the next (requires both to be `/^\d+$/`, else `FUSION_UNSAFE`).
- **Does NOT**: resolve ambiguity, apply heuristics, inject defaults.
- **Depends on**: `compiler/tokenizer.js`.

### 07_semantics

- **Function**: `verify(parsed, fixedCanon)`
- **Input**: `{index, ok, values}`, `[token]`
- **Output**: `{ index, ok, values, diagnostics }`
- **Does**: validates that values comply with the canon. Detects R44 at the line level, R45, R46. Ambiguity policy (R70–R74).
- **Possible diagnostics**: `STRUCTURAL_PROHIBITION` (error), `MIXED_NOTATION` (warn).
- **Does NOT**: interpret, inject 0, fill columns.
- **Rules**: R30, R31, R44–R46, R70–R74.

### 08_codegen

- **Functions**: `createColumns(numColumn)`, `inject(values, columns)`
- **Input**: `numColumn` (number of columns); `[number | null]`, `[[number]]`
- **Output**: `columns` (mutated). `inject` returns nothing.
- **Does**: creates empty columns. Converts `null` to 0. Advances the column index only when a value is produced.
- **Does NOT**: interpret, validate.
- **Rules**: R31, R52–R56.
- **Mutation contract**: this phase is the **only** one that mutates `columns`. Its contract is: receives verified values, injects them, returns nothing. No other phase touches `columns`.

### 09_diagnostics

- **Function**: `createLog()`
- **Input**: diagnostics `{severity, code, params}`
- **Output**: accumulator with `add(d)`, `all()`, `bySeverity(s)`, `hasErrors()`
- **Does**: accumulates diagnostics. Does not translate, format, or display.
- **Does NOT**: decide parsing logic, modify data.
- **Rules**: R60–R69 (define which diagnostics are emitted, not how they are accumulated).

## Diagnostics Accumulator Structure

```js
// 09_diagnostics.js
export function createLog() {
  const entries = [];
  return {
    add(d) { entries.push(d); },
    all() { return entries; },
    bySeverity(s) { return entries.filter(e => e.severity === s); },
    hasErrors() { return entries.some(e => e.severity === 'error'); },
  };
}
```

Each diagnostic has the form:

```js
{
  severity: 'info' | 'warn' | 'error',
  code: 'MIXED_NOTATION',
  params: { line: 47, column: 2, value: '0,7' }
}
```

The compiler never emits localized strings. It emits stable codes and parameters. Translation to human-readable text occurs in the UI layer, via `i18n.js` and `locales/`.

## Layers Outside the Compiler

### main.js

Orchestrates the pipeline. Does not implement logic. Collects diagnostics from each phase using the `collect` helper and accumulates them in the log. Stores intermediate results in loose variables (not in a global state object).

### ui.js

Captures files, calls `main.js`, displays results. Implements the hybrid layer (R80–R83): when the compiler detects more than 2 columns, the UI asks the user what each one means. This layer does not live inside the compiler; it consumes its results and acts.

### i18n.js

Translates diagnostic codes to localized strings. Consumes `locales/{en,es}.js`. Does not live in the compiler. The base language is `en`.

### plot.js

Plots the normalized columns. Consumes `columns` and, if the UI assigned roles, uses them to label axes and series.

## System Invariants

- The dot is always a decimal separator, never a column separator.
- The comma is the only character that can be a value or a structure.
- The number of commas is constant between lines of the same file.
- The canon is inferred from the central block and expands outwards until it fails. The extremes may not comply (preamble or residue).
- The data body is the contiguous region where the canon holds.
- The canon is fixed after `04_canon` and does not change during parsing.
- Each canon symbol consumes exactly one token, one separator, or nothing (only empty `i`).
- Diagnostics are codes + parameters, never localized strings.
- Only `08_codegen` mutates `columns`.

## Design Decisions

### Why a phase pipeline?

Each phase is testable in isolation. Errors are localized to the phase that produces them. The glue between phases lives in `main.js` and is trivial.

### Why is the canon fixed?

To make the parser deterministic. A canon that changes between lines is unpredictable and prone to silent errors. The generalization phase (`04_canon`) runs on the sample; once fixed, it is applied to all lines.

### Why `i` as an anchor?

Because global parity is not enough when there are empty slots or ambiguous runs. `i` fixes the phase locally: the comma adjacent to an `i` is a separator by definition, and from there parity propagates.

### Why diagnostic codes instead of strings?

So the compiler is language-agnostic. The UI translates. Adding a language is adding a file in `locales/`, not touching the core.

### Why mutate columns instead of returning new ones?

Efficiency and simplicity. Mutating an array of arrays is O(1) per line; returning new ones is O(n) per line. The discipline is that **only** `08_codegen` mutates. Documented in the phase contract.

### Why is the log an injected accumulator and not a global state?

Phases are pure: they receive input, return output. Diagnostics go in the output (`diagnostics: [...]`). `main.js` accumulates them. This way a phase can be tested without building a log, and the log does not contaminate the contract.

### Why names in Spanish for functions and variables?

The mental flow of the project was originally in Spanish. File names follow technical conventions, and the internal code was written in Spanish (e.g., `interpretarLinea`, `verificar`, `inyectar`). *Note: The project is currently transitioning to English for all new code, refactoring, and documentation to align with open-source and scientific standards.*

### Why random sampling?

Because it gives an initial idea of the structure without committing to a pattern. The final canon is deterministic because it is built by evaluating all lines against the tentative canon, not because sampling is. The `rng` is injectable to allow reproducible tests without sacrificing randomness in production.

### Why expansion from the center?

Because the central block is where there is most likely only data. Expanding outwards while the canon holds delimits the data body empirically: where it fails, there is the preamble or residue. It does not need a fixed threshold or assume how many header lines there are.

### Why not thousands notation?

Out of scope (R84). It can be added as a previous layer if needed. It breaks comma counting and requires a normalization phase before the lexer.

## Data Processing and Batch Execution (Planned)

### Philosophy: Exploration vs. Production

Vispectra recognizes two distinct modes of interaction for the scientist:
1.  **Exploration (UI-driven):** Interactive visualization, manual parameter tweaking, and visual inspection of individual files.
2.  **Production (Script-driven):** Batch processing of entire directories using a predefined, reproducible configuration file.

The UI is for exploration; the script is for producing publication-ready data. A scientist should not have to manually click through 50 menus to process 50 spectra. They define the treatment once, attach the configuration file, and execute.

### Phase 10: Data Treatment Engine

After the compiler finishes its pipeline (Phases 00–09), the resulting `columns` array is passed to a **Data Treatment Engine** (planned for a future version).

This engine will perform mathematical operations on the raw numerical data, guided entirely by a configuration file provided by the user.

#### Supported Operations (Planned)
-   **Smoothing:** Moving average, Savitzky-Golay filters.
-   **Baseline Correction:** Linear interpolation based on user-defined anchor points.
-   **Normalization:** Maximum peak, min-max scaling, or vector normalization.
-   **Technique-Specific:** Peak detection (Raman/XRD), derivative spectroscopy (UV-Vis).

#### Configuration Format: YAML / JSON

The engine will consume a declarative configuration file (likely `.yaml` or `.json`), which acts as a machine-readable "Materials and Methods" section. 

Example of a planned UV-Vis configuration (`treatment.yaml`):
```yaml
technique: UV-Vis
operations:
  - type: baseline_correction
    method: linear
    anchors: [350, 800] # Wavelengths where absorbance should be zero
  - type: smoothing
    method: savitzky_golay
    window: 11
    polynomial_order: 2
  - type: normalization
    method: max_peak
```

#### Batch Processing
The UI will allow the user to drop an entire folder of spectroscopic files alongside the configuration file. Vispectra will compile every file, apply the identical treatment script to all of them, and offer a unified export (e.g., a clean CSV containing all processed spectra).

#### Zero-Dependency Constraint
To maintain the browser-native, local-first philosophy, all mathematical operations (smoothing, baseline, etc.) and the YAML parser must be implemented in Vanilla JavaScript without external heavy libraries (like TensorFlow.js or math.js). Only lightweight, auditable code is permitted.

## Out of Scope

- **R84**: thousands notation (`1.234,56`).
- **R85**: literal missing values (`NaN`, `---`, `>3.0`).
- **R86**: rows split across multiple lines.
- **R87**: units attached to numbers (`250nm`).
- **R88**: comments at the end of lines.

## Retired in v5.0

- `i` as a wildcard in the per-row canon. Reintroduced with a different meaning in the abstract canon (mixed notation).
- `c` as a token emitted by the lexer. Comma-decimal notation is now a *resolution* decided in `04b`, not a property the lexer assigns.
- `u` as a token. Replaced by per-block resolutions.
- Parity rules in `05_fixation`. Moved to `04b` as the default resolution.
- `fixedCanon` as an array of tokens. Replaced by `plan` (per block).
- `perLine` in `03_ir`. Replaced by `totalCount` and `frequencies`.
- Fast-fail in the lexer (`[0-9][.,][0-9]`). The lexer now transcribes every line; metadata filtering is implicit in the block grouping.
- `null → 0` injection in `08_codegen`. Pending rewrite; `null` will be preserved.
- `04a_column_typing` (never implemented). Its function is subsumed by `04c_block_canon`.
