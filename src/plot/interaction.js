import { state, clearPin, pushHistory } from './state.js';

const SVG_NS = "http://www.w3.org/2000/svg";

export function attachInteraction(ctx) {
  const { svg, dataPoints, yIndices, mapX, unmapX, unmapY, plotWidth, plotHeight, margin, width, height, redraw } = ctx;

  const hoverGroup = document.createElementNS(SVG_NS, 'g');
  hoverGroup.setAttribute('style', 'display: none; pointer-events: none;');
  const crosshair = document.createElementNS(SVG_NS, 'line');
  crosshair.setAttribute('y1', margin.top); crosshair.setAttribute('y2', height - margin.bottom);
  crosshair.setAttribute('stroke', '#666'); crosshair.setAttribute('stroke-width', '1');
  crosshair.setAttribute('stroke-dasharray', '4 4');
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
  zoomRect.setAttribute('fill', 'rgba(0, 85, 204, 0.15)');
  zoomRect.setAttribute('stroke', '#0055cc'); zoomRect.setAttribute('stroke-width', '1');
  zoomRect.setAttribute('stroke-dasharray', '4 4'); zoomRect.setAttribute('style', 'display: none; pointer-events: none;');
  svg.appendChild(zoomRect);

  const getMousePos = (e) => {
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * width,
      y: ((e.clientY - rect.top) / rect.height) * height
    };
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
    if (pos.x < margin.left || pos.x > width - margin.right) return;

    if (state.currentTool === 'crosshair') {
      // En modo crosshair, no hacemos drag, solo permitimos el clic
      state.isDragging = false;
    } else {
      state.isDragging = true;
      state.dragStart = pos;
      state.panStartLimits = { ...state.viewLimits };

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

      redraw();
    }
  };

  const onMouseUpWindow = (e) => {
    window.removeEventListener('mousemove', onMouseMoveWindow);
    window.removeEventListener('mouseup', onMouseUpWindow);

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
      const dx = Math.abs(pos.x - state.dragStart.x);
      const dy = Math.abs(pos.y - state.dragStart.y);

      if (dx < 15 && dy < 15) {
        // CLIC SIN DRAG = PIN
        if (pos.x < margin.left || pos.x > width - margin.right) return;
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
        // DRAG = ZOOM
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

  // Eventos para el modo CROSSHAIR (Hover y Clic)
  overlay.addEventListener('mousemove', (e) => {
    if (state.isDragging) return;

    const pos = getMousePos(e);
    if (pos.x < margin.left || pos.x > width - margin.right) {
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
    if (pos.x < margin.left || pos.x > width - margin.right) return;

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
    clearPin();
    redraw();
  });
}
