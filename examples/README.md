# Examples

This folder contains utilities to generate synthetic data for stress-testing Vispectra.

## `generate_test_data.js`

A Node.js script that generates a massive semicolon-separated dataset designed to test the compiler and the visualization engine.

### Usage

    node examples/generate_test_data.js [rows] [cols]

- `rows`: Number of data rows (default: 100,000).
- `cols`: Total number of columns including the X-axis (default: 50).

### Example

    node examples/generate_test_data.js 500000 20

This generates a file `big_test.csv` in the `examples/` directory with 500,000 rows and 20 columns (~85 MB).

### What does the generated file contain?

- **Format:** Semicolon-separated (`;`).
- **Column 0:** X-axis values (0 to `rows * 0.01`).
- **Columns 1..n:** Y-series generated from sine waves of varying frequencies and amplitudes, plus random noise.

### Why this dataset?

- **Compiler:** Tests the parser's ability to handle large, repetitive, well-structured European-format files.
- **Downsampler:** Exercises the MinMaxLTTB algorithm. Without it, rendering 100,000 points per series would freeze the browser.
- **Canvas Renderer:** Verifies that the hybrid SVG/Canvas architecture handles 50 simultaneous series without dropping frames.
