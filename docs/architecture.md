# Vispectra Architecture

## Overview

Vispectra reads messy spectroscopy files — UV-Vis, XRD, XPS, Raman, IR — with different dialects, variable headers, and mixed separators, and converts them into clean numerical columns, ready for plotting and publication.

It does this in independent phases, each with a clear responsibility, communicating through explicit contracts. The compiler does not guess: it infers structure, validates against a contract, and when it cannot decide, it fails with a clear diagnostic instead of silently producing corrupt data.

All phases return a named object, except `08_codegen`, which directly mutates `columns` and returns nothing. Phases that can emit diagnostics include them in their output under the `diagnostics` key; phases that emit nothing return `diagnostics: []` for consistency.

## Pipeline

```
[File]
    ↓
[00_reading]      → text + diagnostics
    ↓
[01_sampling]     → lines, centralBlock, sample + diagnostics
    ↓
[02_lexer]        → structure per line + diagnostics
    ↓
[03_ir]           → assembled IR + diagnostics
    ↓
[04_canon]        → generalized canon + body {start, end} + diagnostics
    ↓
[05_fixation]     → fixed canon + diagnostics
    ↓
[06_parser]       → values per line + diagnostics
    ↓
[07_semantics]    → verified values + diagnostics
    ↓
[08_codegen]      → filled columns (mutation)
    ↓
[09_diagnostics]  → diagnostics accumulator
    ↓
[Normalized data + diagnostics]
```

`main.js` orchestrates the pipeline. Each phase is a pure function (except `08_codegen`, which mutates `columns` by explicit design) and returns a named object. Diagnostics are accumulated in `09_diagnostics`.

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
- **Input**: `string` (a raw line)
- **Output**: `{ structure: string, diagnostics: [diag] }`
- **Does**: removes digits and reserved symbols, classifies dots and commas, emits `structure` with symbols `n`, `c`, `,`.
- **Possible diagnostics**: `DOT_AFTER_NUMBER` (error), `CONSECUTIVE_DOTS` (error), `DOT_SEQUENCE` (warn), `COMMA_RUN` (info).
- **Does NOT**: apply parity, generalize, interpret values, fix.
- **Rules**: R7–R28.

### 03_ir

- **Function**: `buildIR(structures)`
- **Input**: `[{index, structure}]`
- **Output**: `{ perLine, frequencies, lengths, diagnostics: [diag] }`
- **Does**: groups and counts structures, prepares for generalization.
- **Possible diagnostics**: `HETEROGENEOUS_STRUCTURES` (warn) if all structures are different and there is no clear pattern.
- **Does NOT**: generalize, interpret, validate.
- **Rules**: — (aggregation phase).

### 04_canon

- **Function**: `buildCanon(ir, lines, centralBlock)`
- **Input**: IR, all lines in the file, central block `{start, end}`.
- **Output**: `{ canon: string, body: {start, end}, diagnostics: [diag] }`
- **Does**:
  - Builds the tentative canon from the central block.
  - Expands from the center outwards as long as the canon holds.
  - Delimits the data body: `[start, end]`.
  - Failures in the central block are errors; failures at the extremes define the body boundaries (preamble or residue).
- **Possible diagnostics**: `PREAMBLE_DETECTED` (info), `RESIDUE_DETECTED` (info), `CENTRAL_DIVERGENCE` (error), `BODY_LIMITATION` (warn).
- **Does NOT**: apply parity, fix, interpret values.
- **Rules**: R29–R46, R77 (expanded), R89–R95.
- **Note**: expansion uses `lex` to get the structure of each line and a structural compatibility check against the tentative canon. It does not invoke `06_parser` to avoid forward dependency.

### 05_fixation

- **Functions**: `fixCanon(canon)`, `countColumns(fixedCanon)`
- **Input**: `string` (generalized canon)
- **Output**: `{ fixedCanon: [token], diagnostics: [diag] }`
- **Does**: applies base parity (R24) and `c,c,c` conversion (R26), fixes the canon as an array of tokens. `countColumns` counts value symbols (`n`, `c`, `i`) plus 1.
- **Does NOT**: generalize further, interpret values.
- **Rules**: R24, R26, R78.

### 06_parser

- **Function**: `parseLine(line, fixedCanon)`
- **Input**: `{index, content}`, `[token]`
- **Output**: `{ index, ok, values, diagnostics }`
  - `values`: `[number | null]`. `null` indicates absence.
  - If `ok: false`, `values` is not used.
- **Does**: iterates `fixedCanon` and extracts values from the line according to R48–R56. Local comma classification (R57–R59) only when the canon says `i`.
- **Possible diagnostics**: `CANON_MISMATCH` (error), `UNEXPECTED_COMMA` (error).
- **Does NOT**: validate, inject 0, fill columns.
- **Rules**: R1–R6, R48–R59.

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

## Out of Scope

- **R84**: thousands notation (`1.234,56`).
- **R85**: literal missing values (`NaN`, `---`, `>3.0`).
- **R86**: rows split across multiple lines.
- **R87**: units attached to numbers (`250nm`).
- **R88**: comments at the end of lines.
