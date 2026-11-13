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

  columnConfig: {
    x: null,
    discard: [],
    selectedY: null,
  },

  axisConfig: {
    x: { scale: 'linear', mode: 'auto', count: 5, step: 0.5, format: 'auto', minor: 0, label: '', showMinorLabels: false, invert: false },
    y: { scale: 'linear', mode: 'auto', count: 5, step: 0.5, format: 'auto', minor: 0, label: '', showMinorLabels: false, invert: false }
  },

  graphConfig: {
    title: '',
    legend: { show: true, position: 'top-right', layout: 'vertical' },
    // ── Style (Tier 1 + 2) ──
    fontFamily: 'cm',          // 'cm' | 'serif' | 'sans'
    frame: true,               // full box around plot
    tickDirection: 'in',       // 'in' | 'out' | 'inout'
    mirrorTicks: true,         // ticks on top + right (no labels)
    grid: 'none',              // 'none' | 'major' | 'both'
    legendFrame: 'thin',       // 'none' | 'thin' | 'default'
    useSuperExponent: true,    // ×10ⁿ with real superscript (else 1.5e-3)
  },

  seriesConfig: {},
    seriesConfigLocked: false,
  seriesWidthLocked: true,
    masterWidth: 0.8,

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

export function resetAxis(axis) {
  const newLimits = { ...state.viewLimits };
  if (axis === 'x') { newLimits.minX = null; newLimits.maxX = null; }
  else if (axis === 'y') { newLimits.minY = null; newLimits.maxY = null; }
  state.viewLimits = newLimits;
  pushHistory(newLimits, axis);
  return true;
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
  state.viewLimits = { minX: xAdj.min, maxX: xAdj.max, minY: yAdj.min, maxY: yAdj.max };
}
/**
 * Applies a partial config patch (from configToStatePatch / importYAMLToPatch).
 * The patch is already sanitized, so this only merges and handles the
 * view-history reset that a new view range implies.
 */
export function applyConfigPatch(patch) {
  if (!patch || typeof patch !== 'object') return;

  if (patch.frame)        state.frame        = { ...state.frame,        ...patch.frame };
  if (patch.graphConfig)  state.graphConfig  = { ...state.graphConfig,  ...patch.graphConfig };
  if (patch.columnConfig) state.columnConfig = { ...state.columnConfig, ...patch.columnConfig };

  if (patch.axisConfig) {
    if (patch.axisConfig.x) state.axisConfig.x = { ...state.axisConfig.x, ...patch.axisConfig.x };
    if (patch.axisConfig.y) state.axisConfig.y = { ...state.axisConfig.y, ...patch.axisConfig.y };
  }

  if (patch.seriesConfig)               state.seriesConfig       = { ...patch.seriesConfig };
  if ('seriesConfigLocked' in patch)    state.seriesConfigLocked = patch.seriesConfigLocked;
  if ('seriesWidthLocked' in patch)     state.seriesWidthLocked  = patch.seriesWidthLocked;
  if (Number.isFinite(patch.masterWidth)) state.masterWidth      = patch.masterWidth;

  if (patch.viewLimits) {
    state.viewLimits   = { ...patch.viewLimits };
    state.viewHistory  = [{ limits: { ...state.viewLimits }, axis: 'xy' }];
    state.historyIndex = 0;
  }
}
