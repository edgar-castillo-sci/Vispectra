// ============================================================
// SERVICES — PIPELINE
// ============================================================
// Pure math pipeline. Applies a list of operations to selected
// y-columns, returning NEW column arrays (no mutation).
//
// Operations (consumed from processor.js):
//   { type: 'smooth', window }
//   { type: 'derivative' }
//   { type: 'baseline', start, end }
//   { type: 'minmax' }
//   { type: 'max' }
// ============================================================

import {
  smoothGaussian,
  derivative,
  correctBaseline,
  normalizeMinMax,
  normalizeMax,
} from '../processor.js';

/**
 * Applies a pipeline of operations to the specified y-columns.
 * Returns a NEW array of columns; input is not mutated.
 */
export function applyPipeline(columns, xIndex, yIndices, pipeline) {
  const processed = columns.map((col) => [...col]);
  const xData = processed[xIndex];

  for (const op of pipeline) {
    for (const idx of yIndices) {
      if (idx === xIndex) continue;
      if (idx < 0 || idx >= processed.length) continue;

      const yData = [...processed[idx]];

      switch (op.type) {
        case 'smooth':
          processed[idx] = smoothGaussian(yData, op.window);
          break;
        case 'derivative':
          processed[idx] = derivative(xData, yData);
          break;
        case 'baseline':
          processed[idx] = correctBaseline(xData, yData, op.start, op.end);
          break;
        case 'minmax':
          processed[idx] = normalizeMinMax(yData);
          break;
        case 'max':
          processed[idx] = normalizeMax(yData);
          break;
        // unknown types are silently ignored (forward-compatible)
      }
    }
  }

  return processed;
}
