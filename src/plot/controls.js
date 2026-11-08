import { state, undo, redo, clearPin } from './state.js';

export function updateControls(redraw) {
  const container = document.getElementById('zoomControls');
  if (!container) return;

  const isZoomed = state.viewHistory.length > 1;

  if (!isZoomed) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  container.style.display = 'flex';

  const isZoomActive = state.currentTool === 'zoom' ? 'active' : '';
  const isPanActive = state.currentTool === 'pan' ? 'active' : '';
  const isCrossActive = state.currentTool === 'crosshair' ? 'active' : '';
  const undoDisabled = state.historyIndex === 0 ? 'disabled' : '';
  const redoDisabled = state.historyIndex === state.viewHistory.length - 1 ? 'disabled' : '';

  container.innerHTML = `
    <div class="zoom-header">TOOLS</div>

    <button id="tool-zoom" class="zoom-btn ${isZoomActive}">
      <span>🔍</span> Zoom
    </button>
    <button id="tool-pan" class="zoom-btn ${isPanActive}">
      <span>✋</span> Pan
    </button>
    <button id="tool-cross" class="zoom-btn ${isCrossActive}">
      <span>➕</span> Cross
    </button>

    <hr class="zoom-divider">

    <button id="z-undo" class="zoom-btn" ${undoDisabled}>
      <span>⬅️</span> Undo
    </button>
    <button id="z-redo" class="zoom-btn" ${redoDisabled}>
      <span>➡️</span> Redo
    </button>

    <hr class="zoom-divider">

    <button id="z-reset" class="zoom-btn reset-btn">
      <span>❌</span> Reset
    </button>
  `;

  const handleToolChange = (tool) => {
    state.currentTool = tool;
    clearPin();
    redraw();
  };

  document.getElementById('tool-zoom').onclick = () => handleToolChange('zoom');
  document.getElementById('tool-pan').onclick = () => handleToolChange('pan');
  document.getElementById('tool-cross').onclick = () => handleToolChange('crosshair');

  document.getElementById('z-undo').onclick = () => {
    if (undo()) { clearPin(); redraw(); }
  };

  document.getElementById('z-redo').onclick = () => {
    if (redo()) { clearPin(); redraw(); }
  };

  document.getElementById('z-reset').onclick = () => {
    state.viewHistory = [null]; state.historyIndex = 0;
    state.viewLimits = { minX: null, maxX: null, minY: null, maxY: null };
    state.currentTool = 'zoom';
    clearPin();
    redraw();
  };
}
