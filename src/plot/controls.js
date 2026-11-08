import { state, undo, redo, clearPin } from './state.js';

export function updateControls(redraw) {
  const container = document.getElementById('zoomControls');
  if (!container) return;

  const isZoomed = state.viewHistory.length > 1;

  // Si no hay zoom, o el usuario ocultó el toolbar, no mostrar
  if (!isZoomed || state.zoomControlsHidden) {
    container.style.display = 'none';
    if (!isZoomed) container.innerHTML = '';
    return;
  }

  container.style.display = 'flex';

  const isZoomActive = state.currentTool === 'zoom' ? 'active' : '';
  const isPanActive = state.currentTool === 'pan' ? 'active' : '';
  const isCrossActive = state.currentTool === 'crosshair' ? 'active' : '';
  const undoDisabled = state.historyIndex === 0 ? 'disabled' : '';
  const redoDisabled = state.historyIndex === state.viewHistory.length - 1 ? 'disabled' : '';

  container.innerHTML = `
    <div style="display: flex; gap: 4px; margin-bottom: 4px;">
      <button id="tool-zoom" class="zoom-btn ${isZoomActive}" title="Box Zoom" style="padding: 4px 8px; font-size: 12px;">🔍</button>
      <button id="tool-pan" class="zoom-btn ${isPanActive}" title="Pan" style="padding: 4px 8px; font-size: 12px;">✋</button>
      <button id="tool-cross" class="zoom-btn ${isCrossActive}" title="Crosshair" style="padding: 4px 8px; font-size: 12px;">➕</button>
    </div>

    <hr style="width:100%; border:0; border-top:1px solid #ddd; margin: 4px 0;">

    <div style="display: flex; gap: 4px;">
      <button id="z-undo" class="zoom-btn" ${undoDisabled} title="Undo" style="padding: 4px 8px; font-size: 12px;">⬅️</button>
      <button id="z-redo" class="zoom-btn" ${redoDisabled} title="Redo" style="padding: 4px 8px; font-size: 12px;">➡️</button>
      <button id="z-hide" class="zoom-btn" title="Hide toolbar" style="padding: 4px 8px; font-size: 12px; color: #999;">✖️</button>
    </div>
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

  // ✖️ Solo oculta el toolbar. No toca el zoom.
  document.getElementById('z-hide').onclick = () => {
    state.zoomControlsHidden = true;
    container.style.display = 'none';
  };
}
