import { state } from './state.js';
import { render } from './renderer.js';
import { attachInteraction } from './interaction.js';
import { updateRangePanel } from '../ui/rangePanel.js';

export function drawPlot(columns, xIndex = 0, yIndices = [1]) {
  const svg = document.getElementById('spectrumSvg');
  if (!svg) return;

  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const canvas = document.getElementById('plotCanvas');
  if (canvas) {
    const ctx2d = canvas.getContext('2d');
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
  }

  if (!columns || !columns[xIndex] || columns[xIndex].length === 0) {
    state.viewLimits = { minX: null, maxX: null, minY: null, maxY: null };
    state.viewHistory = [{ limits: { minX: null, maxX: null, minY: null, maxY: null }, axis: 'xy' }];
    state.historyIndex = 0;
    return;
  }
  if (!yIndices || yIndices.length === 0) return;

  const xData = columns[xIndex];
  const ySeries = yIndices.map(i => columns[i]).filter(col => col !== undefined && col !== null);
  if (ySeries.length === 0) return;

  const dataPoints = [];
  for (let i = 0; i < xData.length; i++) {
    if (xData[i] === null || xData[i] === undefined) continue;
    const valX = Number(xData[i]);
    if (!Number.isFinite(valX)) continue;

    const ys = [];
    let hasValidY = false;
    for (let j = 0; j < ySeries.length; j++) {
      const rawY = ySeries[j][i];
      if (rawY === null || rawY === undefined) {
        ys.push(null);
      } else {
        const valY = Number(rawY);
        if (Number.isFinite(valY)) { ys.push(valY); hasValidY = true; }
        else { ys.push(null); }
      }
    }
    if (hasValidY) dataPoints.push({ x: valX, ys });
  }

  if (dataPoints.length === 0) return;
  dataPoints.sort((a, b) => a.x - b.x);

  const baseWidth = state.frame.width;
  const baseHeight = state.frame.height;
  const defaultMargin = { top: 40, right: 40, bottom: 60, left: 70 };

  const renderCtx = render(svg, dataPoints, ySeries, state.viewLimits, defaultMargin, baseWidth, baseHeight, yIndices);

  // Update range panel
  updateRangePanel(renderCtx);

  // Attach interaction (hover, pin, box zoom, dblclick reset)
  attachInteraction({
    ...renderCtx,
    svg,
    dataPoints,
    yIndices,
    width: renderCtx.totalWidth,
    height: renderCtx.totalHeight,
    redraw: () => drawPlot(columns, xIndex, yIndices)
  });
}
