# Vispectra Processing Rules (Planned)

While the parser rules (R1–R95) dictate how to *read* a file, the Processing Rules (P1–P99) dictate how to *treat* the extracted data.

## P1. Separation of Concerns
Parsing and Processing are entirely separate. The Parser extracts the raw numbers. The Processor applies mathematical transformations. The Processor never modifies the raw data in memory; it returns a new array of processed columns.

## P2. Reproducibility
Every processing operation must be defined by a configuration file (YAML/JSON). Manual UI adjustments are permitted for exploration but must be exportable to a configuration file for reproducibility.

## P3. Baseline Correction
...
*(To be defined as the mathematical engine is implemented)*

## P4. Smoothing
...
*(To be defined as the mathematical engine is implemented)*

## P5. Pure Functions and Immutability
All mathematical operations implemented in `src/processor.js` must be pure functions. They receive an array of numbers (or an array of columns), and return a **new** array with the transformed data. They must never mutate the original input.

## P6. Technique-Agnosticism
The processing engine does not know if it is processing Raman, UV-Vis, or XRD. It only applies mathematical transformations (smoothing, derivatives, normalization) to numerical arrays. The scientist is responsible for choosing the appropriate operations for their specific technique.

## P7. Core Mathematical Operations (Nurse Functions)
The initial engine must support the following fundamental operations:
- **Smoothing:** Moving Average (to reduce high-frequency noise).
- **Normalization:** Min-Max scaling (0 to 1) and Max-Peak scaling (divide by the maximum value).
- **Baseline:** Linear baseline correction (requires two anchor points).
*(More operations like Savitzky-Golay filters and derivatives will be added later).*
