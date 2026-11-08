export const state = {
  viewLimits: { minX: null, maxX: null, minY: null, maxY: null },
  viewHistory: [{ limits: { minX: null, maxX: null, minY: null, maxY: null }, axis: 'xy' }],
  historyIndex: 0,
  currentTool: 'zoom',
  isPinned: false,
  pinnedX: null,
  pinnedBounds: null,
  isDragging: false,
  dragStart: { x: 0, y: 0 },
  panStartLimits: null,

  frame: { width: 800, height: 500, mode: 'stretch' },

  exportMode: false,
  zoomControlsHidden: false,

  axisConfig: {
    x: { scale: 'linear', mode: 'auto', count: 5, step: 0.5, format: 'auto', minor: 0, label: '', showMinorLabels: false },
    y: { scale: 'linear', mode: 'auto', count: 5, step: 0.5, format: 'auto', minor: 0, label: '', showMinorLabels: false }
  },

  graphConfig: {
    title: '',
    legend: { show: false, position: 'top-right', layout: 'vertical' }
  },

  seriesConfig: {},
  defaultColors: ['#000000', '#cc0000', '#0055cc', '#009933', '#6600cc', '#ff9900', '#00cccc', '#cc00cc'],
  defaultStyles: ['solid', 'dashed', 'dotted', 'dashdot']
};

export function resetView() {
  state.viewLimits = { minX: null, maxX: null, minY: null, maxY: null };
  state.viewHistory = [{ limits: { minX: null, maxX: null, minY: null, maxY: null }, axis: 'xy' }];
  state.historyIndex = 0;
  state.zoomControlsHidden = false;
}

export function clearPin() {
  state.isPinned = false;
  state.pinnedX = null;
  state.pinnedBounds = null;
  const spans = document.querySelectorAll('.y-val-display');
  spans.forEach(span => span.textContent = '');
}

// axis: 'x' | 'y' | 'xy' (cambios de zoom/pan afectan ambos ejes)
export function pushHistory(newLimits, axis = 'xy') {
  state.viewHistory = state.viewHistory.slice(0, state.historyIndex + 1);
  state.viewHistory.push({ limits: { ...newLimits }, axis });
  state.historyIndex = state.viewHistory.length - 1;
}

export function undo() {
  if (state.historyIndex > 0) {
    state.historyIndex--;
    state.viewLimits = { ...state.viewHistory[state.historyIndex].limits };
    return true;
  }
  return false;
}

export function redo() {
  if (state.historyIndex < state.viewHistory.length - 1) {
    state.historyIndex++;
    state.viewLimits = { ...state.viewHistory[state.historyIndex].limits };
    return true;
  }
  return false;
}

// Revierte SOLO el eje indicado, buscando hacia atrás el último step que lo afectó.
export function undoAxis(axis) {
  const keys = axis === 'x' ? ['minX', 'maxX'] : ['minY', 'maxY'];

  for (let i = state.historyIndex - 1; i >= 0; i--) {
    const step = state.viewHistory[i];
    if (step.axis === axis || step.axis === 'xy') {
      const newLimits = { ...state.viewLimits };
      keys.forEach(k => { newLimits[k] = step.limits[k]; });

      state.viewLimits = newLimits;
      state.viewHistory = state.viewHistory.slice(0, state.historyIndex + 1);
      state.viewHistory.push({ limits: { ...newLimits }, axis });
      state.historyIndex = state.viewHistory.length - 1;
      return true;
    }
  }
  return false;
}

export function adjustViewForFrameChange(oldWidth, oldHeight, newWidth, newHeight, mode) {
  if (mode === 'stretch') return;
  if (oldWidth === newWidth && oldHeight === newHeight) return;

  const limits = state.viewLimits;
  if (limits.minX === null || limits.maxX === null || limits.minY === null || limits.maxY === null) return;

  const xRatio = newWidth / oldWidth;
  const yRatio = newHeight / oldHeight;

  const adjustRange = (min, max, ratio) => {
    const range = max - min;
    const center = (min + max) / 2;
    let newRange = range;
    if (mode === 'extend' && ratio > 1) newRange = range * ratio;
    else if (mode === 'crop' && ratio < 1) newRange = range * ratio;
    return { min: center - newRange / 2, max: center + newRange / 2 };
  };

  const xAdj = adjustRange(limits.minX, limits.maxX, xRatio);
  const yAdj = adjustRange(limits.minY, limits.maxY, yRatio);

  state.viewLimits = {
    minX: xAdj.min, maxX: xAdj.max,
    minY: yAdj.min, maxY: yAdj.max
  };
}
export function resetAxis(axis) {
  const newLimits = { ...state.viewLimits };
  if (axis === 'x') {
    newLimits.minX = null;
    newLimits.maxX = null;
  } else if (axis === 'y') {
    newLimits.minY = null;
    newLimits.maxY = null;
  }
  state.viewLimits = newLimits;
  pushHistory(newLimits, axis);
  return true;
}
