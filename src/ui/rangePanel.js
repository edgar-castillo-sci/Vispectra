import { state, pushHistory, clearPin, undoAxis, resetAxis } from '../plot/state.js';
import { t } from '../i18n.js';

let lastRenderCtx = null;

const ROW_STYLE = 'display: flex; align-items: center; gap: 4px; flex-wrap: nowrap; white-space: nowrap; min-width: 0; height: 24px;';
const LABEL_STYLE = 'color: #888; font-weight: bold; font-size: 0.8rem; line-height: 22px;';

const INPUT_STYLE = `
  flex: 0 0 auto;
  width: 72px;
  height: 22px;
  padding: 0 4px;
  font-family: monospace;
  font-size: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 3px;
  background: #fff;
  color: #333;
  line-height: 20px;
  box-sizing: border-box;
  vertical-align: middle;
`.replace(/\s+/g, ' ');

const SHIFT_STYLE = `
  flex: 0 0 auto;
  width: 55px;
  height: 22px;
  padding: 0 4px;
  font-family: monospace;
  font-size: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 3px;
  background: #fff;
  color: #333;
  line-height: 20px;
  box-sizing: border-box;
  vertical-align: middle;
`.replace(/\s+/g, ' ');

const BTN_STYLE = `
  width: auto !important;
  flex: 0 0 auto !important;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  height: 22px !important;
  padding: 0 8px !important;
  margin: 0 !important;
  cursor: pointer;
  border: 1px solid #ccc !important;
  background: #f8f8f8 !important;
  color: #333 !important;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.75rem !important;
  line-height: 1 !important;
  min-width: 32px;
  box-sizing: border-box !important;
  vertical-align: middle;
`.replace(/\s+/g, ' ');

export function initRangePanel(redraw) {
  const container = document.getElementById('rangePanel');
  if (!container) return;

  const renderRow = (axis) => {
    const isX = axis === 'x';
    const label = isX ? 'X' : 'Y';
    return `
      <div style="${ROW_STYLE}">
        <span style="${LABEL_STYLE}">${label}:</span>
        <input type="number" id="range${label}Min" step="any" style="${INPUT_STYLE}">
        <span style="${LABEL_STYLE}">→</span>
        <input type="number" id="range${label}Max" step="any" style="${INPUT_STYLE}">
        <span style="color:#0055cc; font-weight:bold; font-size: 0.8rem; line-height: 22px;">Δ</span>
        <input type="number" id="range${label}Shift" step="any" placeholder="0" style="${SHIFT_STYLE}" title="${t(isX ? 'range_shift_x' : 'range_shift_y')}">
        <button id="rangeUndo${label}" style="${BTN_STYLE}" title="${t(isX ? 'undo_x' : 'undo_y')}">↶${label}</button>
        <button id="rangeReset${label}" style="${BTN_STYLE}" title="${t(isX ? 'reset_x' : 'reset_y')}">↺${label}</button>
      </div>
    `;
  };

  container.innerHTML = renderRow('x') + renderRow('y');

  const inputs = {
    xMin: document.getElementById('rangeXMin'),
    xMax: document.getElementById('rangeXMax'),
    yMin: document.getElementById('rangeYMin'),
    yMax: document.getElementById('rangeYMax'),
  };

  const shifts = {
    x: document.getElementById('rangeXShift'),
    y: document.getElementById('rangeYShift'),
  };

  const clearValidation = () => {
    Object.values(inputs).forEach(i => { i.style.borderColor = '#ccc'; i.style.background = '#fff'; });
  };

  const getCurrentLimits = () => {
    let limits = state.viewLimits;
    if (limits.minX === null || limits.maxX === null || limits.minY === null || limits.maxY === null) {
      if (!lastRenderCtx) return null;
      limits = { minX: lastRenderCtx.minX, maxX: lastRenderCtx.maxX, minY: lastRenderCtx.minY, maxY: lastRenderCtx.maxY };
    }
    return { ...limits };
  };

  const applyRangeChange = () => {
    const xmin = parseFloat(inputs.xMin.value);
    const xmax = parseFloat(inputs.xMax.value);
    const ymin = parseFloat(inputs.yMin.value);
    const ymax = parseFloat(inputs.yMax.value);

    if (!isFinite(xmin) || !isFinite(xmax) || !isFinite(ymin) || !isFinite(ymax)) return;

    clearValidation();

    if (xmin >= xmax) {
      inputs.xMin.style.borderColor = 'red'; inputs.xMax.style.borderColor = 'red';
      return;
    }
    if (ymin >= ymax) {
      inputs.yMin.style.borderColor = 'red'; inputs.yMax.style.borderColor = 'red';
      return;
    }

    state.viewLimits = { minX: xmin, maxX: xmax, minY: ymin, maxY: ymax };
    pushHistory(state.viewLimits, 'xy');
    clearPin();
    redraw();
  };

  Object.values(inputs).forEach(input => {
    input.addEventListener('blur', applyRangeChange);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); applyRangeChange(); input.blur(); }
      if (e.key === 'Escape') { input.blur(); }
    });
  });

  const applyShift = (axis) => {
    const input = shifts[axis];
    const delta = parseFloat(input.value);
    if (!isFinite(delta) || delta === 0) {
      input.value = '';
      return;
    }

    const limits = getCurrentLimits();
    if (!limits) { input.value = ''; return; }

    let newLimits;
    if (axis === 'x') {
      newLimits = {
        minX: limits.minX + delta,
        maxX: limits.maxX + delta,
        minY: limits.minY,
        maxY: limits.maxY
      };
    } else {
      newLimits = {
        minX: limits.minX,
        maxX: limits.maxX,
        minY: limits.minY + delta,
        maxY: limits.maxY + delta
      };
    }

    state.viewLimits = newLimits;
    pushHistory(newLimits, axis);
    clearPin();
    input.value = '';
    redraw();
  };

  shifts.x.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); applyShift('x'); }
    if (e.key === 'Escape') { shifts.x.value = ''; shifts.x.blur(); }
  });
  shifts.y.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); applyShift('y'); }
    if (e.key === 'Escape') { shifts.y.value = ''; shifts.y.blur(); }
  });

  document.getElementById('rangeUndoX').onclick = () => {
    if (undoAxis('x')) { clearPin(); redraw(); }
  };
  document.getElementById('rangeUndoY').onclick = () => {
    if (undoAxis('y')) { clearPin(); redraw(); }
  };
  document.getElementById('rangeResetX').onclick = () => {
    resetAxis('x');
    clearPin();
    redraw();
  };
  document.getElementById('rangeResetY').onclick = () => {
    resetAxis('y');
    clearPin();
    redraw();
  };
}

export function updateRangePanel(renderCtx) {
  if (!renderCtx) return;
  lastRenderCtx = renderCtx;

  const fmt = (v) => v === null || v === undefined ? '' : Number(v).toFixed(2);

  const fields = [
    ['rangeXMin', renderCtx.minX],
    ['rangeXMax', renderCtx.maxX],
    ['rangeYMin', renderCtx.minY],
    ['rangeYMax', renderCtx.maxY],
  ];

  for (const [id, val] of fields) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (document.activeElement === el) continue;
    el.value = fmt(val);
    el.style.borderColor = '#ccc';
    el.style.background = '#fff';
  }

  const undoXBtn = document.getElementById('rangeUndoX');
  const undoYBtn = document.getElementById('rangeUndoY');

  if (undoXBtn) {
    const hasX = state.viewHistory.slice(0, state.historyIndex).some(s => s.axis === 'x' || s.axis === 'xy');
    undoXBtn.disabled = !hasX;
    undoXBtn.style.opacity = hasX ? '1' : '0.4';
    undoXBtn.style.cursor = hasX ? 'pointer' : 'not-allowed';
  }
  if (undoYBtn) {
    const hasY = state.viewHistory.slice(0, state.historyIndex).some(s => s.axis === 'y' || s.axis === 'xy');
    undoYBtn.disabled = !hasY;
    undoYBtn.style.opacity = hasY ? '1' : '0.4';
    undoYBtn.style.cursor = hasY ? 'pointer' : 'not-allowed';
  }
}
