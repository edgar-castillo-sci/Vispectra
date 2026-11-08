import { generateTicks, formatLabel } from './axes.js';
import { state } from './state.js';

const SVG_NS = "http://www.w3.org/2000/svg";

export function render(svg, dataPoints, ySeries, viewLimits, margin, width, height, yIndices) {
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const configX = state.axisConfig.x;
  const configY = state.axisConfig.y;

  const isLogX = configX.scale === 'log10';
  const isLogY = configY.scale === 'log10';

  const transformX = (v) => isLogX ? Math.log10(Math.max(v, 1e-15)) : v;
  const transformY = (v) => isLogY ? Math.log10(Math.max(v, 1e-15)) : v;
  const inverseTransformX = (v) => isLogX ? Math.pow(10, v) : v;
  const inverseTransformY = (v) => isLogY ? Math.pow(10, v) : v;

  let validXs = dataPoints.map(p => p.x);
  if (isLogX) validXs = validXs.filter(x => x > 0);
  if (validXs.length === 0) validXs = [1e-10];

  let validYs = dataPoints.flatMap(p => p.ys.filter(y => y !== null));
  if (isLogY) validYs = validYs.filter(y => y > 0);
  if (validYs.length === 0) validYs = [1e-10];

  let minX = viewLimits.minX !== null ? viewLimits.minX : Math.min(...validXs);
  let maxX = viewLimits.maxX !== null ? viewLimits.maxX : Math.max(...validXs);
  let minY = viewLimits.minY !== null ? viewLimits.minY : Math.min(...validYs);
  let maxY = viewLimits.maxY !== null ? viewLimits.maxY : Math.max(...validYs);

  if (isLogX && minX <= 0) minX = 1e-10;
  if (isLogY && minY <= 0) minY = 1e-10;

  if (viewLimits.minY === null && !isLogY) {
    const yRange = maxY - minY || 1;
    minY -= yRange * 0.05;
    maxY += yRange * 0.05;
  }

  const tMinX = transformX(minX), tMaxX = transformX(maxX);
  const tMinY = transformY(minY), tMaxY = transformY(maxY);

  const mapX = (x) => margin.left + (tMaxX === tMinX ? 0.5 : (transformX(x) - tMinX) / (tMaxX - tMinX)) * plotWidth;
  const mapY = (y) => margin.top + plotHeight - (tMaxY === tMinY ? 0.5 : (transformY(y) - tMinY) / (tMaxY - tMinY)) * plotHeight;

  const unmapX = (px) => inverseTransformX(tMinX + (px - margin.left) / plotWidth * (tMaxX - tMinX));
  const unmapY = (py) => inverseTransformY(tMaxY - (py - margin.top) / plotHeight * (tMaxY - tMinY));

  const clipId = "plot-clip-area";
  const defs = document.createElementNS(SVG_NS, 'defs');
  defs.innerHTML = `<clipPath id="${clipId}"><rect x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" /></clipPath>`;
  svg.appendChild(defs);
  const clippedGroup = document.createElementNS(SVG_NS, 'g');
  clippedGroup.setAttribute('clip-path', `url(#${clipId})`);
  svg.appendChild(clippedGroup);

  const gridGroup = document.createElementNS(SVG_NS, 'g');
  const xTicksData = generateTicks(tMinX, tMaxX, configX, isLogX);
  const yTicksData = generateTicks(tMinY, tMaxY, configY, isLogY);

  const drawTicksAndGrid = (ticksData, isXAxis) => {
    ticksData.minorTicks.forEach(val => {
      const p = isXAxis ? margin.left + (val - tMinX)/(tMaxX - tMinX)*plotWidth : margin.top + plotHeight - (val - tMinY)/(tMaxY - tMinY)*plotHeight;

      // Margen de tolerancia de 1px
      if (p >= (isXAxis ? margin.left : margin.top) - 1 && p <= (isXAxis ? width - margin.right : height - margin.bottom) + 1) {
        const line = document.createElementNS(SVG_NS, 'line');
        if (isXAxis) { line.setAttribute('x1', p); line.setAttribute('x2', p); line.setAttribute('y1', margin.top); line.setAttribute('y2', height - margin.bottom); }
        else { line.setAttribute('y1', p); line.setAttribute('y2', p); line.setAttribute('x1', margin.left); line.setAttribute('x2', width - margin.right); }
        line.setAttribute('stroke', '#f0f0f0'); line.setAttribute('stroke-width', '1');
        clippedGroup.appendChild(line);
      }
    });

    ticksData.ticks.forEach(val => {
      const actualVal = isXAxis ? inverseTransformX(val) : inverseTransformY(val);
      const p = isXAxis ? margin.left + (val - tMinX)/(tMaxX - tMinX)*plotWidth : margin.top + plotHeight - (val - tMinY)/(tMaxY - tMinY)*plotHeight;

      if (p >= (isXAxis ? margin.left : margin.top) - 1 && p <= (isXAxis ? width - margin.right : height - margin.bottom) + 1) {
        const line = document.createElementNS(SVG_NS, 'line');
        if (isXAxis) { line.setAttribute('x1', p); line.setAttribute('x2', p); line.setAttribute('y1', margin.top); line.setAttribute('y2', height - margin.bottom); }
        else { line.setAttribute('y1', p); line.setAttribute('y2', p); line.setAttribute('x1', margin.left); line.setAttribute('x2', width - margin.right); }
        line.setAttribute('stroke', '#e0e0e0'); line.setAttribute('stroke-dasharray', '3 3');
        clippedGroup.appendChild(line);

        const tick = document.createElementNS(SVG_NS, 'line');
        if (isXAxis) { tick.setAttribute('x1', p); tick.setAttribute('x2', p); tick.setAttribute('y1', height - margin.bottom); tick.setAttribute('y2', height - margin.bottom + 5); }
        else { tick.setAttribute('y1', p); tick.setAttribute('y2', p); tick.setAttribute('x1', margin.left - 5); tick.setAttribute('x2', margin.left); }
        tick.setAttribute('stroke', '#000'); svg.appendChild(tick);

        const text = document.createElementNS(SVG_NS, 'text');
        const activeFormat = isXAxis ? (isLogX ? 'log10' : configX.format) : (isLogY ? 'log10' : configY.format);
        const labelStr = formatLabel(actualVal, ticksData.decimals, activeFormat);

        if (isXAxis) { text.setAttribute('x', p); text.setAttribute('y', height - margin.bottom + 20); text.setAttribute('text-anchor', 'middle'); }
        else { text.setAttribute('x', margin.left - 10); text.setAttribute('y', p + 4); text.setAttribute('text-anchor', 'end'); }
        text.setAttribute('font-size', '12px'); text.setAttribute('font-family', 'sans-serif'); text.setAttribute('fill', '#555'); text.textContent = labelStr;
        svg.appendChild(text);
      }
    });
  };

  drawTicksAndGrid(xTicksData, true);
  drawTicksAndGrid(yTicksData, false);

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

  const xLabelText = configX.label || "X Axis";
  const yLabelText = configY.label || "Y Axis";

  const xLabel = document.createElementNS(SVG_NS, 'text');
  xLabel.setAttribute('x', margin.left + plotWidth / 2); xLabel.setAttribute('y', height - 15);
  xLabel.setAttribute('text-anchor', 'middle'); xLabel.setAttribute('font-size', '14px'); xLabel.setAttribute('font-family', 'sans-serif'); xLabel.setAttribute('font-weight', 'bold');
  xLabel.textContent = xLabelText; svg.appendChild(xLabel);

  const yLabel = document.createElementNS(SVG_NS, 'text');
  yLabel.setAttribute('x', -margin.top - plotHeight / 2); yLabel.setAttribute('y', 20);
  yLabel.setAttribute('transform', 'rotate(-90)'); yLabel.setAttribute('text-anchor', 'middle'); yLabel.setAttribute('font-size', '14px'); yLabel.setAttribute('font-family', 'sans-serif'); yLabel.setAttribute('font-weight', 'bold');
  yLabel.textContent = yLabelText; svg.appendChild(yLabel);

  if (state.graphConfig.title) {
    const titleEl = document.createElementNS(SVG_NS, 'text');
    titleEl.setAttribute('x', margin.left + plotWidth / 2);
    titleEl.setAttribute('y', 25);
    titleEl.setAttribute('text-anchor', 'middle');
    titleEl.setAttribute('font-size', '16px');
    titleEl.setAttribute('font-family', 'sans-serif');
    titleEl.setAttribute('font-weight', 'bold');
    titleEl.setAttribute('fill', '#222');
    titleEl.textContent = state.graphConfig.title;
    svg.appendChild(titleEl);
  }

  for (let j = 0; j < ySeries.length; j++) {
    const originalIndex = yIndices[j];
    const colorIdx = originalIndex % state.defaultColors.length;
    const styleIdx = Math.floor(originalIndex / state.defaultColors.length) % state.defaultStyles.length;
    const fallbackConf = { color: state.defaultColors[colorIdx], style: state.defaultStyles[styleIdx], width: 1.5 };
    const sConf = state.seriesConfig[originalIndex] || fallbackConf;

    let dashArray = 'none';
    if (sConf.style === 'dashed') dashArray = '6 4';
    if (sConf.style === 'dotted') dashArray = '2 4';
    if (sConf.style === 'dashdot') dashArray = '6 4 2 4';

    let pathData = '';
    let penDown = false;
    for (let i = 0; i < dataPoints.length; i++) {
      const xVal = dataPoints[i].x;
      const yVal = dataPoints[i].ys[j];

      if (yVal === null || (isLogY && yVal <= 0) || (isLogX && xVal <= 0)) { penDown = false; continue; }

      const px = mapX(xVal);
      const py = mapY(yVal);

      if (!penDown) { pathData += ` M ${px.toFixed(2)} ${py.toFixed(2)}`; penDown = true; }
      else { pathData += ` L ${px.toFixed(2)} ${py.toFixed(2)}`; }
    }
    if (pathData !== '') {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', pathData.trim()); path.setAttribute('fill', 'none');
      path.setAttribute('stroke', sConf.color); path.setAttribute('stroke-width', sConf.width);
      path.setAttribute('stroke-dasharray', dashArray); path.setAttribute('stroke-linejoin', 'round');
      clippedGroup.appendChild(path);
    }
  }

  if (state.graphConfig.legend.show && ySeries.length > 0) {
    const legendGroup = document.createElementNS(SVG_NS, 'g');

    const lineSamples = ySeries.map((_, j) => {
      const origIdx = yIndices[j];
      return state.seriesConfig[origIdx]?.label || `Col ${origIdx}`;
    });

    const maxTextLength = Math.max(...lineSamples.map(t => t.length));
    const boxWidth = Math.max(120, maxTextLength * 7 + 60);
    const boxHeight = ySeries.length * 20 + 10;

    let boxX = 0, boxY = 0;
    const padding = 10;

    if (state.graphConfig.legend.position === 'top-right') {
      boxX = margin.left + plotWidth - boxWidth - padding;
      boxY = margin.top + padding;
    } else if (state.graphConfig.legend.position === 'top-left') {
      boxX = margin.left + padding;
      boxY = margin.top + padding;
    } else if (state.graphConfig.legend.position === 'bottom-right') {
      boxX = margin.left + plotWidth - boxWidth - padding;
      boxY = margin.top + plotHeight - boxHeight - padding;
    } else if (state.graphConfig.legend.position === 'bottom-left') {
      boxX = margin.left + padding;
      boxY = margin.top + plotHeight - boxHeight - padding;
    }

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', boxX); rect.setAttribute('y', boxY);
    rect.setAttribute('width', boxWidth); rect.setAttribute('height', boxHeight);
    rect.setAttribute('fill', 'rgba(255, 255, 255, 0.85)');
    rect.setAttribute('stroke', '#999'); rect.setAttribute('stroke-width', '1');
    rect.setAttribute('rx', '4');
    legendGroup.appendChild(rect);

    for (let j = 0; j < ySeries.length; j++) {
      const origIdx = yIndices[j];
      const colorIdx = origIdx % state.defaultColors.length;
      const styleIdx = Math.floor(origIdx / state.defaultColors.length) % state.defaultStyles.length;
      const fallback = { color: state.defaultColors[colorIdx], style: state.defaultStyles[styleIdx], width: 1.5, label: `Col ${origIdx}` };
      const conf = state.seriesConfig[origIdx] || fallback;

      let dashArray = 'none';
      if (conf.style === 'dashed') dashArray = '6 4';
      if (conf.style === 'dotted') dashArray = '2 4';
      if (conf.style === 'dashdot') dashArray = '6 4 2 4';

      const itemY = boxY + 15 + j * 20;

      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', boxX + 10); line.setAttribute('y1', itemY);
      line.setAttribute('x2', boxX + 40); line.setAttribute('y2', itemY);
      line.setAttribute('stroke', conf.color); line.setAttribute('stroke-width', conf.width);
      line.setAttribute('stroke-dasharray', dashArray);
      legendGroup.appendChild(line);

      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', boxX + 48); text.setAttribute('y', itemY + 4);
      text.setAttribute('font-size', '12px'); text.setAttribute('font-family', 'sans-serif');
      text.setAttribute('fill', '#333');
      text.textContent = conf.label;
      legendGroup.appendChild(text);
    }

    svg.appendChild(legendGroup);
  }

  return { mapX, mapY, unmapX, unmapY, plotWidth, plotHeight, minX, maxX, minY, maxY };
}
