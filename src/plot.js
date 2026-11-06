const SVG_NS = "http://www.w3.org/2000/svg";

export function drawPlot(columns, xIndex = 0, yIndices = [1]) {
  const svg = document.getElementById('spectrumSvg');
  if (!svg) return;

  while (svg.firstChild) svg.removeChild(svg.firstChild);

  if (!columns || !columns[xIndex] || columns[xIndex].length === 0) return;
  if (!yIndices || yIndices.length === 0) return;

  const xData = columns[xIndex];
  const ySeries = yIndices.map(i => columns[i]).filter(col => col !== undefined && col !== null);
  if (ySeries.length === 0) return;

  // 1. FORZAR CONVERSIÓN A NÚMERO Y FILTRAR VÁLIDOS (Evita NaNs y strings)
  const validX = xData.map(Number).filter(Number.isFinite);
  if (validX.length === 0) return;

  const allY = ySeries.flat().map(Number).filter(Number.isFinite);
  if (allY.length === 0) return;

  const minX = Math.min(...validX);
  const maxX = Math.max(...validX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);



  const width = 800;
  const height = 500;
  const margin = { top: 40, right: 40, bottom: 60, left: 70 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const mapX = (x) => margin.left + ((x - minX) / (maxX - minX)) * plotWidth;
  const mapY = (y) => margin.top + plotHeight - ((y - minY) / (maxY - minY)) * plotHeight;

  // --- Ejes ---
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

  // --- Líneas ---
  const colors = ['#000000', '#cc0000', '#0055cc', '#009933', '#6600cc'];

  ySeries.forEach((yData, index) => {
    let pathData = '';

    // Iterar sobre los datos originales
    for (let i = 0; i < xData.length; i++) {
      const valX = Number(xData[i]);
      const valY = Number(yData[i]);

      // Ignorar si alguno no es un número válido
      if (!Number.isFinite(valX) || !Number.isFinite(valY)) continue;

      const px = mapX(valX);
      const py = mapY(valY);

      if (pathData === '') {
        pathData += `M ${px.toFixed(2)} ${py.toFixed(2)}`;
      } else {
        pathData += ` L ${px.toFixed(2)} ${py.toFixed(2)}`;
      }
    }

    if (pathData === '') return;

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', colors[index % colors.length]);
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
  });

  // --- Etiquetas ---
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
