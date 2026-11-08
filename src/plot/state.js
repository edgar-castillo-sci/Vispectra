export const state = {
  viewLimits: { minX: null, maxX: null, minY: null, maxY: null },
  viewHistory: [null],
  historyIndex: 0,
  currentTool: 'zoom',
  isPinned: false,
  pinnedX: null,
  pinnedBounds: null,
  isDragging: false,
  dragStart: { x: 0, y: 0 },
  panStartLimits: null,
};

export function resetView() {
  state.viewLimits = { minX: null, maxX: null, minY: null, maxY: null };
  state.viewHistory = [null];
  state.historyIndex = 0;
}

export function clearPin() {
  state.isPinned = false;
  state.pinnedX = null;
  state.pinnedBounds = null;
  const spans = document.querySelectorAll('.y-val-display');
  spans.forEach(span => span.textContent = '');
}

export function pushHistory(newLimits) {
  state.viewHistory = state.viewHistory.slice(0, state.historyIndex + 1);
  state.viewHistory.push(newLimits);
  state.historyIndex = state.viewHistory.length - 1;
}

export function undo() {
  if (state.historyIndex > 0) {
    state.historyIndex--;
    state.viewLimits = state.viewHistory[state.historyIndex] || { minX: null, maxX: null, minY: null, maxY: null };
    return true;
  }
  return false;
}

export function redo() {
  if (state.historyIndex < state.viewHistory.length - 1) {
    state.historyIndex++;
    state.viewLimits = state.viewHistory[state.historyIndex] || { minX: null, maxX: null, minY: null, maxY: null };
    return true;
  }
  return false;
}
