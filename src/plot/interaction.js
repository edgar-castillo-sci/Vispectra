import { state, clearPin, pushHistory } from './state.js';

const SVG_NS = "http://www.w3.org/2000/svg";

export function attachInteraction(ctx) {
  const { svg, dataPoints, yIndices, mapX, unmapX, unmapY, plotWidth, plotHeight, margin, width, height, baseWidth, baseHeight, redraw } = ctx;

  if (!svg || !Array.isArray(dataPoints) || dataPoints.length === 0) return;

  const hoverGroup = document.createElementNS(SVG_NS, 'g');
  hoverGroup.setAttribute('style', 'display: none; pointer-events: none;');
  const crosshair = document.createElementNS(SVG_NS, 'line');
  crosshair.setAttribute('y1', margin.top);
  crosshair.setAttribute('y2', baseHeight - margin.bottom);
  crosshair.setAttribute('stroke', '#666');
  crosshair.setAttribute('stroke-width', '1');
  crosshair.setAttribute('stroke-dasharray', '4 4');
  hoverGroup.appendChild(crosshair);
  svg.appendChild(hoverGroup);

  const overlay = document.createElementNS(SVG_NS, 'rect');
  overlay.setAttribute('x', margin.left);
  overlay.setAttribute('y', margin.top);
  overlay.setAttribute('width', plotWidth);
  overlay.setAttribute('height', plotHeight);
  overlay.setAttribute('fill', 'transparent');
  if (state.currentTool === 'zoom') overlay.setAttribute('style', 'cursor: crosshair;');
  else if (state.currentTool === 'pan') overlay.setAttribute('style', 'cursor: grab;');
  else overlay.setAttribute('style', 'cursor: default;');
  svg.appendChild(overlay);

  const zoomRect = document.createElementNS(SVG_NS, 'rect');
  zoomRect.setAttribute('fill', 'rgba(0, 85, 204, 0.15)');
  zoomRect.setAttribute('stroke', '#0055cc');
  zoomRect.setAttribute('stroke-width', '1');
  zoomRect.setAttribute('stroke-dasharray', '4 4');
  zoomRect.setAttribute('style', 'display: none; pointer-events: none;');
  svg.appendChild(zoomRect);

  let frozenRect = null;
  let panRafScheduled = false;

  const getMousePos = (e) => {
    const rect = frozenRect || svg.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (width / rect.width),
      y: (e.clientY - rect.top) * (height / rect.height),
    };
  };

  const inPlotArea = (pos) => pos.x >= margin.left && pos.x <= baseWidth - margin.right;

  const updateDOMValues = (point, yIdxArray) => {
    const spans = document.querySelectorAll('.y-val-display');
    spans.forEach((span) => {
      const colIdx = parseInt(span.dataset.col);
      const yIdxInSeries = yIdxArray.indexOf(colIdx);
      if (yIdxInSeries !== -1) {
        const val = point.ys[yIdxInSeries];
        span.textContent = val !== null ? `[${val.toFixed(3)}]` : '[-]';
      } else {
        span.textContent = '';
      }
    });
  };

  const updateLegendWithValues = (point, yIdxArray) => {
    const xLabel = document.getElementById('legend-x-label');
    if (xLabel) {
      xLabel.textContent = `X = ${point.x.toFixed(2)}`;
      xLabel.setAttribute('opacity', '1');
    }
    const texts = document.querySelectorAll('[data-legend-col]');
    texts.forEach(el => {
      const colIdx = parseInt(el.getAttribute('data-legend-col'));
      const base = el.getAttribute('data-legend-label') || '';
      const yIdxInSeries = yIdxArray.indexOf(colIdx);
      if (yIdxInSeries !== -1) {
        const val = point.ys[yIdxInSeries];
        el.textContent = val !== null ? `${base}: ${val.toFixed(3)}` : `${base}: —`;
      } else {
        el.textContent = base;
      }
    });
  };

  const clearLegendValues = () => {
    const xLabel = document.getElementById('legend-x-label');
    if (xLabel) {
      xLabel.textContent = '';
      xLabel.setAttribute('opacity', '0');
    }
    const texts = document.querySelectorAll('[data-legend-col]');
    texts.forEach(el => {
      const base = el.getAttribute('data-legend-label') || '';
      el.textContent = base;
    });
  };

  const findClosestPoint = (xReal) => {
    let closestPoint = dataPoints[0];
    let minDist = Math.abs(xReal - dataPoints[0].x);
    for (let i = 1; i < dataPoints.length; i++) {
      const dist = Math.abs(xReal - dataPoints[i].x);
      if (dist < minDist) {
        minDist = dist;
        closestPoint = dataPoints[i];
      }
    }
    return closestPoint;
  };

  const updateCrosshair = (mouseX) => {
    crosshair.setAttribute('x1', mouseX);
    crosshair.setAttribute('x2', mouseX);

    const xReal = unmapX(mouseX);
    const closestPoint = findClosestPoint(xReal);

    updateDOMValues(closestPoint, yIndices);
    updateLegendWithValues(closestPoint, yIndices);
    return closestPoint;
  };

  // Restore pin if active
  if (state.isPinned && state.pinnedX !== null) {
    const closestPoint = findClosestPoint(state.pinnedX);
    hoverGroup.setAttribute('style', 'display: block; pointer-events: none;');
    const px = mapX(closestPoint.x);
    crosshair.setAttribute('x1', px);
    crosshair.setAttribute('x2', px);
    updateDOMValues(closestPoint, yIndices);
    updateLegendWithValues(closestPoint, yIndices);
  }

  const onMouseMoveWindow = (e) => {
    if (!state.isDragging) return;
    const pos = getMousePos(e);
    pos.x = Math.max(margin.left, Math.min(baseWidth - margin.right, pos.x));
    pos.y = Math.max(margin.top, Math.min(baseHeight - margin.bottom, pos.y));

    if (state.currentTool === 'zoom') {
      const minXpx = Math.min(state.dragStart.x, pos.x), maxXpx = Math.max(state.dragStart.x, pos.x);
      const minYpx = Math.min(state.dragStart.y, pos.y), maxYpx = Math.max(state.dragStart.y, pos.y);
      zoomRect.setAttribute('x', minXpx); zoomRect.setAttribute('y', minYpx);
      zoomRect.setAttribute('width', maxXpx - minXpx); zoomRect.setAttribute('height', maxYpx - minYpx);
    } else if (state.currentTool === 'pan') {
      const dx = pos.x - state.dragStart.x;
      const dy = pos.y - state.dragStart.y;
      const xShift = (dx / plotWidth) * (state.panStartLimits.maxX - state.panStartLimits.minX || 1);
      const yShift = (dy / plotHeight) * (state.panStartLimits.maxY - state.panStartLimits.minY || 1);
      state.viewLimits = {
        minX: state.panStartLimits.minX - xShift,
        maxX: state.panStartLimits.maxX - xShift,
        minY: state.panStartLimits.minY + yShift,
        maxY: state.panStartLimits.maxY + yShift,
      };
      if (!panRafScheduled) {
        panRafScheduled = true;
        requestAnimationFrame(() => { panRafScheduled = false; redraw(); });
      }
    }
  };

  const onMouseUpWindow = (e) => {
    window.removeEventListener('mousemove', onMouseMoveWindow);
    window.removeEventListener('mouseup', onMouseUpWindow);
    frozenRect = null;

    if (!state.isDragging) return;
    state.isDragging = false;

    if (state.currentTool === 'pan') {
      overlay.setAttribute('style', 'cursor: grab;');
      pushHistory({ ...state.viewLimits }, 'xy');
      clearPin();
      clearLegendValues();
      redraw();
      return;
    }

    if (state.currentTool === 'zoom') {
      zoomRect.setAttribute('style', 'display: none; pointer-events: none;');
      const pos = getMousePos(e);
      pos.x = Math.max(margin.left, Math.min(baseWidth - margin.right, pos.x));
      pos.y = Math.max(margin.top, Math.min(baseHeight - margin.bottom, pos.y));
      const dx = Math.abs(pos.x - state.dragStart.x);
      const dy = Math.abs(pos.y - state.dragStart.y);

      if (dx < 15 && dy < 15) {
        if (e.detail > 1) return;
        if (!inPlotArea(pos)) return;
        state.isPinned = !state.isPinned;
        if (state.isPinned) {
          hoverGroup.setAttribute('style', 'display: block; pointer-events: none;');
          const pt = updateCrosshair(pos.x);
          state.pinnedX = pt.x;
          state.pinnedBounds = { ...state.viewLimits };
        } else {
          clearPin();
          hoverGroup.setAttribute('style', 'display: none; pointer-events: none;');
          clearLegendValues();
        }
      } else {
        const minPxX = Math.min(state.dragStart.x, pos.x), maxPxX = Math.max(state.dragStart.x, pos.x);
        const minPxY = Math.min(state.dragStart.y, pos.y), maxPxY = Math.max(state.dragStart.y, pos.y);
        const xA = unmapX(minPxX), xB = unmapX(maxPxX);
        const yA = unmapY(maxPxY), yB = unmapY(minPxY);
        const newLimits = {
          minX: Math.min(xA, xB), maxX: Math.max(xA, xB),
          minY: Math.min(yA, yB), maxY: Math.max(yA, yB),
        };
        pushHistory(newLimits, 'xy');
        state.viewLimits = newLimits;
        clearPin();
        clearLegendValues();
        redraw();
      }
    }
  };

  overlay.addEventListener('mousedown', (e) => {
    if (e.detail > 1) { e.preventDefault(); return; }
    const pos = getMousePos(e);
    if (!inPlotArea(pos)) return;

    if (state.zoomControlsHidden) {
      state.zoomControlsHidden = false;
      const container = document.getElementById('zoomControls');
      if (container && state.viewHistory.length > 1) container.style.display = 'flex';
    }

    if (state.currentTool === 'crosshair') {
      state.isDragging = false;
    } else {
      state.isDragging = true;
      state.dragStart = pos;
      state.panStartLimits = { ...state.viewLimits };
      frozenRect = svg.getBoundingClientRect();

      if (state.currentTool === 'zoom') {
        zoomRect.setAttribute('x', pos.x); zoomRect.setAttribute('y', pos.y);
        zoomRect.setAttribute('width', 0); zoomRect.setAttribute('height', 0);
        zoomRect.setAttribute('style', 'display: block; pointer-events: none;');
      } else if (state.currentTool === 'pan') {
        overlay.setAttribute('style', 'cursor: grabbing;');
      }
      window.addEventListener('mousemove', onMouseMoveWindow);
      window.addEventListener('mouseup', onMouseUpWindow);
    }
    e.preventDefault();
  });

  overlay.addEventListener('mousemove', (e) => {
    if (state.isDragging) return;
    const pos = getMousePos(e);

    if (!inPlotArea(pos)) {
      if (!state.isPinned) {
        hoverGroup.setAttribute('style', 'display: none; pointer-events: none;');
        const spans = document.querySelectorAll('.y-val-display');
        spans.forEach(span => (span.textContent = ''));
        clearLegendValues();
      }
      return;
    }

    if (state.currentTool === 'crosshair' && !state.isPinned) {
      hoverGroup.setAttribute('style', 'display: block; pointer-events: none;');
      updateCrosshair(pos.x);
    }
  });

  overlay.addEventListener('click', (e) => {
    if (e.detail > 1) return;
    if (state.currentTool !== 'crosshair') return;
    const pos = getMousePos(e);
    if (!inPlotArea(pos)) return;

    state.isPinned = !state.isPinned;
    if (state.isPinned) {
      hoverGroup.setAttribute('style', 'display: block; pointer-events: none;');
      const pt = updateCrosshair(pos.x);
      state.pinnedX = pt.x;
      state.pinnedBounds = { ...state.viewLimits };
    } else {
      clearPin();
      hoverGroup.setAttribute('style', 'display: none; pointer-events: none;');
      const spans = document.querySelectorAll('.y-val-display');
      spans.forEach(span => (span.textContent = ''));
      clearLegendValues();
    }
  });

  overlay.addEventListener('dblclick', (e) => {
    e.preventDefault();
    state.viewHistory = [{ limits: { minX: null, maxX: null, minY: null, maxY: null }, axis: 'xy' }];
    state.historyIndex = 0;
    state.viewLimits = { minX: null, maxX: null, minY: null, maxY: null };
    state.currentTool = 'zoom';
    state.isDragging = false;
    state.zoomControlsHidden = false;
    clearPin();
    clearLegendValues();
    redraw();
  });
}
