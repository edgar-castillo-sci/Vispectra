import { getNiceTicks } from './axes.js';

const SVG_NS = "http://www.w3.org/2000/svg";

export function render(svg, dataPoints, ySeries, viewLimits, margin, width, height, yIndices) {
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  let minX = viewLimits.minX !== null ? viewLimits.minX : dataPoints[0].x;
  let maxX = viewLimits.maxX !== null ? viewLimits.maxX : dataPoints[dataPoints.length - 1].x;
  let minY = viewLimits.minY !== null ? viewLimits.minY : Math.min(...dataPoints.flatMap(p => p.ys.filter(y => y !== null)));
  let maxY = viewLimits.maxY !== null ? viewLimits.maxY : Math.max(...dataPoints.flatMap(p => p.ys.filter(y => y !== null)));

  if (viewLimits.minY === null) {
    const yRange = maxY - minY || 1;
    minY -= yRange * 0.05;
    maxY += yRange * 0.05;
  }

  const mapX = (x) => margin.left + (maxX === minX ? 0.5 : (x - minX) / (maxX - minX)) * plotWidth;
  const mapY = (y) => margin.top + plotHeight - (maxY === minY ? 0.5 : (y - minY) / (maxY - minY)) * plotHeight;

  const unmapX = (px) => minX + (px - margin.left) / plotWidth * (maxX - minX);
  const unmapY = (py) => maxY - (py - margin.top) / plotHeight * (maxY - minY);

  // Recorte
  const clipId = "plot-clip-area";
  const defs = document.createElementNS(SVG_NS, 'defs');
  defs.innerHTML = `<clipPath id="${clipId}"><rect x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" /></clipPath>`;
  svg.appendChild(defs);

  const clippedGroup = document.createElementNS(SVG_NS, 'g');
  clippedGroup.setAttribute('clip-path', `url(#${clipId})`);
  svg.appendChild(clippedGroup);

  // Cuadrícula y Ejes
  const gridGroup = document.createElementNS(SVG_NS, 'g');
  const xNice = getNiceTicks(minX, maxX, 6);
  const yNice = getNiceTicks(minY, maxY, 6);

  xNice.ticks.forEach((valX) => {
    const px = mapX(valX);
    if (px >= margin.left && px <= width - margin.right) {
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', px); line.setAttribute('y1', margin.top);
      line.setAttribute('x2', px); line.setAttribute('y2', height - margin.bottom);
      line.setAttribute('stroke', '#e0e0e0'); line.setAttribute('stroke-dasharray', '3 3');
      clippedGroup.appendChild(line);

      const tick = document.createElementNS(SVG_NS, 'line');
      tick.setAttribute('x1', px); tick.setAttribute('y1', height - margin.bottom);
      tick.setAttribute('x2', px); tick.setAttribute('y2', height - margin.bottom + 5);
      tick.setAttribute('stroke', '#000'); svg.appendChild(tick);

      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', px); text.setAttribute('y', height - margin.bottom + 20);
      text.setAttribute('text-anchor', 'middle'); text.setAttribute('font-size', '12px');
      text.setAttribute('font-family', 'sans-serif'); text.setAttribute('fill', '#555');
      text.textContent = valX.toFixed(xNice.decimals);
      svg.appendChild(text);
    }
  });

  yNice.ticks.forEach((valY) => {
    const py = mapY(valY);
    if (py >= margin.top && py <= height - margin.bottom) {
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', margin.left); line.setAttribute('y1', py);
      line.setAttribute('x2', width - margin.right); line.setAttribute('y2', py);
      line.setAttribute('stroke', '#e0e0e0'); line.setAttribute('stroke-dasharray', '3 3');
      clippedGroup.appendChild(line);

      const tick = document.createElementNS(SVG_NS, 'line');
      tick.setAttribute('x1', margin.left - 5); tick.setAttribute('y1', py);
      tick.setAttribute('x2', margin.left); tick.setAttribute('y2', py);
      tick.setAttribute('stroke', '#000'); svg.appendChild(tick);

      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', margin.left - 10); text.setAttribute('y', py + 4);
      text.setAttribute('text-anchor', 'end'); text.setAttribute('font-size', '12px');
      text.setAttribute('font-family', 'sans-serif'); text.setAttribute('fill', '#555');
      text.textContent = valY.toFixed(yNice.decimals);
      svg.appendChild(text);
    }
  });

  const axisGroup = document.createElementNS(SVG_NS, 'g');
  const xAxis = document.createElementNS(SVG_NS, 'line');
  xAxis.setAttribute('x1', margin.left); xAxis.setAttribute('y1', height - margin.bottom);
  xAxis.setAttribute('x2', width - margin.right); xAxis.setAttribute('y2', height - margin.bottom);
  xAxis.setAttribute('stroke', '#000'); xAxis.setAttribute('stroke-width', '1.5');

  const yAxis = document.createElementNS(SVG_NS, 'line');
  yAxis.setAttribute('x1', margin.left); yAxis.setAttribute('y1', margin.top);
  yAxis.setAttribute('x2', margin.left); yAxis.setAttribute('y2', height - margin.bottom);
  yAxis.setAttribute('stroke', '#000'); yAxis.setAttribute('stroke-width', '1.5');
  axisGroup.appendChild(xAxis); axisGroup.appendChild(yAxis);
  svg.appendChild(axisGroup);

  const xLabel = document.createElementNS(SVG_NS, 'text');
  xLabel.setAttribute('x', margin.left + plotWidth / 2); xLabel.setAttribute('y', height - 15);
  xLabel.setAttribute('text-anchor', 'middle'); xLabel.setAttribute('font-size', '14px');
  xLabel.setAttribute('font-family', 'sans-serif'); xLabel.setAttribute('font-weight', 'bold');
  xLabel.textContent = "X Axis"; svg.appendChild(xLabel);

  const yLabel = document.createElementNS(SVG_NS, 'text');
  yLabel.setAttribute('x', -margin.top - plotHeight / 2); yLabel.setAttribute('y', 20);
  yLabel.setAttribute('transform', 'rotate(-90)'); yLabel.setAttribute('text-anchor', 'middle');
  yLabel.setAttribute('font-size', '14px'); yLabel.setAttribute('font-family', 'sans-serif');
  yLabel.setAttribute('font-weight', 'bold'); yLabel.textContent = "Y Axis"; svg.appendChild(yLabel);

  // Líneas
  const colors = ['#000000', '#cc0000', '#0055cc', '#009933', '#6600cc', '#ff9900', '#00cccc', '#cc00cc'];

  for (let j = 0; j < ySeries.length; j++) {
    let pathData = '';
    let penDown = false;
    for (let i = 0; i < dataPoints.length; i++) {
      const yVal = dataPoints[i].ys[j];
      if (yVal === null) { penDown = false; continue; }

      const px = mapX(dataPoints[i].x);
      const py = mapY(yVal);

      if (!penDown) { pathData += ` M ${px.toFixed(2)} ${py.toFixed(2)}`; penDown = true; }
      else { pathData += ` L ${px.toFixed(2)} ${py.toFixed(2)}`; }
    }
    if (pathData !== '') {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', pathData.trim()); path.setAttribute('fill', 'none');
      path.setAttribute('stroke', colors[j % colors.length]); path.setAttribute('stroke-width', '1.5');
      path.setAttribute('stroke-linejoin', 'round');
      clippedGroup.appendChild(path);
    }
  }

  return { mapX, mapY, unmapX, unmapY, plotWidth, plotHeight, minX, maxX, minY, maxY };
}
