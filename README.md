# Vispectra

A compiler for spectroscopic file formats. Cross-platform, local, serverless.

![Status](https://img.shields.io/badge/status-alpha-orange)
![License](https://img.shields.io/badge/license-MIT-blue)

Vispectra is two things at once: a tool for the spectroscopist who needs to read messy files, and a case study on grammatical inference from positive presentations. The first is the use case; the second is the problem that arises when trying to solve the first with rigor.

## Description

Vispectra reads spectroscopy files exactly as they come from the instrument — or from merging several of them — and converts them into clean numerical columns.

The architecture is not that of a conventional spectra reader: it is that of a compiler that infers the file's grammar from a sample of its data, builds a structural contract (the *canon*), and applies it to the rest. The starting premise is that the file is the source of truth, and the parser must learn to read it, not the other way around.

It runs entirely in the browser, with no backend, no file uploads, and no telemetry. It works on any operating system with a modern browser, and once loaded, it can operate offline.

## Architecture

The parser is a pipeline of independent phases, communicating through explicit contracts:

```
[00_reading]      → normalized text
[01_sampling]     → lines + random sample from the central block
[02_lexer]        → per-line structure
[03_ir]           → intermediate representation
[04_canon]        → canon inference + center-out expansion
[05_fixation]     → fixed canon
[06_parser]       → parsed values per line
[07_semantics]    → verification
[08_codegen]      → clean columns
[09_diagnostics]  → diagnostics accumulator
```

Each phase is a pure function that receives data and returns data. The only exception is `08_codegen`, which mutates the columns by explicit design. The compiler does not guess: when it cannot decide, it fails with a typed diagnostic instead of silently producing corrupt data.

The core is technique-agnostic. UV-Vis is the first implementation; XRD, XPS, Raman, and IR only add validation ranges and post-parsing operations.

## The Problem

Spectroscopy files are heterogeneous by nature. Every instrument, software, and version exports with its own dialect: comma or dot decimals, tabs or spaces, headers of variable length, missing values disguised as empty separators.

Most tools assume a fixed format. Vispectra infers the structure from the data. What begins as a parsing problem becomes, upon formalization, a case of grammatical inference: the identification of grammars from positive presentations, proven impossible in the general case by Gold (1967). Vispectra does not solve the general problem; it restricts it to a tractable domain through inductive biases. But the connection is real, and it is what makes the project more than just a parser.

## Status

**Alpha.** Early design and development.

**Implemented:**
- Phase 00 — reading and normalization
- Phase 02 — lexer (point and comma classification)
- Phase 09 — diagnostics accumulator
- Orchestrator (`main.js`)
- Complete parser specification (R1–R95)
- Documented pipeline architecture

**In development:**
- Phase 01 — central block sampling
- Phases 03–08 of the compiler

**Planned:**
- Visualization
- Hybrid UI (column role assignment)
- Support for XRD, XPS, Raman, IR
- Internationalization (English, Spanish)

The compiler **does not yet parse files**. This section will be updated with each release.

## Usage

The compiler is not operational yet. For now, the project can be explored by reading the documentation in `docs/`.

## Structure

```
src/
├── compiler/       Phase-based parser (00–09)
├── i18n.js         Internationalization
├── main.js         Orchestrator
├── plot.js         Plotter
└── ui.js           Interface
docs/
├── origin.md       Design history (in Spanish)
├── architecture.md Pipeline and contracts
├── rules.md        Parser specification (R1–R95)
└── examples.md     Worked test cases
locales/
├── en.js           Base language (planned)
└── es.js           Spanish
```

## Documentation

- [Origin](docs/origen.md) — history of the design *(in Spanish)*
- [Architecture](docs/architecture.md) — pipeline and contracts between phases
- [Rules](docs/rules.md) — complete parser specification (R1–R95)
- [Roadmap](ROADMAP.md) — work areas and planned releases

## References

- Gold, E. M. (1967). Language identification in the limit. *Information and Control*, 10(5), 447–474. https://doi.org/10.1016/S0019-9958(67)91165-5

## License

MIT. See [LICENSE](LICENSE).

## Author

Castillo, Edgar R. H. · [ORCID 0009-0006-4268-3323](https://orcid.org/0009-0006-4268-3323)
