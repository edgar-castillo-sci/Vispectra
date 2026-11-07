# Vispectra Rules

## 1. Tokens and numbers

- **R1.** Every numeric token is parsed as a real number. No distinction between "integer" and "decimal" as separate types.
- **R2.** Syntax of `token_n`: `[+-]? digits ( '.' digits? )? ( [eE] [+-]? digits )?`
- **R3.** Syntax of `token_c`: `[+-]? digits ( ',' digits? )? ( [eE] [+-]? digits )?`
- **R4.** `token_c` consumes the comma only if it is followed by digits.
- **R5.** The dot is always decimal, never a column separator.
- **R6.** Scientific notation is treated as an indivisible unit.

## 2. Two-Level Canonical Model

- **R96.** The literal canon (`n`, `z`, `v`, `,`, `|`) does not interpret commas. The comma is a structural character, not a decimal or column separator at this level.
- **R100.** `v` represents an explicit empty slot and is propagated as `null` to `08_codegen`. It is never injected as `0`.
- **R101.** The abstract canon (`n`, `z`, `i`, `v`) is built **after** disambiguation. It encodes the nature of each column, not of each row.
- **R102.** Individual gaps (`v` in some rows but not others) do not change the column type. They are reported as `completeness`.
- **R103.** Mix of `n` and `z` in the same column → type `i` + `MIXED_NOTATION` diagnostic (info).

## 3. Lexer rules (literal transcription)

- **R7.** The lexer transcribes a line into `n`, `z`, `v`, `,`, `|`. It does not interpret commas.
- **R8.** Numbers are consumed atomically: sign, mantissa, optional exponent.
- **R9.** `.5` (leading dot followed by digit) is a number.
- **R10.** An incomplete exponent (`1e`, `1e+`) is not consumed as part of the number; the `e` falls back to a gap.
- **R11.** Runs of commas are preserved. They are not collapsed.
- **R12.** Gaps between values with no adjacent comma emit `|` (hard separator).
- **R13.** Leading and trailing hard separators are ignored.

## 4. Comma semantics

- **R14.** The comma has no intrinsic meaning in the literal canon. It becomes a decimal separator (`dec`) or a column separator (`sep`) only after a resolution is applied in `04b`.
- **R15.** For a block with `k` commas, `2^k` combinations of `dec`/`sep` are candidates. A candidate is valid only if it is structurally compatible with every row of the block.
- **R16.** A `dec` fusion is valid only if both operands are `/^\d+$/` (no signs, no exponents). Otherwise the row fails with `FUSION_UNSAFE`.
- **R17.** All rows in a block must yield the same number of columns under the chosen resolution. Otherwise `BLOCK_COUNT_MISMATCH`.

## 5. Prohibitions

- **R44.** `in`, `cn`, `ci`, `ic` → immediate error (structural prohibition). Detected in canon inference (`04_canon`) and at the line level (`07_semantics`).
- **R45.** Between two value symbols (`n`, `z`, `i`), there must always be at least one separator.
- **R46.** Comma count varying between lines → error.
- **R62.** Error if the comma count varies between lines in the same block.
- **R63.** Error if the canon is not satisfied on a line.

## 6. Disambiguation rules

- **R97.** The parity heuristic lives only in `04b_disambiguation` as a default resolution.
- **R98.** A block is ambiguous if it contains at least one `z`, at least one comma, and no `n` in its rows.
- **R99.** Resolutions are grouped by comma pattern, not by full canon.
- **R70.** Do not guess silently.
- **R71.** If notations are mixed → warn.
- **R72.** Strict mode (abort) and permissive mode (parse, flag).
- **R73.** If ambiguity persists → error or ask the user.
- **R74.** Degradation to user intervention is the **default behavior**.

## 7. Parser rules (plan-driven)

- **R48.** The `plan` tells the parser what to look for and in what order.
- **R49.** `_` → consume one number token.
- **R50.** `v` → consume one gap token; verify no number is present.
- **R51.** `,` with role `sep` → consume one comma token; finalize the pending slot.
- **R52.** `,` with role `dec` → consume one comma token and the following number; fuse both.
- **R53.** `|` → consume one hard separator token; finalize the pending slot.
- **R54.** Trailing gaps are tolerated. Trailing numbers or commas → `EXTRA_TOKENS`.
- **R55.** The column index advances only when a value is produced.
- **R56.** Each canon symbol consumes exactly one token, one separator, or nothing.

## 8. Sampling, expansion, and fixation

- **R75.** `terciolines = numlines / 3`, rounded up.
- **R76.** If `numlines < 3` → `terciolines = numlines`.
- **R77.** Random sampling of `terciolines` lines within the central third.
- **R78.** Canon fixation occurs **after** generalization and expansion.
- **R79.** The sampling `rng` is injectable.

## 9. Center-out expansion

- **R89.** The tentative canon is built from the central third's lines.
- **R90.** The canon expands from the center outward.
- **R91.** Expansion uses `lex` to obtain each line's structure.
- **R92.** The data body is the contiguous region `[start, end]` where the canon holds.
- **R93.** Canon failures in the central third are errors (`CENTRAL_DIVERGENCE`).
- **R94.** If the resulting data body is too small, `BODY_LIMITATION` (warn) is emitted.
- **R95.** Expansion bounds advance symmetrically.

## 10. Hard Separators and Garbage Filtering (v5.6)

- **R106.** The lexer must distinguish between a literal comma (`,`) and a hard column separator (`|`), which includes semicolons, spaces, and tabs.
- **R107.** If a block pattern contains a hard separator (`|`), all commas within that block are **decimal separators by definition** (`dec`). No parity enumeration is needed.
- **R108.** If a block consists solely of text (no numbers), it is classified as a metadata block and discarded.
- **R109.** The orchestrator (`main.js`) must identify the block with the maximum number of columns (`maxNumColumns`). Smaller blocks that do not match this width are treated as garbage headers and ignored (their rows are padded with `null`).

## 11. Out of scope

- **R84.** Thousands notation (`1.234,56`).
- **R85.** Literal missing values (`NaN`, `---`, `>3.0`).
- **R86.** Rows split across multiple lines.
- **R87.** Units attached to numbers (`250nm`).
- **R88.** Comments at the end of lines.

## 12. Applied corrections (v5.6 summary)

| Rule group | Status |
|---|---|
| R1-R6 | Maintained. Numeric tokens. |
| R7-R43 | Retired in v5.0. |
| R44-R46 | Maintained. Structural prohibitions. |
| R48-R56 | Reformulated. Parser walks a `plan`. |
| R57-R59 | Retired in v5.0. |
| R60-R69 | Maintained. Diagnostics. |
| R70-R74 | Maintained. R74 is now the default behavior. |
| R75-R79 | Maintained. Sampling. |
| R89-R95 | Maintained. Center-out expansion. |
| R96-R105 | New in v5.0. Literal canon, block disambiguation, abstract canon. |
| R106-R109 | New in v5.6. Hard separators (`|`), automatic decimal assignment, and smart block filtering/padding in `main.js`. |
