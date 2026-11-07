# Vispectra Architecture

## Overview

Vispectra reads messy spectroscopy files — UV-Vis, XRD, XPS, Raman, IR — with different dialects, variable headers, and mixed separators, and converts them into clean numerical columns, ready for plotting and publication.

It does this in independent phases, each with a clear responsibility, communicating through explicit contracts. The compiler does not guess: it transcribes, groups, and only interprets when the user authorizes it. When it cannot decide honestly, it fails explicitly with a typed diagnostic instead of silently producing corrupt data.

All phases return a named object, except `08_codegen`, which directly mutates `columns` and returns nothing. Phases that can emit diagnostics include them in their output under the `diagnostics` key; phases that emit nothing return `diagnostics: []` for consistency.

## Two-Level Canonical Model

The canon operates at two distinct levels that must never be conflated.

### Level 1 — Literal canon (per row)

Transcription of a single line into the alphabet `n`, `z`, `v`, `,`. No comma is interpreted at this level.

| Symbol | Meaning |
|---|---|
| `n` | Number with a decimal point |
| `z` | Number without a decimal point (integer raw) |
| `v` | Explicit empty slot (gap between two commas) |
| `,` | Literal comma |

Examples:

| Line | Literal canon |
|---|---|
| `350.0,0.523,0.001` | `n,n,n` |
| `350,0;0,523;0,001` | `z,z,z,z,z,z` |
| `1.5 2.5` | `n,n` |
| `1,5` | `z,z` |
| `1,,3` | `z,,z` |
| `1.5, ,2.5` | `n,v,n` |

The literal canon is produced by `02_lexer`. It contains no heuristics.

### Level 2 — Abstract canon (per block)

One symbol per column, describing the nature of that column across all rows of a block.

| Symbol | Meaning |
|---|---|
| `n` | All non-empty values in the column are `n` (dot-decimal) |
| `z` | All non-empty values in the column are `z` (integer) |
| `i` | Mix of `n` and `z` in the same column (`MIXED_NOTATION` diagnostic) |
| `v` | Column is entirely empty |

Gaps (`v` in some rows but not others) do NOT change the column symbol. They are reported separately as `completeness: { filled, total, gapIndices }` and as a `COLUMN_GAPS` diagnostic.

The abstract canon is produced by `04c_block_canon`, AFTER the disambiguation phase has fixed the comma roles.

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
    [02_lexer]           -> literal structure per line (n / z / v / ,) + diagnostics
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

`main.js` orchestrates the pipeline. Each phase is a pure function (except `08_codegen`, which mutates `columns` by explicit design) and returns a named object. Diagnostics are accumulated in `09_diagnostics`.

## Phase Contracts

### 00_reading

- **Function**: `readFile(file)`
- **Input**: `File`
- **Output**: `{ text: string, diagnostics: [diag] }`
- **Does**: reads and normalizes (BOM strip, line-ending normalization).
- **Possible diagnostics**: `BOM_DETECTED` (info).
- **Does NOT**: split into lines, filter, interpret.
- **Rules**: infrastructure phase.

### 01_sampling

- **Function**: `sample(text, rng = Math.random)`
- **Input**: string, optionally an injectable random generator.
- **Output**: `{ lines: [{index, content}], centralBlock: {start, end}, sample: [index], diagnostics: [diag] }`
- **Does**: splits into lines, calculates the central block `[start, end)`, and randomly samples lines within it.
- **Possible diagnostics**: `SAMPLING` (info).
- **Does NOT**: clean characters, build structure, generalize.
- **Rules**: R75, R76, R77, R79.

### 02_lexer

- **Function**: `lex(line)`
- **Input**: string (raw line)
- **Output**: `{ structure: string, diagnostics: [diag] }`
- **Does**: transcribes the line into `n`, `z`, `v`, `,`. Consumes numbers atomically (via `tokenizer`). Preserves runs of commas. Emits `v` when a gap sits between two commas.
- **Does NOT**: interpret commas, apply parity, generalize, resolve anything.
- **Depends on**: `compiler/tokenizer.js`.
- **Rules**: R1-R6, R96.

### tokenizer (shared module)

- **Function**: `tokenize(line)`
- **Input**: string (raw line)
- **Output**: array of tokens, each `{ type: 'number'|'comma'|'gap', ... }` with position fields.
- **Does**: single-pass lexing into typed tokens with positions. Numbers are consumed atomically (sign + mantissa + optional exponent). `.5` is a number. Incomplete exponents fall back to gap.
- **Does NOT**: interpret commas, classify structure.
- **Consumed by**: `02_lexer` and `06_parser`. Single source of truth for lexical structure.

### 03_ir

- **Function**: `buildIR(structures)`
- **Input**: `[{index, structure}]`
- **Output**: `{ totalCount, frequencies, lengths, diagnostics }`
- **Does**: builds a frequency histogram of literal structures. `totalCount` replaces the previous `perLine` array (O(unique) memory).
- **Possible diagnostics**: `HETEROGENEOUS_STRUCTURES` (warn) if all sampled structures are distinct and there is no clear pattern.
- **Does NOT**: generalize, interpret.

### 04_canon

- **Function**: `buildCanon(ir, lines, centralBlock)`
- **Input**: IR, all lines, central block.
- **Output**: `{ canonLiteral, body, blocks, diagnostics }`
  - `canonLiteral`: the most frequent literal pattern in the sample.
  - `body`: `{ start, end }` — contiguous data region.
  - `blocks`: `[{ pattern, instances, hasAmbiguity }]` — grouped by comma pattern (`n`/`z` normalized to `_`, `,` and `v` preserved).
- **Does**: computes the literal canon, expands the body from the center while matching any pattern seen in the sample, groups ALL body lines into blocks by comma pattern.
- **Ambiguity rule**: a block is ambiguous if its pattern contains at least one comma, no `v`, at least one `z`, and no `n`. (Dot-decimals and explicit empty slots disambiguate.)
- **Possible diagnostics**: `PREAMBLE_DETECTED` (info), `RESIDUE_DETECTED` (info), `BODY_LIMITATION` (warn).
- **Does NOT**: resolve ambiguity (`04b`), build abstract canon (`04c`).
- **Rules**: R89-R95, R98, R99.

### 04b_disambiguation

- **Function**: `detectAmbiguities(blocks, lines)`
- **Input**: blocks from `04_canon`, all lines.
- **Output**: `{ blocks, hasAmbiguity, diagnostics }`
  - `blocks[i].resolutions`: `[{ id, commas: ['dec'|'sep'], columns, isDefault }]`.
- **Does**: enumerates valid resolutions per block (2^k combinations, filtered by fusion safety and structural prohibitions), computes resulting column counts, assigns parity as default when valid.
- **Ambiguity propagation**: block is ambiguous if it has more than one valid resolution, or if it has one valid resolution that is not the default, or if its pattern contains consecutive commas.
- **Possible diagnostics**: `BLOCK_TOO_COMPLEX` (error), `NO_VALID_RESOLUTION` (error).
- **Does NOT**: resolve, apply, or build abstract canon.
- **Rules**: R44-R46, R97, R99.

### 04c_block_canon

- **Function**: `buildBlockCanon(block, lines, resolution)`
- **Input**: block, all lines, chosen resolution (or `null` -> synthesize all-`sep`).
- **Output**: `{ canon, columns, diagnostics }`
  - `canon`: e.g. `'n,n,n'`, `'i,z'`.
  - `columns`: `[{ type: 'n'|'z'|'i'|'v', completeness: { filled, total, gapIndices } }]`.
- **Does**: applies the resolution to each row (via `applyResolution`), aggregates per column, emits `MIXED_NOTATION` and `COLUMN_GAPS` diagnostics.
- **Possible diagnostics**: `MIXED_NOTATION` (info), `COLUMN_GAPS` (info), `RESOLUTION_LENGTH_MISMATCH` (error), `RESOLUTION_MISMATCH` (error), `BLOCK_COUNT_MISMATCH` (error).
- **Does NOT**: resolve ambiguity, decide column count (that comes from resolution).
- **Rules**: R101-R103.

### 05_fixation

- **Function**: `fixCanon(blockCanon, resolution, pattern)`
- **Input**: output of `04c`, chosen resolution, block pattern.
- **Output**: `{ plan: { pattern, commaRoles, columnTypes, numColumns } | null, diagnostics }`
- **Does**: validates inputs and packages them into a single `plan` object — the parser's executable spec.
- **Possible diagnostics**: `RESOLUTION_LENGTH_MISMATCH` (error), `MISSING_BLOCK_CANON` (error).
- **Does NOT**: apply parity, re-derive column counts, interpret values.
- **Rules**: R104.

### 06_parser

- **Function**: `parseLine(line, plan)`
- **Input**: `{ index, content }`, plan from `05_fixation`.
- **Output**: `{ index, ok, values: (number|null)[], diagnostics }`
- **Does**: walks the pattern left to right, consuming tokens from `tokenize(line)`. `_` consumes a number (or marks empty slot if none available). `v` consumes a gap (verifies no number). `,` with role `sep` finalizes the pending slot. `,` with role `dec` fuses the pending number with the next (requires both to be plain digits, else `FUSION_UNSAFE`).
- **Possible diagnostics**: `EXPECTED_COMMA` (error), `DEC_WITHOUT_LEFT_VALUE` (error), `EXPECTED_NUMBER_AFTER_DEC` (error), `FUSION_UNSAFE` (error), `UNEXPECTED_NUMBER_IN_V_SLOT` (error), `EXTRA_TOKENS` (error), `COLUMN_COUNT_MISMATCH` (error).
- **Does NOT**: resolve ambiguity, apply heuristics, inject defaults.
- **Depends on**: `compiler/tokenizer.js`.
- **Rules**: R48-R56 (reformulated for the `plan` model).

### 07_semantics

- **Function**: `verify(parsed, plan)`
- **Input**: `{ index, ok, values, diagnostics }`, plan.
- **Output**: `{ index, ok, values, diagnostics }`
- **Does**: validates `values.length === plan.numColumns` (defensive), validates each non-null value is finite, rejects values in a `v` column.
- **Possible diagnostics**: `SEMANTIC_COUNT_MISMATCH` (error), `INVALID_NUMERIC_VALUE` (error), `VALUE_IN_EMPTY_COLUMN` (error).
- **Does NOT**: emit `MISSING_VALUE` (gaps are aggregated in `04c` as `COLUMN_GAPS`), enforce integer on `z` columns (exponents like `1e-2` are `z` by raw, non-integer by value, both valid), interpret units/ranges/physics.
- **Rules**: R60-R69 (which diagnostics are emitted, not how they are accumulated).

### 08_codegen

- **Functions**: `createColumns(numColumns)`, `inject(values, columns)`
- **Input**: `numColumns`; `(number|null)[]`, `[[number|null]]`.
- **Output**: `columns` (mutated). `inject` returns nothing.
- **Does**: creates empty columns. Pushes each value into its column, preserving `null` as `null` (not 0). Throws on length mismatch (orchestration bug).
- **Does NOT**: interpret, validate, or decide what to do with failed rows.
- **Rules**: R100.
- **Mutation contract**: this phase is the only one that mutates `columns`. Its contract is: receives verified values, injects them, returns nothing. No other phase touches `columns`.

### 09_diagnostics

- **Function**: `createLog()`
- **Input**: diagnostics `{severity, code, params}`
- **Output**: accumulator with `add(d)`, `all()`, `bySeverity(s)`, `hasErrors()`.
- **Does**: accumulates diagnostics. Does not translate, format, or display.
- **Does NOT**: decide parsing logic, modify data.
- **Rules**: R60-R69 (define which diagnostics are emitted, not how they are accumulated).


## Diagnostics Accumulator Structure

    09_diagnostics.js
    export function createLog() {
      const entries = [];
      return {
        add(d) { entries.push(d); },
        all() { return entries; },
        bySeverity(s) { return entries.filter(e => e.severity === s); },
        hasErrors() { return entries.some(e => e.severity === 'error'); },
      };
    }

Each diagnostic has the form:

    {
      severity: 'info' | 'warn' | 'error',
      code: 'MIXED_NOTATION',
      params: { line: 47, column: 2, value: '0,7' }
    }

The compiler never emits localized strings. It emits stable codes and parameters. Translation to human-readable text occurs in the UI layer, via `i18n.js` and `locales/`.

## Layers Outside the Compiler

### main.js

The orchestrator. Implements no phase logic. Consumes each phase's output, threads it to the next phase, and packages the final result into a `CompileResult`. Stateless: every `compile()` call re-reads and re-processes the file from scratch.

#### Contract

    compile(file, options) -> CompileResult

**Options:**

- `resolutions`: `undefined | 'auto' | { [pattern]: ('sep'|'dec')[] }`
  - `undefined` (default): if ambiguity is detected, returns `status: 'needs_disambiguation'` without processing.
  - `'auto'`: uses each block's default resolution silently. For scripts and batch processing.
  - `{ pattern: [...] }`: explicit resolution map. Unknown patterns fall back to defaults.
- `maxFailureRatio`: `number`, default `0.20`. If the fraction of body rows that fail parse or verify exceeds this, `status: 'failed'` and `columns: null`.

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

**Status semantics:**

| Status | Meaning |
|---|---|
| `ok` | All body rows parsed and verified. `columns` fully populated. |
| `partial` | Some rows failed, below `maxFailureRatio`. Failed rows filled with `null` in every column. |
| `failed` | Structural error (count mismatch, no valid resolution, no body) or failure ratio exceeded. `columns: null`. |
| `needs_disambiguation` | At least one block is ambiguous and no `resolutions` were provided. |

#### Failure policy

- Failed rows push `null` into every column. Alignment is preserved; post-processing (plotting, CSV) is safe.
- Each failed row emits `ROW_SKIPPED` (info) with `index` and the originating error code.
- No silent drops. Every row is either populated or explicitly nulled with a diagnostic.
- `maxFailureRatio` is the "don't process" gate. Above it, `status: 'failed'` and `columns: null`.

#### Segments

`segments` is always present (empty for `failed` and `needs_disambiguation`). Each segment describes a run of consecutive rows that share the same block and resolution:

    {
      startRow: number,          // inclusive, original line index
      endRow: number,            // exclusive
      pattern: string,           // '_,_,_'
      resolution: ('sep'|'dec')[],
      canon: string,             // 'n,n,n'
      isException: boolean,      // true if not the dominant segment
    }

`isException` is set on every segment other than the one with the largest row span. This is the audit trail.

#### Statelessness and re-entry

`compile()` holds no cache between calls. The user can:

1. Call `compile(file)` -> get `needs_disambiguation`.
2. Call `compile(file, { resolutions: A })` -> see result.
3. Call `compile(file, { resolutions: B })` -> compare.

Reproducibility is exact: same file + same `resolutions` -> bit-identical output. No resume token, no intermediate state.

### ui.js

Captures files, calls `main.js`, displays results. Implements the hybrid layer (R80-R83): when the compiler detects more than 2 columns, the UI asks the user what each one means. Handles the `needs_disambiguation` status by opening the interactive editor. This layer does not live inside the compiler; it consumes its results and acts.

### i18n.js

Translates diagnostic codes to localized strings. Consumes `locales/{en,es}.js`. Does not live in the compiler. The base language is `en`.

### plot.js

Plots the normalized columns. Consumes `columns` and, if the UI assigned roles, uses them to label axes and series.

## System Invariants

- The dot is always a decimal separator, never a column separator.
- The comma is the only character that can be a value or a structure.
- The literal canon is a transcription: it does not interpret commas.
- The abstract canon describes columns, not rows. Built after disambiguation.
- Ambiguity is resolved only by `04b_disambiguation`, never by the lexer, canon, or parser.
- The data body is the contiguous region where the canon holds.
- Each canon symbol consumes exactly one token, one separator, or nothing (only `v`).
- Diagnostics are codes + parameters, never localized strings.
- Only `08_codegen` mutates `columns`.
- Same file + same `resolutions` -> bit-identical output (reproducibility).

## Design Decisions

### Why two levels of canon?

Because the nature of a row (which tokens are on that line) and the nature of a column (which token types appear across all rows) are different questions. Conflating them (as v4.0 did) loses the column-level information needed for diagnostics (`MIXED_NOTATION`, `COLUMN_GAPS`) and for meaningful UI reporting.

### Why a literal canon?

Because comma interpretation is not the lexer's job. `350,0;0,523` is genuinely ambiguous at the line level (3 decimals or 6 integers?). Only the file context (do other rows have dots? what's the expected column count?) can decide. That context lives in `04b`, not in the lexer.

### Why `v` as an explicit symbol?

Because `z,,z` (adjacent commas, ambiguous run) and `z,v,z` (explicit empty slot, unambiguous) are different. Conflating them loses the information that the user deliberately left a slot empty (with a space) versus two commas accidentally adjacent.

### Why `i` in the abstract canon but not in the literal canon?

In the literal canon, `i` was a wildcard that hid information. In the abstract canon, `i` means "this column mixes dot-decimals and integers", which is a real diagnostic fact (`MIXED_NOTATION`). Different semantics, different level.

### Why is the canon fixed per block, not per file?

Because different regions of the same file can have different structures (preamble, data, residue, or genuinely different tables). Forcing a single canon across the file hides structural inconsistency. Per-block fixation plus a `BLOCK_COUNT_MISMATCH` check enforces global coherence at the column level while allowing local variation at the resolution level.

### Why a `plan` instead of a `fixedCanon`?

`fixedCanon` was an array of tokens the parser walked. `plan` is a richer object: pattern + commaRoles + columnTypes + numColumns. The parser needs all four: pattern for structure, commaRoles for fusion decisions, columnTypes for output typing, numColumns for length checks. Packaging them together makes the contract explicit.

### Why stateless re-entry for disambiguation?

Because re-reading and re-processing a typical spectroscopy file (KB-MB, thousands of rows) takes milliseconds. A resume token would add hidden state with no measurable benefit, and would break reproducibility (same inputs must always produce the same output).

### Why `segments` in the output?

Because the user needs to audit what the compiler did with their data. If 2 rows were interpreted with a different plan from the rest, that is a scientific fact the user must know. Without `segments`, the only way to discover it is row-by-line comparison against the exported CSV — infeasible for 100k rows.

### Why diagnostic codes instead of strings?

So the compiler is language-agnostic. The UI translates. Adding a language is adding a file in `locales/`, not touching the core.

### Why mutate columns instead of returning new ones?

Efficiency and simplicity. Mutating an array of arrays is O(1) per line; returning new ones is O(n) per line. The discipline is that only `08_codegen` mutates. Documented in the phase contract.

### Why is the log an injected accumulator and not a global state?

Phases are pure: they receive input, return output. Diagnostics go in the output. `main.js` accumulates them. This way a phase can be tested without building a log, and the log does not contaminate the contract.

### Why names in Spanish for functions and variables?

The mental flow of the project was originally in Spanish. File names follow technical conventions. The project is transitioning to English for all new code, refactoring, and documentation.

### Why random sampling?

Because it gives an initial idea of the structure without committing to a pattern. The final canon is deterministic because it is built by evaluating all lines against the tentative canon, not because sampling is. The `rng` is injectable to allow reproducible tests without sacrificing randomness in production.

### Why expansion from the center?

Because the central block is where there is most likely only data. Expanding outwards while the canon holds delimits the data body empirically: where it fails, there is the preamble or residue. It does not need a fixed threshold or assume how many header lines there are.

### Why not thousands notation?

Out of scope (R84). It can be added as a previous layer if needed. It breaks comma counting and requires a normalization phase before the lexer.

## Data Processing and Batch Execution (Planned)

### Philosophy: Exploration vs. Production

Vispectra recognizes two distinct modes of interaction for the scientist:

1. **Exploration (UI-driven):** Interactive visualization, manual parameter tweaking, and visual inspection of individual files.
2. **Production (Script-driven):** Batch processing of entire directories using a predefined, reproducible configuration file.

The UI is for exploration; the script is for producing publication-ready data. A scientist should not have to manually click through 50 menus to process 50 spectra. They define the treatment once, attach the configuration file, and execute.

### Phase 10: Data Treatment Engine

After the compiler finishes its pipeline (Phases 00-09), the resulting `columns` array is passed to a Data Treatment Engine (planned for a future version).

This engine will perform mathematical operations on the raw numerical data, guided entirely by a configuration file provided by the user.

#### Supported Operations (Planned)

- **Smoothing:** Moving average, Savitzky-Golay filters.
- **Baseline Correction:** Linear interpolation based on user-defined anchor points.
- **Normalization:** Maximum peak, min-max scaling, or vector normalization.
- **Technique-Specific:** Peak detection (Raman/XRD), derivative spectroscopy (UV-Vis).

#### Configuration Format: YAML / JSON

The engine will consume a declarative configuration file (likely `.yaml` or `.json`), which acts as a machine-readable "Materials and Methods" section.

Example of a planned UV-Vis configuration (`treatment.yaml`):

    technique: UV-Vis
    operations:
      - type: baseline_correction
        method: linear
        anchors: [350, 800]
      - type: smoothing
        method: savitzky_golay
        window: 11
        polynomial_order: 2
      - type: normalization
        method: max_peak

#### Batch Processing

The UI will allow the user to drop an entire folder of spectroscopic files alongside the configuration file. Vispectra will compile every file, apply the identical treatment script to all of them, and offer a unified export (e.g., a clean CSV containing all processed spectra).

For batch processing, `resolutions` should be set explicitly in the configuration to avoid the `needs_disambiguation` state:

    disambiguation:
      resolutions:
        '_,_': ['dec']
        '_,_,_': ['sep', 'sep']

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
- `c` as a token emitted by the lexer. Comma-decimal notation is now a resolution decided in `04b`, not a property the lexer assigns.
- `u` as a token. Replaced by per-block resolutions.
- Parity rules in `05_fixation`. Moved to `04b` as the default resolution.
- `fixedCanon` as an array of tokens. Replaced by `plan` (per block).
- `perLine` in `03_ir`. Replaced by `totalCount` and `frequencies`.
- Fast-fail in the lexer (`[0-9][.,][0-9]`). The lexer now transcribes every line; metadata filtering is implicit in the block grouping.
- `null` to `0` injection in `08_codegen`. `null` is preserved.
- `04a_column_typing` (never implemented). Its function is subsumed by `04c_block_canon`.
