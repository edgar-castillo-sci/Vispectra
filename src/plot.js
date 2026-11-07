// ============================================================
// VISPECTRA — PLOT (v5.2)
// ============================================================
// drawPlot(columns, xIndex, yIndices)
//
// Responsibilities:
//   - Read the processed columns.
//   - Compute nice scales for X and Y (rounded tick values).
//   - Draw gridlines, axes, tick labels, axis labels, and series.
//   - Handle nulls correctly: gaps break the line, they don't
//     produce 0-values or spurious segments.
//
// Does NOT:
//   - Apply math (that's processor.js / pipeline.js).
//   - Interpret roles (that's ui.js).
//   - Persist state between calls: every call redraws from scratch.
// ============================================================

const SVG_NS = 'http://www.w3.org/2000/svg';

export function drawPlot(columns, xIndex = 0, yIndices = [1]) {
  const svg = document.getElementById('spectrumSvg');
  if (!svg) return;

  // Clear previous render
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  // --- Guard clauses ---
  if (!columns || !columns[xIndex] || columns[xIndex].length === 0) return;
  if (!yIndices || yIndices.length === 0) return;

  const xData = columns[xIndex];
  const ySeries = yIndices
    .map((i) => columns[i])
    .filter((col) => col !== undefined && col !== null);
  if (ySeries.length === 0) return;

  // --- Valid extents (ignore nulls / NaN / non-finite) ---
  const validX = xData
    .filter((x) => x !== null && x !== undefined)
    .map(Number)
    .filter(Number.isFinite);
  if (validX.length === 0) return;

  const allY = ySeries
    .flat()
    .filter((y) => y !== null && y !== undefined)
    .map(Number)
    .filter(Number.isFinite);
  if (allY.length === 0) return;

  // --- Nice scales ---
  const xRawMin = Math.min(...validX);
  const xRawMax = Math.max(...validX);
  const yRawMin = Math.min(...allY);
  const yRawMax = Math.max(...allY);

  const xScale = niceScale(xRawMin, xRawMax);
  const yScale = niceScale(yRawMin, yRawMax);

  // --- Layout (fixed SVG canvas, dynamic plot area) ---
  const width = 800;
  const height = 500;
  const margin = { top: 50, right: 30, bottom: 65, left: 80 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  // Map domain → screen pixels using the nice scale
  const mapX = (x) =>
    margin.left +
    ((x - xScale.min) / (xScale.max - xScale.min)) * plotWidth;
  const mapY = (y) =>
    margin.top +
    plotHeight -
    ((y - yScale.min) / (yScale.max - yScale.min)) * plotHeight;

  // --- Layer 1: gridlines (behind everything) ---
  const gridGroup = document.createElementNS(SVG_NS, 'g');
  gridGroup.setAttribute('stroke', '#e0e0e0');
  gridGroup.setAttribute('stroke-width', '0.5');
  gridGroup.setAttribute('fill', 'none');

  for (let t = yScale.min; t <= yScale.max + yScale.step * 1e-6; t += yScale.step) {
    const py = mapY(t);
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', margin.left);
    line.setAttribute('x2', width - margin.right);
    line.setAttribute('y1', py);
    line.setAttribute('y2', py);
    gridGroup.appendChild(line);
  }
  for (let t = xScale.min; t <= xScale.max + xScale.step * 1e-6; t += xScale.step) {
    const px = mapX(t);
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', px);
    line.setAttribute('x2', px);
    line.setAttribute('y1', margin.top);
    line.setAttribute('y2', height - margin.bottom);
    gridGroup.appendChild(line);
  }
  svg.appendChild(gridGroup);

  // --- Layer 2: axes (border box: left + bottom) ---
  const axisGroup = document.createElementNS(SVG_NS, 'g');
  axisGroup.setAttribute('stroke', '#000');
  axisGroup.setAttribute('stroke-width', '1.2');

  const xAxis = document.createElementNS(SVG_NS, 'line');
  xAxis.setAttribute('x1', margin.left);
  xAxis.setAttribute('y1', height - margin.bottom);
  xAxis.setAttribute('x2', width - margin.right);
  xAxis.setAttribute('y2', height - margin.bottom);

  const yAxis = document.createElementNS(SVG_NS, 'line');
  yAxis.setAttribute('x1', margin.left);
  yAxis.setAttribute('y1', margin.top);
  yAxis.setAttribute('x2', margin.left);
  yAxis.setAttribute('y2', height - margin.bottom);

  axisGroup.appendChild(xAxis);
  axisGroup.appendChild(yAxis);
  svg.appendChild(axisGroup);

  // --- Layer 3: tick labels ---
  const labelGroup = document.createElementNS(SVG_NS, 'g');
  labelGroup.setAttribute('fill', '#000');
  labelGroup.setAttribute('font-size', '12px');
  labelGroup.setAttribute('font-family', 'system-ui, sans-serif');

  // X ticks (below the axis)
  for (let t = xScale.min; t <= xScale.max + xScale.step * 1e-6; t += xScale.step) {
    const px = mapX(t);
    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', px);
    text.setAttribute('y', height - margin.bottom + 18);
    text.setAttribute('text-anchor', 'middle');
    text.textContent = formatTick(t, xScale.step);
    labelGroup.appendChild(text);
  }

  // Y ticks (left of the axis)
  for (let t = yScale.min; t <= yScale.max + yScale.step * 1e-6; t += yScale.step) {
    const py = mapY(t);
    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', margin.left - 10);
    text.setAttribute('y', py + 4); // +4 ≈ vertical centering
    text.setAttribute('text-anchor', 'end');
    text.textContent = formatTick(t, yScale.step);
    labelGroup.appendChild(text);
  }
  svg.appendChild(labelGroup);

  // --- Layer 4: axis titles ---
  const titleGroup = document.createElementNS(SVG_NS, 'g');
  titleGroup.setAttribute('fill', '#000');
  titleGroup.setAttribute('font-size', '14px');
  titleGroup.setAttribute('font-family', 'system-ui, sans-serif');

  const xTitle = document.createElementNS(SVG_NS, 'text');
  xTitle.setAttribute('x', margin.left + plotWidth / 2);
  xTitle.setAttribute('y', height - 15);
  xTitle.setAttribute('text-anchor', 'middle');
  xTitle.textContent = `Column ${xIndex}`;
  titleGroup.appendChild(xTitle);

  const yTitle = document.createElementNS(SVG_NS, 'text');
  const yTitleX = 20;
  const yTitleY = margin.top + plotHeight / 2;
  yTitle.setAttribute('x', yTitleX);
  yTitle.setAttribute('y', yTitleY);
  yTitle.setAttribute('text-anchor', 'middle');
  yTitle.setAttribute('transform', `rotate(-90 ${yTitleX} ${yTitleY})`);
  yTitle.textContent = yIndices.length === 1
    ? `Column ${yIndices[0]}`
    : 'Value';
  titleGroup.appendChild(yTitle);
  svg.appendChild(titleGroup);

  // --- Layer 5: series (one <path> per continuous segment per series) ---
  const colors = ['#000000', '#cc0000', '#0055cc', '#009933', '#6600cc', '#cc6600'];

  ySeries.forEach((yData, idx) => {
    const segments = buildSegments(xData, yData);
    if (segments.length === 0) return;

    // One <path> per segment. Advantages over a single path with M/L
    // interleaved:
    //   - No "jump line" ever (the null gap is a real gap, not a chance).
    //   - Each path is a self-contained visible object.
    //   - Exporters (SVG → PDF) handle disjoint paths better.
    for (const seg of segments) {
      if (seg.length < 2) {
        // Single point: draw a small circle so the point is visible.
        if (seg.length === 1) {
          const c = document.createElementNS(SVG_NS, 'circle');
          c.setAttribute('cx', mapX(seg[0].x));
          c.setAttribute('cy', mapY(seg[0].y));
          c.setAttribute('r', 2);
          c.setAttribute('fill', colors[idx % colors.length]);
          svg.appendChild(c);
        }
        continue;
      }
      let d = '';
      for (let k = 0; k < seg.length; k++) {
        const px = mapX(seg[k].x);
        const py = mapY(seg[k].y);
        d += (k === 0 ? 'M' : 'L') + ` ${px.toFixed(2)} ${py.toFixed(2)}`;
      }
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', colors[idx % colors.length]);
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('stroke-linecap', 'round');
      svg.appendChild(path);
    }
  });
}

// ============================================================
// Helpers
// ============================================================

/**
 * Split (xData, yData) into continuous segments, breaking at any
 * null / undefined / non-finite point in either series. Returns an
 * array of arrays of {x, y} objects. Each inner array is a run of
 * consecutive valid points.
 */
function buildSegments(xData, yData) {
  const segments = [];
  let current = [];

  const n = Math.min(xData.length, yData.length);
  for (let i = 0; i < n; i++) {
    const x = xData[i];
    const y = yData[i];
    const xOk = x !== null && x !== undefined && Number.isFinite(Number(x));
    const yOk = y !== null && y !== undefined && Number.isFinite(Number(y));

    if (xOk && yOk) {
      current.push({ x: Number(x), y: Number(y) });
    } else if (current.length > 0) {
      segments.push(current);
      current = [];
    }
  }
  if (current.length > 0) segments.push(current);
  return segments;
}

/**
 * Compute a "nice" scale for a numeric axis.
 * Returns { min, max, step } such that:
 *   - [min, max] contains [rawMin, rawMax]
 *   - step is a round number (1, 2, 5 × 10^k)
 *   - the number of ticks is close to `maxTicks` but never above ~2× it
 *
 * If rawMin === rawMax, expands the domain by ±0.5 to avoid a
 * division by zero and give the single value a visible position.
 */
function niceScale(rawMin, rawMax, maxTicks = 6) {
  if (rawMin === rawMax) {
    return { min: rawMin - 0.5, max: rawMax + 0.5, step: 0.5 };
  }

  const range = rawMax - rawMin;
  const roughStep = range / Math.max(1, maxTicks - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const residual = roughStep / magnitude;

  let step;
  if (residual <= 1) step = 1 * magnitude;
  else if (residual <= 2) step = 2 * magnitude;
  else if (residual <= 5) step = 5 * magnitude;
  else step = 10 * magnitude;

  const niceMin = Math.floor(rawMin / step) * step;
  const niceMax = Math.ceil(rawMax / step) * step;

  return { min: niceMin, max: niceMax, step };
}

/**
 * Format a tick value with just enough precision to distinguish
 * adjacent ticks. Avoids "0.30000000000000004"-style noise.
 */
function formatTick(value, step) {
  // Decide decimal places from the step magnitude.
  const stepAbs = Math.abs(step);
  let decimals;
  if (stepAbs >= 1) decimals = 0;
  else if (stepAbs >= 0.1) decimals = 1;
  else if (stepAbs >= 0.01) decimals = 2;
  else if (stepAbs >= 0.001) decimals = 3;
  else if (stepAbs >= 0.0001) decimals = 4;
  else decimals = 5;

  // Snap the value to avoid floating point dust (e.g. 0.30000000000000004).
  const snapped = Number(value.toFixed(decimals + 2));
  return snapped.toFixed(decimals);
}
