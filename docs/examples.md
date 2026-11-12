# Examples

Worked test cases for the Vispectra parser. Each case shows the input,
the output of every pipeline phase, and the resulting columns.

**Status:** implemented. Every case below is reproducible against the
current codebase and is backed by unit tests in `tests/compiler/`. Real
instrument files exercising the same patterns live in `examples/`.

## Reference material

- [`rules.md`](rules.md) — the parser rules (R1–R109) these cases illustrate.
- [`architecture.md`](architecture.md) — phase contracts and pipeline.
- `tests/compiler/` — unit tests for each phase.
- `examples/` — five real UV-Vis files (Cary 60, CNNi, L1Ref, FORTH,
  curvedata) that exercise the same patterns at scale.

## 1. Pure American (`200.0,0.5`)

| Phase | Output |
|---|---|
| `02_lexer` | `n,n` (two dot-decimals, one literal comma) |
| `04_canon` | pattern `_,_` |
| `04b_disambiguation` | no hard separator, hasN → R98 applies (comma is separator) |
| `04c_block_canon` | `n,n` |
| `06_parser` | `[200.0, 0.5]` |

## 2. Pure European with hard separator (`200;0,5`)

| Phase | Output |
|---|---|
| `02_lexer` | `z\|z,z` (hard separator detected) |
| `04_canon` | pattern `_,_` |
| `04b_disambiguation` | hasHardSeparator → **R107** applies (all commas decimal) |
| `04c_block_canon` | `z,n` (fused `0,5` becomes a dot-decimal) |
| `06_parser` | `[200, 0.5]` |

## 3. Mixed notation within a row (`800,010376;0,050972525;8.915989893E-4`)

The Cary 60 case. This is the input that drove the R107 fix in `04b`.

| Phase | Output |
|---|---|
| `02_lexer` | `z,z\|z,z\|n` |
| `04b_disambiguation` | hasHardSeparator → **R107** wins over R98 hasN |
| `04c_block_canon` | `n,n,n` |
| `06_parser` | `[800.010376, 0.050972525, 8.915989893e-4]` |

Before the R107 fix, the `hasN` branch fired first and forced `allSep`,
splitting every european cell into two columns (`800` + `010376`).

## 4. Empty slot between commas (`200,,0.5`)

| Phase | Output |
|---|---|
| `02_lexer` | `z,,n` |
| `04c_block_canon` | `n,v,n` |
| `06_parser` | `[200, null, 0.5]` |

`v` represents an explicit empty slot. It propagates as `null` to
`08_codegen` and is never injected as `0` (R100).

## 5. Trailing comma (`200.0,0.5,`)

Policy detected by `01b_trailing_comma` on the central block:

- **preserve** — trailing comma = empty column; the pattern gains a slot
- **trim** — file-level normalization strips the trailing comma
- **none** — no data line ends in comma

With `preserve`:

| Phase | Output |
|---|---|
| `02_lexer` | `n,n,` |
| `04_canon` | pattern `_,_,_` (extra slot appended) |
| `04c_block_canon` | `n,n,v` |
| `06_parser` | `[200.0, 0.5, null]` |

## 6. Sign and exponent fusion (`-9,58E-06`)

The R16 case. Before the fix, R16 required both operands to match
`/^\d+$/`, so `-9` (sign) and `58E-06` (exponent) were both rejected
as `FUSION_UNSAFE`. Every Cary 60 row with this pattern failed.

| Phase | Output |
|---|---|
| `02_lexer` | `z,z` |
| `06_parser` | `Number("-9" + "." + "58E-06") = -9.58e-6` |

R16 now reads: a `dec` fusion is valid iff `Number(left + '.' + right)`
returns a finite number. `Number` is strict, so `-1.-5`, `1e5.2`,
`1.2.5`, `1.+2` are still rejected as `NaN`.

## 7. Truly ambiguous block (`1,0,1` / `1,1,0` / `0,1,1`)

| Phase | Output |
|---|---|
| `02_lexer` | `z,z,z` (every row) |
| `04b_disambiguation` | no `n`, no hard separator → **ambiguous** (R98) |
| — | multiple valid resolutions (`dec,sep`, `sep,dec`, `sep,sep`) |
| `main.js` | status `needs_disambiguation` |
| UI | user picks a resolution via the interactive modal |

R74 makes this the default behavior: when ambiguity persists, Vispectra
degrades to user intervention. It never guesses silently (R70).

## Cross-references

| Case | Rule | Test | Fixture |
|---|---|---|---|
| American | R1–R6 | `tokenizer.test.js` | — |
| European + `\|` | R107 | `04b_disambiguation.test.js` | `CNNi.csv` |
| Mixed notation | R107 + R16 | `06_parser.test.js` | `cary60_*.csv` |
| Empty slot | R100 | `06_parser.test.js` | — |
| Trailing comma | 01b policy | (pending) | `CNNi.csv` |
| Sign + exponent | R16 | `06_parser.test.js` | `cary60_*.csv` |
| Ambiguous block | R70, R74, R98 | `04b_disambiguation.test.js` | — |

The trailing-comma policy is the only case without dedicated unit tests.
It is exercised indirectly via CNNi.csv in the integration tests; direct
coverage is tracked in the CHANGELOG under Known Limitations.

