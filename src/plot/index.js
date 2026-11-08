import { state } from './state.js';
import { render } from './renderer.js';
import { attachInteraction } from './interaction.js';
import { updateControls } from './controls.js';

export function drawPlot(columns, xIndex = 0, yIndices = [1]) {
  const svg = document.getElementById('spectrumSvg');
  if (!svg) return;

  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const canvas = document.getElementById('plotCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  if (!columns || !columns[xIndex] || columns[xIndex].length === 0) {
    state.viewLimits = { minX: null, maxX: null, minY: null, maxY: null };
    state.viewHistory = [null]; state.historyIndex = 0;
    updateControls(() => drawPlot(columns, xIndex, yIndices));
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

  const baseWidth = 800;
  const baseHeight = 500;
  const defaultMargin = { top: 40, right: 40, bottom: 60, left: 70 };

  // Render devuelve el margen efectivo y las dimensiones totales
  const ctx = render(svg, dataPoints, ySeries, state.viewLimits, defaultMargin, baseWidth, baseHeight, yIndices);

  // Interacción con las dimensiones totales (para getMousePos) y baseWidth (para bounds)
  attachInteraction({
    ...ctx,
    svg,
    dataPoints,
    yIndices,
    width: ctx.totalWidth,
    height: ctx.totalHeight,
    redraw: () => drawPlot(columns, xIndex, yIndices)
  });

  updateControls(() => drawPlot(columns, xIndex, yIndices));
}
