import { state, clearPin, pushHistory } from './state.js';

const SVG_NS = "http://www.w3.org/2000/svg";

export function attachInteraction(ctx) {
  const { svg, dataPoints, yIndices, mapX, unmapX, unmapY, plotWidth, plotHeight, margin, width, height, baseWidth, baseHeight, redraw } = ctx;

  const hoverGroup = document.createElementNS(SVG_NS, 'g');
  hoverGroup.setAttribute('style', 'display: none; pointer-events: none;');
  const crosshair = document.createElementNS(SVG_NS, 'line');
  crosshair.setAttribute('y1', margin.top); crosshair.setAttribute('y2', baseHeight - margin.bottom);
  crosshair.setAttribute('stroke', '#666'); crosshair.setAttribute('stroke-width', '1'); crosshair.setAttribute('stroke-dasharray', '4 4');
  hoverGroup.appendChild(crosshair);
  svg.appendChild(hoverGroup);

  const overlay = document.createElementNS(SVG_NS, 'rect');
  overlay.setAttribute('x', margin.left); overlay.setAttribute('y', margin.top);
  overlay.setAttribute('width', plotWidth); overlay.setAttribute('height', plotHeight);
  overlay.setAttribute('fill', 'transparent');

  if (state.currentTool === 'zoom') overlay.setAttribute('style', 'cursor: crosshair;');
  else if (state.currentTool === 'pan') overlay.setAttribute('style', 'cursor: grab;');
  else overlay.setAttribute('style', 'cursor: default;');

  svg.appendChild(overlay);

  const zoomRect = document.createElementNS(SVG_NS, 'rect');
  zoomRect.setAttribute('fill', 'rgba(0, 85, 204, 0.15)'); zoomRect.setAttribute('stroke', '#0055cc'); zoomRect.setAttribute('stroke-width', '1'); zoomRect.setAttribute('stroke-dasharray', '4 4'); zoomRect.setAttribute('style', 'display: none; pointer-events: none;');
  svg.appendChild(zoomRect);

  // Rect congelado durante el drag para evitar drift subpixel
  let frozenRect = null;
  let panRafScheduled = false;

  const getMousePos = (e) => {
    const rect = frozenRect || svg.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (width / rect.width),
      y: (e.clientY - rect.top) * (height / rect.height)
    };
  };

  const inPlotArea = (pos) => {
    return pos.x >= margin.left && pos.x <= baseWidth - margin.right;
  };

  const updateCrosshair = (mouseX) => {
    crosshair.setAttribute('x1', mouseX);
    crosshair.setAttribute('x2', mouseX);

    let closestPoint = dataPoints[0];
    let minDist = Math.abs(mouseX - mapX(closestPoint.x));
    for (let i = 1; i < dataPoints.length; i++) {
      const dist = Math.abs(mouseX - mapX(dataPoints[i].x));
      if (dist < minDist) { minDist = dist; closestPoint = dataPoints[i]; }
    }
    updateDOMValues(closestPoint, yIndices);
    return closestPoint;
  };

  const updateDOMValues = (point, yIdxArray) => {
    const spans = document.querySelectorAll('.y-val-display');
    spans.forEach(span => {
      const colIdx = parseInt(span.dataset.col);
      const yIdxInSeries = yIdxArray.indexOf(colIdx);
      if (yIdxInSeries !== -1) {
        const val = point.ys[yIdxInSeries];
        span.textContent = val !== null ? `[${val.toFixed(3)}]` : '[-]';
      } else { span.textContent = ''; }
    });
  };

  if (state.isPinned && state.pinnedX !== null) {
    let closestPoint = dataPoints[0];
    let minDist = Math.abs(state.pinnedX - dataPoints[0].x);
    for (let i = 1; i < dataPoints.length; i++) {
      const dist = Math.abs(state.pinnedX - dataPoints[i].x);
      if (dist < minDist) { minDist = dist; closestPoint = dataPoints[i]; }
    }
    hoverGroup.setAttribute('style', 'display: block; pointer-events: none;');
    crosshair.setAttribute('x1', mapX(closestPoint.x)); crosshair.setAttribute('x2', mapX(closestPoint.x));
    updateDOMValues(closestPoint, yIndices);
  }

  overlay.addEventListener('mousedown', (e) => {
    const pos = getMousePos(e);
    if (!inPlotArea(pos)) return;

    // Re-mostrar el toolbar si estaba oculto
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
        maxY: state.panStartLimits.maxY + yShift
      };

      // Throttle: solo redraw una vez por frame
      if (!panRafScheduled) {
        panRafScheduled = true;
        requestAnimationFrame(() => {
          panRafScheduled = false;
          redraw();
        });
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
      pushHistory({ ...state.viewLimits });
      clearPin();
      redraw();
    } else if (state.currentTool === 'zoom') {
      zoomRect.setAttribute('style', 'display: none; pointer-events: none;');
      const pos = getMousePos(e);
      pos.x = Math.max(margin.left, Math.min(baseWidth - margin.right, pos.x));
      pos.y = Math.max(margin.top, Math.min(baseHeight - margin.bottom, pos.y));

      const dx = Math.abs(pos.x - state.dragStart.x);
      const dy = Math.abs(pos.y - state.dragStart.y);

      if (dx < 15 && dy < 15) {
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
        }
      } else {
        const minPxX = Math.min(state.dragStart.x, pos.x), maxPxX = Math.max(state.dragStart.x, pos.x);
        const minPxY = Math.min(state.dragStart.y, pos.y), maxPxY = Math.max(state.dragStart.y, pos.y);

        const newLimits = {
          minX: unmapX(minPxX), maxX: unmapX(maxPxX),
          minY: unmapY(maxPxY), maxY: unmapY(minPxY)
        };

        pushHistory(newLimits);
        state.viewLimits = newLimits;
        clearPin();
        redraw();
      }
    }
  };

  overlay.addEventListener('mousemove', (e) => {
    if (state.isDragging) return;
    const pos = getMousePos(e);
    if (!inPlotArea(pos)) {
      if (!state.isPinned) {
        hoverGroup.setAttribute('style', 'display: none; pointer-events: none;');
        const spans = document.querySelectorAll('.y-val-display');
        spans.forEach(span => span.textContent = '');
      }
      return;
    }
    if (state.currentTool === 'crosshair' && !state.isPinned) {
      hoverGroup.setAttribute('style', 'display: block; pointer-events: none;');
      updateCrosshair(pos.x);
    }
  });

  overlay.addEventListener('click', (e) => {
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
    }
  });

  overlay.addEventListener('dblclick', (e) => {
    e.preventDefault();
    state.viewHistory = [null]; state.historyIndex = 0;
    state.viewLimits = { minX: null, maxX: null, minY: null, maxY: null };
    state.currentTool = 'zoom';
    state.isDragging = false;
    state.zoomControlsHidden = false;
    clearPin();
    redraw();
  });
}
