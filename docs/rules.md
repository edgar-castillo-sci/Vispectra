# Vispectra Rules

## 1. Tokens and numbers

- **R1.** Every numeric token is parsed as a real number. No distinction between "integer" and "decimal" as separate types.
- **R2.** Syntax of `token_n`: `[+-]? digits ( '.' digits? )? ( [eE] [+-]? digits )?`
- **R3.** Syntax of `token_c`: `[+-]? digits ( ',' digits? )? ( [eE] [+-]? digits )?`
- **R4.** `token_c` consumes the comma only if it is followed by digits.
- **R5.** The dot is always decimal, never a column separator.
- **R6.** Scientific notation is treated as an indivisible unit.

## 2. Two-Level Canonical Model (v5.0)

- **R96.** The literal canon (`n`, `z`, `v`, `,`) does not interpret commas. The comma is a structural character, not a decimal or column separator at this level.
- **R100.** `v` represents an explicit empty slot and is propagated as `null` to `08_codegen`. It is never injected as `0`.
- **R101.** The abstract canon (`n`, `z`, `i`, `v`) is built **after** disambiguation. It encodes the nature of each column, not of each row.
- **R102.** Individual gaps (`v` in some rows but not others) do not change the column type. They are reported as `completeness: { filled, total, gapIndices }` and as a `COLUMN_GAPS` diagnostic.
- **R103.** Mix of `n` and `z` in the same column -> type `i` + `MIXED_NOTATION` diagnostic (info).

## 3. Lexer rules (literal transcription)

- **R7.** The lexer transcribes a line into `n`, `z`, `v`, `,`. It does not interpret commas.
- **R8.** Numbers are consumed atomically: sign, mantissa, optional exponent.
- **R9.** `.5` (leading dot followed by digit) is a number.
- **R10.** An incomplete exponent (`1e`, `1e+`) is not consumed as part of the number; the `e` falls back to a gap.
- **R11.** Runs of commas are preserved (`1,,3` -> `z,,z`). They are not collapsed.
- **R12.** A gap between two commas emits `v` (`1, ,3` -> `z,v,z`). A gap between two values with no adjacent comma emits `,` (`1 ; 5` -> `z,z`). A gap adjacent to a comma is decorative and emits nothing (`1, 5` -> `z,z`).
- **R13.** Leading gaps are skipped. A single trailing comma is dropped. Leading commas are preserved.

## 4. Comma semantics (resolved by disambiguation, not by lexer)

- **R14.** The comma has no intrinsic meaning in the literal canon. It becomes a decimal separator (`dec`) or a column separator (`sep`) only after a resolution is applied in `04b`.
- **R15.** For a block with `k` commas, `2^k` combinations of `dec`/`sep` are candidates. A candidate is valid only if it is structurally compatible with every row of the block.
- **R16.** A `dec` fusion is valid only if both operands are `/^\d+$/` (no signs, no exponents). Otherwise the row fails with `FUSION_UNSAFE`.
- **R17.** All rows in a block must yield the same number of columns under the chosen resolution. Otherwise `BLOCK_COUNT_MISMATCH`.

## 5. Run detection and parity

- **R18.** A run of `L` commas in the pattern is preserved as `L` consecutive commas in the literal canon.
- **R19.** Base parity (default resolution): even indices -> `dec`, odd indices -> `sep`. This is the default proposed to the user, not a hard rule.
- **R20.** A block whose pattern contains consecutive commas (`__`) is always flagged as ambiguous, even if it has only one valid resolution. The user must confirm.

## 6. Prohibitions

- **R44.** `in`, `cn`, `ci`, `ic` -> immediate error (structural prohibition). Detected in canon inference (`04_canon`) and at the line level (`07_semantics`).
- **R45.** Between two value symbols (`n`, `z`, `i`), there must always be at least one separator.
- **R46.** Comma count varying between lines -> error.
- **R62.** Error if the comma count varies between lines in the same block.
- **R63.** Error if the canon is not satisfied on a line.

## 7. Disambiguation rules (v5.0)

- **R97.** The parity heuristic lives only in `04b_disambiguation` as a default resolution. It does not contaminate the lexer, the canon, or the parser.
- **R98.** A block is ambiguous if it contains at least one `z`, at least one comma, and no `n` in its rows. The presence of `n` (dot-decimal) disambiguates; the presence of `v` (explicit empty slot) disambiguates.
- **R99.** Resolutions are grouped by comma pattern, not by full canon. Rows with `n,n,n` and `z,z,z` belong to the same block (`_,_,_`) because they share comma structure.
- **R70.** Do not guess silently.
- **R71.** If notations are mixed -> warn, show the interpretation used, recommend normalization.
- **R72.** Strict mode (abort) and permissive mode (parse, flag suspicious lines).
- **R73.** If ambiguity persists -> error or ask the user.
- **R74.** Degradation to user intervention is the **default behavior** in v5.0. The interactive editor is the standard disambiguation mechanism, not a future feature.

## 8. Parser rules (v5.0, plan-driven)

- **R48.** The `plan` tells the parser what to look for and in what order, left to right.
- **R49.** `_` -> consume one number token.
- **R50.** `v` -> consume one gap token; verify no number is present.
- **R51.** `,` with role `sep` -> consume one comma token; finalize the pending slot.
- **R52.** `,` with role `dec` -> consume one comma token and the following number; fuse both into a single number (requires `/^\d+$/` on both sides). Skip the next `_` in the pattern (it is the fused number's right half).
- **R53.** `i` (abstract canon only) -> not a parser concern; the column type is decided in `04c`.
- **R54.** Trailing gaps (comments, whitespace) are tolerated. Trailing numbers or commas -> `EXTRA_TOKENS`.
- **R55.** The column index advances only when a value is produced, not with each pattern symbol.
- **R56.** Each canon symbol consumes exactly one token, one separator, or nothing (only `v`).

## 9. Diagnostics

- **R60.** Error if `fei in num_types` and a dot arrives (absorbed by the lexer's atomic number consumption in v5.0).
- **R61.** Error if `in`, `cn`, `ci`, `ic` appears (R44).
- **R64.** Error if `..` appears inside another sequence.
- **R65.** Severe warning for pure dot sequence `......`.
- **R66.** Log when consecutive comma runs are detected, explaining the resolution algorithm.
- **R67.** Log if separators vary between rows but the count is consistent.
- **R68.** Syntax error log with normalization recommendation when ambiguity is present.
- **R69.** Explicit recommendation to normalize the file before operating.
- **R105.** All segments must produce the same number of columns. If not, `BLOCK_COUNT_MISMATCH` (error) and the file is rejected or exported as separate tables (user decision).

## 10. Ambiguity policy

- **R70.** Do not guess silently.
- **R71.** If notations are mixed -> warn, show the interpretation used, recommend normalization.
- **R72.** Strict mode (abort) and permissive mode (parse, flag suspicious lines).
- **R73.** If ambiguity persists -> error or ask the user.
- **R74.** User intervention is the standard mechanism in v5.0.

## 11. Sampling, expansion, and fixation

- **R75.** `terciolines = numlines / 3`, rounded up.
- **R76.** If `numlines < 3` -> `terciolines = numlines`.
- **R77.** Random sampling of `terciolines` lines within the central third `[terciolines, 2*terciolines)`. The extreme thirds are reserved: the first as preamble, the last as residue.
- **R78.** Canon fixation occurs **after** generalization and expansion (`04_canon`). The canon does not change during parsing.
- **R79.** The sampling `rng` is injectable to allow reproducible tests without sacrificing randomness in production.

## 12. Center-out expansion

- **R89.** The tentative canon is built from the central third's lines.
- **R90.** The canon expands from the center outward: lines immediately before and after the central third are evaluated. If compatible with the canon, they are incorporated and expansion continues. If not, it stops on that side.
- **R91.** Expansion uses `lex` to obtain each line's structure and verifies structural compatibility against the tentative canon. It does not invoke `06_parser`, to avoid forward dependency.
- **R92.** The data body is the contiguous region `[start, end]` where the canon holds. Lines outside that range are preamble (before) or residue (after).
- **R93.** Canon failures in the central third are errors (`CENTRAL_DIVERGENCE`). Failures at the extremes define the body boundary (`PREAMBLE_DETECTED`, `RESIDUE_DETECTED`).
- **R94.** If the resulting data body is too small (e.g., fewer than `terciolines` lines), `BODY_LIMITATION` (warn) is emitted.
- **R95.** Expansion bounds advance symmetrically: `lowerBound -= 1` descends to 0, `upperBound += 1` ascends to `numlines`. Expansion stops when a bound fails (or when both fail, per configuration).

## 13. Hybrid UI (future)

- **R80.** If more than 2 columns are detected, the UI asks the user what each one means.
- **R81.** Possible roles: wavelength, absorbance, transmittance, additional absorbance, other parameter, ignore.
- **R82.** Based on the answer, the parser applies corresponding operations.
- **R83.** Neither absolute automation nor absolute control: the parser deduces what it can, asks when it cannot.

(R80-R83 live in `10_ui.js` or `src/ui/`, not inside the compiler.)

## 14. Out of scope

- **R84.** Thousands notation (`1.234,56`).
- **R85.** Literal missing values (`NaN`, `---`, `>3.0`).
- **R86.** Rows split across multiple lines.
- **R87.** Units attached to numbers (`250nm`).
- **R88.** Comments at the end of lines.

## 15. Retired rules (v5.0)

The following rules from the previous architecture are obsolete and kept here only for historical reference. Do not implement them.

| Rule | Status | Note |
|---|---|---|
| R7-R22 | Retired | Comma classification in the lexer. Replaced by `tokenizer.js` (literal transcription). |
| R23-R28 | Retired | Parity and runs in the lexer. Parity now lives in `04b_disambiguation` as a default resolution. |
| R29-R36 | Retired | Original `i` anchor. `i` returns in the abstract canon with a different meaning (mix of `n`+`z` in a column). |
| R37-R43 | Retired | Generalization to `i` in the literal canon. Replaced by block grouping by comma pattern. |
| R57-R59 | Retired | Local comma classification in the parser. There is no local resolution anymore. |

## 16. Applied corrections (v5.0 summary)

| Rule group | Status |
|---|---|
| R1-R6 | Maintained. Numeric tokens. |
| R7-R43 | Retired. See section 15. |
| R44-R46 | Maintained. Structural prohibitions. Now filter resolutions in `04b`. |
| R48-R56 | Reformulated. Parser walks a `plan` instead of a `fixedCanon` array. |
| R57-R59 | Retired. Local comma classification removed. |
| R60-R69 | Maintained. Diagnostics. |
| R70-R74 | Maintained. R74 is now the default behavior. |
| R75-R79 | Maintained. Sampling, expansion, injectable `rng`. |
| R89-R95 | Maintained. Center-out expansion. |
| R96-R105 | New. Literal canon, block disambiguation, abstract canon, `MIXED_NOTATION`, `COLUMN_GAPS`, `BLOCK_COUNT_MISMATCH`, executable `plan`, `null` propagation, single-canon preference with explicit exceptions. |
