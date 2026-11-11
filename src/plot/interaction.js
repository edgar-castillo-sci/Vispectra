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

  // Floating X tooltip (no layout impact)
  const xTooltip = document.createElementNS(SVG_NS, 'g');
  xTooltip.setAttribute('style', 'display: none; pointer-events: none;');
  const xtBg = document.createElementNS(SVG_NS, 'rect');
  xtBg.setAttribute('fill', 'rgba(255, 255, 255, 0.95)');
  xtBg.setAttribute('stroke', '#999');
  xtBg.setAttribute('stroke-width', '1');
  xtBg.setAttribute('rx', '3');
  xtBg.setAttribute('height', '18');
  const xtText = document.createElementNS(SVG_NS, 'text');
  xtText.setAttribute('font-size', '11px');
  xtText.setAttribute('font-family', 'monospace');
  xtText.setAttribute('fill', '#222');
  xtText.setAttribute('y', '13');
  xTooltip.appendChild(xtBg);
  xTooltip.appendChild(xtText);
  svg.appendChild(xTooltip);

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

  const findClosestPoint = (xReal) => {
    let closest = dataPoints[0];
    let minDist = Math.abs(xReal - closest.x);
    for (let i = 1; i < dataPoints.length; i++) {
      const dist = Math.abs(xReal - dataPoints[i].x);
      if (dist < minDist) { minDist = dist; closest = dataPoints[i]; }
    }
    return closest;
  };

  const updateSidebarValues = (point, yIdxArray) => {
    document.querySelectorAll('.y-val-display').forEach(span => {
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

  const updateLegendValues = (point, yIdxArray) => {
    document.querySelectorAll('[data-legend-col]').forEach(el => {
      const colIdx = parseInt(el.getAttribute('data-legend-col'));
      const yIdxInSeries = yIdxArray.indexOf(colIdx);
      if (yIdxInSeries !== -1) {
        const val = point.ys[yIdxInSeries];
        el.textContent = val !== null ? val.toFixed(3) : '—';
      } else {
        el.textContent = el.getAttribute('data-legend-label') || '';
      }
    });
  };

  const clearLegendValues = () => {
    document.querySelectorAll('[data-legend-col]').forEach(el => {
      el.textContent = el.getAttribute('data-legend-label') || '';
    });
  };

  const showXTooltip = (mouseX, point) => {
    const label = `X = ${point.x.toFixed(2)}`;
    xtText.textContent = label;
    const textWidth = label.length * 7;
    const boxWidth = textWidth + 12;

    // Clamp X so tooltip stays inside the plot
    let boxX = mouseX - boxWidth / 2;
    if (boxX < margin.left + 2) boxX = margin.left + 2;
    if (boxX + boxWidth > baseWidth - margin.right - 2) boxX = baseWidth - margin.right - boxWidth - 2;

    const boxY = margin.top + 4;

    xtBg.setAttribute('x', boxX);
    xtBg.setAttribute('y', boxY);
    xtBg.setAttribute('width', boxWidth);
    xtText.setAttribute('x', boxX + 6);
    xtText.setAttribute('y', boxY + 13);

    xTooltip.setAttribute('style', 'display: block; pointer-events: none;');
  };

  const hideXTooltip = () => {
    xTooltip.setAttribute('style', 'display: none; pointer-events: none;');
  };

  const clearAll = () => {
    document.querySelectorAll('.y-val-display').forEach(span => (span.textContent = ''));
    clearLegendValues();
    hideXTooltip();
  };

  const updateCrosshair = (mouseX) => {
    crosshair.setAttribute('x1', mouseX);
    crosshair.setAttribute('x2', mouseX);

    const xReal = unmapX(mouseX);
    const closest = findClosestPoint(xReal);

    updateSidebarValues(closest, yIndices);
    updateLegendValues(closest, yIndices);
    showXTooltip(mouseX, closest);
    return closest;
  };

  // Restore pin on redraw
  if (state.isPinned && state.pinnedX !== null) {
    const closest = findClosestPoint(state.pinnedX);
    hoverGroup.setAttribute('style', 'display: block; pointer-events: none;');
    const px = mapX(closest.x);
    crosshair.setAttribute('x1', px);
    crosshair.setAttribute('x2', px);
    updateSidebarValues(closest, yIndices);
    updateLegendValues(closest, yIndices);
    showXTooltip(px, closest);
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
      clearAll();
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
          clearAll();
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
        clearAll();
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
        // Hide hover feedback while drawing zoom box
        hoverGroup.setAttribute('style', 'display: none; pointer-events: none;');
        hideXTooltip();
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
    if (state.isPinned) return;
    const pos = getMousePos(e);

    if (!inPlotArea(pos)) {
      hoverGroup.setAttribute('style', 'display: none; pointer-events: none;');
      clearAll();
      return;
    }

    hoverGroup.setAttribute('style', 'display: block; pointer-events: none;');
    updateCrosshair(pos.x);
  });

  overlay.addEventListener('mouseleave', () => {
    if (!state.isPinned) {
      hoverGroup.setAttribute('style', 'display: none; pointer-events: none;');
      clearAll();
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
      clearAll();
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
    clearAll();
    redraw();
  });
}
