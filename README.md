# Vispectra

## Abstract

Vispectra is a compiler for spectroscopic file formats (UV-Vis, XRD, XPS, Raman, IR). It is designed to ingest heterogeneous, unformatted instrument outputs and transform them into strict numerical matrices. 

Rather than relying on hardcoded parsers for specific proprietary formats, Vispectra infers the grammatical structure of the file from a statistical sample of its contents. It operates entirely client-side within a web browser, ensuring zero telemetry, no backend dependencies, and complete data privacy.

## Theoretical Background

Reading an unknown file format without prior specification is equivalent to the **identification of grammars from positive presentations**. In 1967, E. M. Gold demonstrated that this problem is formally impossible to solve in the general case using only positive examples.

Vispectra does not attempt to solve the general problem. Instead, it restricts the domain to spectroscopic data and applies **inductive biases** (heuristics) to make the problem tractable:
1.  **Central Block Sampling:** It assumes that preambles and residues occupy the extremes of the file, while the central block contains the raw data.
2.  **Canonicalization:** It extracts a structural contract (the *canon*) by comparing line structures (e.g., `n,n` vs `n,,`).
3.  **The Anchor (`i`):** It uses a wildcard symbol to represent positions that admit either a value or an empty slot, resolving structural ambiguities.

When the compiler cannot decide on a valid structure, it fails explicitly by emitting typed diagnostics rather than silently producing corrupt data.

## System Architecture

The compiler is structured as a pipeline of independent, pure functions. Each phase communicates through explicit data contracts and immutable data structures, with the sole exception of `08_codegen`, which mutates the final column arrays for performance.

```
[00_reading]      → text normalization and BOM handling
[01_sampling]     → extraction of the central block and random sampling
[02_lexer]        → structural classification of tokens (n, c, ,)
[03_ir]           → intermediate representation and frequency analysis
[04_canon]        → grammar inference and center-out expansion
[05_fixation]     → tokenization and comma parity resolution
[06_parser]       → line-by-line extraction using the fixed canon
[07_semantics]    → structural validation and ambiguity resolution
[08_codegen]      → column population (null-to-zero injection)
[09_diagnostics]  → centralized diagnostic accumulator
```

## Implementation Status

**Current Version:** `v0.1.1-alpha` (Pre-release)

*   **Implemented:** Phases 00, 01, 02, 03, and 09.
*   **In Development (Stubs):** Phases 04, 05, 06, 07, and 08.
*   **Status:** The pipeline runs end-to-end and correctly parses the sampled structures of real spectroscopic files, but it does not yet output final numerical columns.

## Usage & Deployment

The compiler is designed to run locally. To start the development environment:

```bash
git clone https://github.com/edgar-castillo-sci/Vispectra.git
cd Vispectra
npm run dev
```
Access the local server in your browser and drop a spectroscopic file into the interface.

## License and Open Science

Vispectra is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

This license was chosen to ensure that any modifications to the compiler—including those used to provide network services—remain open-source. The AGPL-3.0 protects the scientific core from proprietary forks. For commercial or proprietary integration, dual-licensing negotiations are available by contacting the author.

## References

- Gold, E. M. (1967). *Language identification in the limit*. Information and Control, 10(5), 447–474. https://doi.org/10.1016/S0019-9958(67)91165-5

## Citation

If you use Vispectra in academic research, please cite the archived release:

> Castillo, E. (2026). *Vispectra: A compiler for spectroscopic file formats* (v0.1.0-alpha) [Software]. Zenodo. https://doi.org/10.5281/zenodo.23177822

## Author

**Edgar Castillo**  
Independent Researcher  
[ORCID: 0009-0006-4268-3323](https://orcid.org/0009-0006-4268-3323)
