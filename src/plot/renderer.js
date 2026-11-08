import { generateTicks, formatLabel } from './axes.js';
import { state } from './state.js';
import { downsampleMinMaxLTTB } from './downsampler.js';

const SVG_NS = "http://www.w3.org/2000/svg";

export function render(svg, dataPoints, ySeries, viewLimits, margin, baseWidth, baseHeight, yIndices) {
  const plotWidth = baseWidth - margin.left - margin.right;
  const plotHeight = baseHeight - margin.top - margin.bottom;

  // =========================================================
  // 1. CALCULAR ESPACIO EXTRA PARA LA LEYENDA
  // =========================================================
  const legendCfg = state.graphConfig.legend;
  const showLegend = legendCfg.show && ySeries.length > 0;

  let extraW = 0, extraH = 0;
  let legendMeta = null;

  if (showLegend) {
    if (legendCfg.position === 'right') {
      const ROW_H = 22;
      const COL_W = 170;
      const itemsPerCol = Math.max(1, Math.floor(plotHeight / ROW_H));
      const numCols = Math.ceil(ySeries.length / itemsPerCol);
      extraW = 30 + numCols * COL_W;
      legendMeta = { itemsPerCol, numCols, ROW_H, COL_W };
    } else if (legendCfg.position === 'bottom') {
      const ROW_H = 22;
      const ITEM_W = 170;
      const itemsPerRow = Math.max(1, Math.floor(plotWidth / ITEM_W));
      const numRows = Math.ceil(ySeries.length / itemsPerRow);
      extraH = 30 + numRows * ROW_H;
      legendMeta = { itemsPerRow, numRows, ROW_H, ITEM_W };
    }
  }

  const totalWidth = baseWidth + extraW;
  const totalHeight = baseHeight + extraH;

  svg.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`);
  const wrapper = svg.parentNode;
  wrapper.style.maxWidth = `${totalWidth}px`;
  wrapper.style.aspectRatio = `${totalWidth} / ${totalHeight}`;

  // =========================================================
  // 2. CANVAS
  // =========================================================
  let canvas = document.getElementById('plotCanvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'plotCanvas';
    canvas.style.position = 'absolute';
    canvas.style.top = '0'; canvas.style.left = '0';
    canvas.style.width = '100%'; canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '1';
    svg.parentNode.appendChild(canvas);
  } else {
    const ctx0 = canvas.getContext('2d');
    ctx0.clearRect(0, 0, canvas.width, canvas.height);
  }

  // =========================================================
  // 3. LÓGICA DE ESCALAS Y LÍMITES (CON OPTIMIZACIÓN BINARIA)
  // =========================================================
  const configX = state.axisConfig.x;
  const configY = state.axisConfig.y;
  const isLogX = configX.scale === 'log10';
  const isLogY = configY.scale === 'log10';

  const transformX = (v) => isLogX ? Math.log10(Math.max(v, 1e-15)) : v;
  const transformY = (v) => isLogY ? Math.log10(Math.max(v, 1e-15)) : v;
  const inverseTransformX = (v) => isLogX ? Math.pow(10, v) : v;
  const inverseTransformY = (v) => isLogY ? Math.pow(10, v) : v;

  // Límites X
  let minX = viewLimits.minX;
  let maxX = viewLimits.maxX;
  if (minX === null || maxX === null) {
    minX = dataPoints[0].x;
    maxX = dataPoints[dataPoints.length - 1].x;
  }

  // Búsqueda binaria
  const strictStart = findFirstIndexGreaterThan(dataPoints, minX);
  const strictEnd = findLastIndexLessThan(dataPoints, maxX);

  // PADDING DE 1 PUNTO A LOS LADOS (Para que las líneas crucen el borde sin cortarse en medio)
  const drawStart = Math.max(0, strictStart - 1);
  const drawEnd = Math.min(dataPoints.length - 1, strictEnd + 1);

  // Datos estrictamente visibles (para calcular el rango del eje Y)
  const visibleDataPoints = dataPoints.slice(strictStart, strictEnd + 1);

  // Datos que se van a dibujar (con padding para recorte limpio)
  const drawableDataPoints = dataPoints.slice(drawStart, drawEnd + 1);

  // Fallback si el zoom quedó en una zona sin datos exactos
  const pointsForLimits = visibleDataPoints.length > 0 ? visibleDataPoints : drawableDataPoints;

  // Límites Y (calculados con los datos estrictamente visibles)
  let minY = viewLimits.minY;
  let maxY = viewLimits.maxY;
  if (minY === null || maxY === null) {
    minY = Infinity; maxY = -Infinity;
    for (let i = 0; i < pointsForLimits.length; i++) {
      const p = pointsForLimits[i];
      for (let j = 0; j < ySeries.length; j++) {
        const y = p.ys[j];
        if (y !== null && (!isLogY || y > 0)) {
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (minY === Infinity) { minY = 0; maxY = 1; }
  }

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

  const unmapX = (px) => inverseTransformX(tMinX + ((px - margin.left) / plotWidth) * (tMaxX - tMinX));
  const unmapY = (py) => inverseTransformY(tMaxY - ((py - margin.top) / plotHeight) * (tMaxY - tMinY));

  // =========================================================
  // 4. EJES, CUADRÍCULA Y TEXTO
  // =========================================================
  const clipId = "plot-clip-area";
  const defs = document.createElementNS(SVG_NS, 'defs');
  defs.innerHTML = `<clipPath id="${clipId}"><rect x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" /></clipPath>`;
  svg.appendChild(defs);

  const clippedGroup = document.createElementNS(SVG_NS, 'g');
  clippedGroup.setAttribute('clip-path', `url(#${clipId})`);
  svg.appendChild(clippedGroup);

  const xTicksData = generateTicks(tMinX, tMaxX, configX, isLogX);
  const yTicksData = generateTicks(tMinY, tMaxY, configY, isLogY);

  const drawTicksAndGrid = (ticksData, isXAxis) => {
    const activeConfig = isXAxis ? configX : configY;
    const isLog = isXAxis ? isLogX : isLogY;
    const tMin = isXAxis ? tMinX : tMinY;
    const tMax = isXAxis ? tMaxX : tMaxY;

    ticksData.minorTicks.forEach(val => {
      const p = isXAxis ? margin.left + (val - tMin)/(tMax - tMin)*plotWidth : margin.top + plotHeight - (val - tMin)/(tMax - tMin)*plotHeight;
      if (p >= (isXAxis ? margin.left : margin.top) - 1 && p <= (isXAxis ? baseWidth - margin.right : baseHeight - margin.bottom) + 1) {
        const line = document.createElementNS(SVG_NS, 'line');
        if (isXAxis) { line.setAttribute('x1', p); line.setAttribute('x2', p); line.setAttribute('y1', margin.top); line.setAttribute('y2', baseHeight - margin.bottom); }
        else { line.setAttribute('y1', p); line.setAttribute('y2', p); line.setAttribute('x1', margin.left); line.setAttribute('x2', baseWidth - margin.right); }
        line.setAttribute('stroke', '#ebebeb'); line.setAttribute('stroke-width', '1');
        clippedGroup.appendChild(line);

        if (activeConfig.showMinorLabels) {
          const actualVal = isXAxis ? inverseTransformX(val) : inverseTransformY(val);
          const text = document.createElementNS(SVG_NS, 'text');
          const labelStr = formatLabel(actualVal, ticksData.decimals, activeConfig.format, isLog);
          if (isXAxis) { text.setAttribute('x', p); text.setAttribute('y', baseHeight - margin.bottom + 20); text.setAttribute('text-anchor', 'middle'); }
          else { text.setAttribute('x', margin.left - 10); text.setAttribute('y', p + 4); text.setAttribute('text-anchor', 'end'); }
          text.setAttribute('font-size', '9px'); text.setAttribute('font-family', 'sans-serif'); text.setAttribute('fill', '#999'); text.textContent = labelStr;
          svg.appendChild(text);
        }
      }
    });

    ticksData.ticks.forEach(val => {
      const actualVal = isXAxis ? inverseTransformX(val) : inverseTransformY(val);
      const p = isXAxis ? margin.left + (val - tMin)/(tMax - tMin)*plotWidth : margin.top + plotHeight - (val - tMin)/(tMax - tMin)*plotHeight;
      if (p >= (isXAxis ? margin.left : margin.top) - 1 && p <= (isXAxis ? baseWidth - margin.right : baseHeight - margin.bottom) + 1) {
        const line = document.createElementNS(SVG_NS, 'line');
        if (isXAxis) { line.setAttribute('x1', p); line.setAttribute('x2', p); line.setAttribute('y1', margin.top); line.setAttribute('y2', baseHeight - margin.bottom); }
        else { line.setAttribute('y1', p); line.setAttribute('y2', p); line.setAttribute('x1', margin.left); line.setAttribute('x2', baseWidth - margin.right); }
        line.setAttribute('stroke', '#e0e0e0'); line.setAttribute('stroke-dasharray', '3 3');
        clippedGroup.appendChild(line);

        const tick = document.createElementNS(SVG_NS, 'line');
        if (isXAxis) { tick.setAttribute('x1', p); tick.setAttribute('x2', p); tick.setAttribute('y1', baseHeight - margin.bottom); tick.setAttribute('y2', baseHeight - margin.bottom + 5); }
        else { tick.setAttribute('y1', p); tick.setAttribute('y2', p); tick.setAttribute('x1', margin.left - 5); tick.setAttribute('x2', margin.left); }
        tick.setAttribute('stroke', '#000'); svg.appendChild(tick);

        const text = document.createElementNS(SVG_NS, 'text');
        const labelStr = formatLabel(actualVal, ticksData.decimals, activeConfig.format, isLog);
        if (isXAxis) { text.setAttribute('x', p); text.setAttribute('y', baseHeight - margin.bottom + 20); text.setAttribute('text-anchor', 'middle'); }
        else { text.setAttribute('x', margin.left - 10); text.setAttribute('y', p + 4); text.setAttribute('text-anchor', 'end'); }
        text.setAttribute('font-size', '12px'); text.setAttribute('font-family', 'sans-serif'); text.setAttribute('fill', '#555'); text.textContent = labelStr;
        svg.appendChild(text);
      }
    });
  };

  drawTicksAndGrid(xTicksData, true);
  drawTicksAndGrid(yTicksData, false);

  // Ejes
  const axisGroup = document.createElementNS(SVG_NS, 'g');
  const xAxis = document.createElementNS(SVG_NS, 'line');
  xAxis.setAttribute('x1', margin.left); xAxis.setAttribute('y1', baseHeight - margin.bottom);
  xAxis.setAttribute('x2', baseWidth - margin.right); xAxis.setAttribute('y2', baseHeight - margin.bottom);
  xAxis.setAttribute('stroke', '#000'); xAxis.setAttribute('stroke-width', '1.5');

  const yAxis = document.createElementNS(SVG_NS, 'line');
  yAxis.setAttribute('x1', margin.left); yAxis.setAttribute('y1', margin.top);
  yAxis.setAttribute('x2', margin.left); yAxis.setAttribute('y2', baseHeight - margin.bottom);
  yAxis.setAttribute('stroke', '#000'); yAxis.setAttribute('stroke-width', '1.5');
  axisGroup.appendChild(xAxis); axisGroup.appendChild(yAxis);
  svg.appendChild(axisGroup);

  // Títulos
  const xLabel = document.createElementNS(SVG_NS, 'text');
  xLabel.setAttribute('x', margin.left + plotWidth / 2); xLabel.setAttribute('y', baseHeight - 15);
  xLabel.setAttribute('text-anchor', 'middle'); xLabel.setAttribute('font-size', '14px'); xLabel.setAttribute('font-family', 'sans-serif'); xLabel.setAttribute('font-weight', 'bold');
  xLabel.textContent = configX.label || "X Axis"; svg.appendChild(xLabel);

  const yLabel = document.createElementNS(SVG_NS, 'text');
  yLabel.setAttribute('x', -margin.top - plotHeight / 2); yLabel.setAttribute('y', 20);
  yLabel.setAttribute('transform', 'rotate(-90)'); yLabel.setAttribute('text-anchor', 'middle'); yLabel.setAttribute('font-size', '14px'); yLabel.setAttribute('font-family', 'sans-serif'); yLabel.setAttribute('font-weight', 'bold');
  yLabel.textContent = configY.label || "Y Axis"; svg.appendChild(yLabel);

  if (state.graphConfig.title) {
    const titleEl = document.createElementNS(SVG_NS, 'text');
    titleEl.setAttribute('x', margin.left + plotWidth / 2); titleEl.setAttribute('y', 25);
    titleEl.setAttribute('text-anchor', 'middle'); titleEl.setAttribute('font-size', '16px'); titleEl.setAttribute('font-family', 'sans-serif'); titleEl.setAttribute('font-weight', 'bold'); titleEl.setAttribute('fill', '#222');
    titleEl.textContent = state.graphConfig.title; svg.appendChild(titleEl);
  }

  // =========================================================
  // 5. LÍNEAS (SVG o Canvas) - USANDO drawableDataPoints
  // =========================================================
  const MAX_POINTS_FOR_SVG = 2000;
  const useCanvas = drawableDataPoints.length > MAX_POINTS_FOR_SVG;

  if (!useCanvas) {
    for (let j = 0; j < ySeries.length; j++) {
      const originalIndex = yIndices[j];
      const colorIdx = originalIndex % state.defaultColors.length;
      const styleIdx = Math.floor(originalIndex / state.defaultColors.length) % state.defaultStyles.length;
      const sConf = state.seriesConfig[originalIndex] || { color: state.defaultColors[colorIdx], style: state.defaultStyles[styleIdx], width: 1.5 };

      let dashArray = 'none';
      if (sConf.style === 'dashed') dashArray = '6 4';
      if (sConf.style === 'dotted') dashArray = '2 4';
      if (sConf.style === 'dashdot') dashArray = '6 4 2 4';

      let pathData = '';
      let penDown = false;
      for (let i = 0; i < drawableDataPoints.length; i++) {
        const xVal = drawableDataPoints[i].x;
        const yVal = drawableDataPoints[i].ys[j];
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
  } else {
    const displayDataPoints = downsampleForCanvas(drawableDataPoints, ySeries, ySeries.length > 10 ? 1000 : 2000);
    requestAnimationFrame(() => {
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale((rect.width / totalWidth) * dpr, (rect.height / totalHeight) * dpr);
      ctx.beginPath();
      ctx.rect(margin.left, margin.top, plotWidth, plotHeight);
      ctx.clip();

      for (let j = 0; j < ySeries.length; j++) {
        const originalIndex = yIndices[j];
        const colorIdx = originalIndex % state.defaultColors.length;
        const styleIdx = Math.floor(originalIndex / state.defaultColors.length) % state.defaultStyles.length;
        const sConf = state.seriesConfig[originalIndex] || { color: state.defaultColors[colorIdx], style: state.defaultStyles[styleIdx], width: 1.5 };
        ctx.beginPath();
        ctx.strokeStyle = sConf.color;
        ctx.lineWidth = sConf.width;
        ctx.lineJoin = 'round';
        if (sConf.style === 'dashed') ctx.setLineDash([6, 4]);
        else if (sConf.style === 'dotted') ctx.setLineDash([2, 4]);
        else if (sConf.style === 'dashdot') ctx.setLineDash([6, 4, 2, 4]);
        else ctx.setLineDash([]);
        let penDown = false;
        for (let i = 0; i < displayDataPoints.length; i++) {
          const xVal = displayDataPoints[i].x;
          const yVal = displayDataPoints[i].ys[j];
          if (yVal === null || (isLogY && yVal <= 0) || (isLogX && xVal <= 0)) { penDown = false; continue; }
          const px = mapX(xVal);
          const py = mapY(yVal);
          if (!penDown) { ctx.moveTo(px, py); penDown = true; }
          else { ctx.lineTo(px, py); }
        }
        ctx.stroke();
      }
    });
  }

  // =========================================================
  // 6. LEYENDA
  // =========================================================
  if (showLegend) {
    const legendGroup = document.createElementNS(SVG_NS, 'g');

    const labels = ySeries.map((_, j) => {
      const origIdx = yIndices[j];
      return state.seriesConfig[origIdx]?.label || `Col ${origIdx}`;
    });

    const drawItem = (group, x, y, index) => {
      const origIdx = yIndices[index];
      const colorIdx = origIdx % state.defaultColors.length;
      const styleIdx = Math.floor(origIdx / state.defaultColors.length) % state.defaultStyles.length;
      const conf = state.seriesConfig[origIdx] || { color: state.defaultColors[colorIdx], style: state.defaultStyles[styleIdx], width: 1.5 };
      let dashArray = 'none';
      if (conf.style === 'dashed') dashArray = '6 4';
      if (conf.style === 'dotted') dashArray = '2 4';
      if (conf.style === 'dashdot') dashArray = '6 4 2 4';

      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', x); line.setAttribute('y1', y);
      line.setAttribute('x2', x + 25); line.setAttribute('y2', y);
      line.setAttribute('stroke', conf.color); line.setAttribute('stroke-width', conf.width);
      line.setAttribute('stroke-dasharray', dashArray);
      group.appendChild(line);

      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', x + 30); text.setAttribute('y', y + 4);
      text.setAttribute('font-size', '12px'); text.setAttribute('font-family', 'sans-serif');
      text.setAttribute('fill', '#333');
      text.textContent = labels[index];
      group.appendChild(text);
    };

    const pos = legendCfg.position;

    if (pos === 'right' && legendMeta) {
      const sepX = baseWidth + 12;
      const sep = document.createElementNS(SVG_NS, 'line');
      sep.setAttribute('x1', sepX); sep.setAttribute('y1', margin.top);
      sep.setAttribute('x2', sepX); sep.setAttribute('y2', baseHeight - margin.bottom);
      sep.setAttribute('stroke', '#ddd'); sep.setAttribute('stroke-width', '1');
      sep.setAttribute('stroke-dasharray', '4 4');
      svg.appendChild(sep);

      const { itemsPerCol, numCols, ROW_H, COL_W } = legendMeta;
      const startX = baseWidth + 30;
      for (let j = 0; j < ySeries.length; j++) {
        const col = Math.floor(j / itemsPerCol);
        const row = j % itemsPerCol;
        drawItem(legendGroup, startX + col * COL_W, margin.top + row * ROW_H + 15, j);
      }
    } else if (pos === 'bottom' && legendMeta) {
      const sepY = baseHeight + 12;
      const sep = document.createElementNS(SVG_NS, 'line');
      sep.setAttribute('x1', margin.left); sep.setAttribute('y1', sepY);
      sep.setAttribute('x2', baseWidth - margin.right); sep.setAttribute('y2', sepY);
      sep.setAttribute('stroke', '#ddd'); sep.setAttribute('stroke-width', '1');
      sep.setAttribute('stroke-dasharray', '4 4');
      svg.appendChild(sep);

      const { itemsPerRow, numRows, ROW_H, ITEM_W } = legendMeta;
      const startY = baseHeight + 30;
      for (let j = 0; j < ySeries.length; j++) {
        const row = Math.floor(j / itemsPerRow);
        const col = j % itemsPerRow;
        drawItem(legendGroup, margin.left + col * ITEM_W, startY + row * ROW_H, j);
      }
    } else {
      const layout = legendCfg.layout || 'vertical';
      const itemWidth = 120;
      const itemHeight = 20;

      let boxWidth, boxHeight;
      if (layout === 'horizontal') {
        boxWidth = ySeries.length * itemWidth + 20;
        boxHeight = itemHeight + 10;
      } else {
        const maxLen = Math.max(...labels.map(t => t.length));
        boxWidth = Math.max(120, maxLen * 7 + 60);
        boxHeight = ySeries.length * itemHeight + 10;
      }

      let boxX = 0, boxY = 0;
      const padding = 10;

      if (pos === 'top-right') { boxX = margin.left + plotWidth - boxWidth - padding; boxY = margin.top + padding; }
      else if (pos === 'top-left') { boxX = margin.left + padding; boxY = margin.top + padding; }
      else if (pos === 'bottom-right') { boxX = margin.left + plotWidth - boxWidth - padding; boxY = margin.top + plotHeight - boxHeight - padding; }
      else if (pos === 'bottom-left') { boxX = margin.left + padding; boxY = margin.top + plotHeight - boxHeight - padding; }

      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', boxX); rect.setAttribute('y', boxY);
      rect.setAttribute('width', boxWidth); rect.setAttribute('height', boxHeight);
      rect.setAttribute('fill', 'rgba(255, 255, 255, 0.85)');
      rect.setAttribute('stroke', '#999'); rect.setAttribute('stroke-width', '1');
      rect.setAttribute('rx', '4');
      legendGroup.appendChild(rect);

      for (let j = 0; j < ySeries.length; j++) {
        let x, y;
        if (layout === 'horizontal') {
          x = boxX + 10 + j * itemWidth;
          y = boxY + 15;
        } else {
          x = boxX + 10;
          y = boxY + 15 + j * itemHeight;
        }
        drawItem(legendGroup, x, y, j);
      }
    }

    svg.appendChild(legendGroup);
  }

  return {
    mapX, mapY, unmapX, unmapY,
    plotWidth, plotHeight,
    minX, maxX, minY, maxY,
    margin,
    baseWidth, baseHeight,
    totalWidth, totalHeight
  };
}

// =========================================================
// BÚSQUEDA BINARIA
// =========================================================
function findFirstIndexGreaterThan(arr, val) {
  let low = 0, high = arr.length - 1, result = arr.length;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (arr[mid].x >= val) {
      result = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return result;
}

function findLastIndexLessThan(arr, val) {
  let low = 0, high = arr.length - 1, result = -1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (arr[mid].x <= val) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return result;
}

// =========================================================
// DOWNSAMPLER PARA CANVAS
// =========================================================
function downsampleForCanvas(dataPoints, ySeries, targetPoints) {
  if (dataPoints.length <= targetPoints) return dataPoints;
  const selectedIndices = new Set();
  const xToIndex = new Map();
  dataPoints.forEach((p, idx) => xToIndex.set(p.x, idx));

  for (let j = 0; j < ySeries.length; j++) {
    const seriesPoints = [];
    for (let i = 0; i < dataPoints.length; i++) {
      if (dataPoints[i].ys[j] !== null) seriesPoints.push({ x: dataPoints[i].x, y: dataPoints[i].ys[j] });
    }
    if (seriesPoints.length > targetPoints) {
      const down = downsampleMinMaxLTTB(seriesPoints, targetPoints, 4);
      down.forEach(dp => {
        const origIdx = xToIndex.get(dp.x);
        if (origIdx !== undefined) selectedIndices.add(origIdx);
      });
    } else {
      for (let i = 0; i < dataPoints.length; i++) {
        if (dataPoints[i].ys[j] !== null) selectedIndices.add(i);
      }
    }
  }
  const sortedIndices = Array.from(selectedIndices).sort((a, b) => a - b);
  return sortedIndices.map(idx => dataPoints[idx]);
}
