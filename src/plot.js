const SVG_NS = "http://www.w3.org/2000/svg";

export function drawPlot(columns, xIndex = 0, yIndices = [1]) {
  const svg = document.getElementById('spectrumSvg');
  if (!svg) return;

  // Limpiar SVG de forma segura (evita problemas de compatibilidad)
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }

  if (!columns || !columns[xIndex] || columns[xIndex].length === 0) return;
  if (!yIndices || yIndices.length === 0) return;

  const xData = columns[xIndex];
  const ySeries = yIndices.map(i => columns[i]).filter(col => col !== undefined);
  if (ySeries.length === 0) return;

  const minX = Math.min(...xData);
  const maxX = Math.max(...xData);
  let minY = Infinity;
  let maxY = -Infinity;
  for (const series of ySeries) {
    for (const val of series) {
      if (val < minY) minY = val;
      if (val > maxY) maxY = val;
    }
  }

  const width = 800;
  const height = 500;
  const margin = { top: 40, right: 40, bottom: 60, left: 70 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const mapX = (x) => margin.left + ((x - minX) / (maxX - minX)) * plotWidth;
  const mapY = (y) => margin.top + plotHeight - ((y - minY) / (maxY - minY)) * plotHeight;

  const axisGroup = document.createElementNS(SVG_NS, 'g');

  const xAxis = document.createElementNS(SVG_NS, 'line');
  xAxis.setAttribute('x1', margin.left);
  xAxis.setAttribute('y1', height - margin.bottom);
  xAxis.setAttribute('x2', width - margin.right);
  xAxis.setAttribute('y2', height - margin.bottom);
  xAxis.setAttribute('stroke', '#000');
  xAxis.setAttribute('stroke-width', '1.5');

  const yAxis = document.createElementNS(SVG_NS, 'line');
  yAxis.setAttribute('x1', margin.left);
  yAxis.setAttribute('y1', margin.top);
  yAxis.setAttribute('x2', margin.left);
  yAxis.setAttribute('y2', height - margin.bottom);
  yAxis.setAttribute('stroke', '#000');
  yAxis.setAttribute('stroke-width', '1.5');

  axisGroup.appendChild(xAxis);
  axisGroup.appendChild(yAxis);
  svg.appendChild(axisGroup);

  const colors = ['#000000', '#cc0000', '#0055cc', '#009933', '#6600cc'];

  ySeries.forEach((yData, index) => {
    let pathData = '';
    for (let i = 0; i < xData.length; i++) {
      const px = mapX(xData[i]);
      const py = mapY(yData[i]);
      pathData += (i === 0 ? 'M' : 'L') + ` ${px.toFixed(2)} ${py.toFixed(2)} `;
    }

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', colors[index % colors.length]);
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
  });

  const addLabel = (text, x, y, anchor) => {
    const el = document.createElementNS(SVG_NS, 'text');
    el.setAttribute('x', x);
    el.setAttribute('y', y);
    el.setAttribute('text-anchor', anchor);
    el.setAttribute('fill', '#000');
    el.setAttribute('font-size', '14px');
    el.setAttribute('font-family', 'Times New Roman, Times, serif');
    el.textContent = text;
    svg.appendChild(el);
  };

  addLabel(minX.toFixed(1), margin.left, height - margin.bottom + 20, 'middle');
  addLabel(maxX.toFixed(1), width - margin.right, height - margin.bottom + 20, 'middle');
  addLabel(minY.toFixed(2), margin.left - 10, height - margin.bottom, 'end');
  addLabel(maxY.toFixed(2), margin.left - 10, margin.top + 5, 'end');
}
