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
