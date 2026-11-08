// ============================================================
// VISPECTRA — TEST DATA GENERATOR
// ============================================================
// Generates a large synthetic CSV to stress-test the compiler,
// the MinMaxLTTB downsampler, and the Canvas renderer.
//
// Usage:
//   node examples/generate_test_data.js [rows] [cols]
//
// Default: 100,000 rows x 50 columns (~20 MB)
// ============================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rows = parseInt(process.argv[2]) || 100000;
const cols = parseInt(process.argv[3]) || 50;
const outPath = path.join(__dirname, 'big_test.csv');

const stream = fs.createWriteStream(outPath);

// 1. Write header
let header = [];
for (let i = 0; i < cols; i++) header.push(`Column_${i}`);
stream.write(header.join(';') + '\n');

// 2. Write data (sine waves with noise)
for (let i = 0; i < rows; i++) {
  let row = [];
  const x = i * 0.01; // X-axis from 0 to 1000
  row.push(x.toFixed(3));

  for (let j = 1; j < cols; j++) {
    const y = Math.sin(x * j * 0.1) * (j * 0.5) + (Math.random() - 0.5) * 0.1;
    row.push(y.toFixed(5));
  }
  stream.write(row.join(';') + '\n');
}

stream.end();
console.log(`Generated ${outPath} with ${rows} rows and ${cols} columns.`);
