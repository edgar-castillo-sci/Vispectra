# Vispectra Processing Rules (Planned)

> **Status:** spec. Not yet implemented. The mathematical engine described
> here is Area 3 of [`../ROADMAP.md`](../ROADMAP.md) and is planned for
> `v0.2.0-alpha`. The compiler itself (parsing) is stable; this document
> describes what will *consume* the parsed columns.

While parser rules (R1–R109, see [`rules.md`](rules.md)) dictate how to
*read* a file, processing rules (P1–P99) dictate how to *treat* the
extracted data.

## P1. Separation of Concerns

Parsing and Processing are entirely separate. The parser extracts the
raw numbers. The processor applies mathematical transformations. The
processor never modifies the raw data in memory; it returns a new array
of processed columns.

## P2. Reproducibility

Every processing operation must be defined by a configuration file
(YAML/JSON). Manual UI adjustments are permitted for exploration but
must be exportable to a configuration file for reproducibility.

The YAML v2 schema already serializes the visual state (see
[`architecture.md`](architecture.md#configuration-system-yaml)). The
scientific pipeline will extend it with a `pipeline:` block:

    pipeline:
      - type: smooth_savgol
        window: 11
        order: 3
      - type: baseline
        method: linear
        anchors: [[350, 0.5], [800, 0.2]]
      - type: normalize
        method: max_peak

## P3. Baseline Correction

*To be defined when the mathematical engine is implemented.*

Current prototype (`src/processor.js`): linear interpolation between two
anchor points. Interactive anchors (click on plot) are planned for
`v0.2.0`.

## P4. Smoothing

*To be defined when the mathematical engine is implemented.*

Current prototype (`src/processor.js`): Gaussian only. Savitzky-Golay
is planned for `v0.2.0`.

## P5. Pure Functions and Immutability

All mathematical operations implemented in `src/processor.js` must be
pure functions. They receive an array of numbers (or an array of
columns) and return a **new** array with the transformed data. They must
never mutate the original input.

This mirrors the contract already enforced in `services/pipeline.js`
(immutable math pipeline) and `services/config.js` (pure readers).

## P6. Technique-Agnosticism

The processing engine does not know if it is processing Raman, UV-Vis,
or XRD. It only applies mathematical transformations (smoothing,
derivatives, normalization) to numerical arrays. The scientist is
responsible for choosing the appropriate operations for their specific
technique.

## P7. Core Mathematical Operations

Initial engine targets (see `ROADMAP.md` Area 3 for the full list):

- **Smoothing:** Moving Average, Gaussian (existing), Savitzky-Golay
  (planned).
- **Normalization:** Min-Max (0 to 1), Max-Peak (divide by the maximum
  value), Area, Vector.
- **Baseline:** Linear (two anchor points), Polynomial (planned).
- **Derivatives:** First and second (Savitzky-Golay based, planned).
- **Peak detection:** With prominence (planned).

All operations are pure functions in `src/processor.js`.
