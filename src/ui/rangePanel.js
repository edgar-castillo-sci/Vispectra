import { state, pushHistory, clearPin, undoAxis } from '../plot/state.js';
import { t } from '../i18n.js';

let lastRenderCtx = null;
let redrawFn = null;

export function initRangePanel(redraw) {
  const container = document.getElementById('rangePanel');
  if (!container) return;

  redrawFn = redraw;

  const inputStyle = 'width: 82px; padding: 2px 4px; font-family: monospace; font-size: 0.8rem; border: 1px solid #ccc; border-radius: 3px; background: #fff;';
  const shiftStyle = 'width: 60px; padding: 2px 4px; font-family: monospace; font-size: 0.8rem; border: 1px solid #ccc; border-radius: 3px; background: #fff;';
  const btnStyle = 'padding: 2px 7px; cursor: pointer; border: 1px solid #ccc; background: #f8f8f8; border-radius: 3px; font-size: 0.8rem;';

  container.innerHTML = `
    <span style="color:#888; font-weight:bold;">X:</span>
    <input type="number" id="rangeXMin" step="any" style="${inputStyle}">
    <span style="color:#888;">→</span>
    <input type="number" id="rangeXMax" step="any" style="${inputStyle}">
    <span style="color:#0055cc; font-weight:bold;">Δ</span>
    <input type="number" id="rangeXShift" step="any" placeholder="0" style="${shiftStyle}" title="${t('range_shift_x')}">
    <button id="rangeUndoX" style="${btnStyle}" title="${t('undo_x')}">↶X</button>
    <span style="color:#ccc; margin: 0 4px;">|</span>
    <span style="color:#888; font-weight:bold;">Y:</span>
    <input type="number" id="rangeYMin" step="any" style="${inputStyle}">
    <span style="color:#888;">→</span>
    <input type="number" id="rangeYMax" step="any" style="${inputStyle}">
    <span style="color:#0055cc; font-weight:bold;">Δ</span>
    <input type="number" id="rangeYShift" step="any" placeholder="0" style="${shiftStyle}" title="${t('range_shift_y')}">
    <button id="rangeUndoY" style="${btnStyle}" title="${t('undo_y')}">↶Y</button>
    <span style="color:#ccc; margin: 0 4px;">|</span>
    <button id="rangeReset" style="${btnStyle} color:#d32f2f;" title="${t('range_reset')}">↺</button>
  `;

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

  // --- Edición manual de min/max ---
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

  // --- Shift determinista ---
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

  // --- Undo por eje ---
  document.getElementById('rangeUndoX').onclick = () => {
    if (undoAxis('x')) {
      clearPin();
      redraw();
    }
  };
  document.getElementById('rangeUndoY').onclick = () => {
    if (undoAxis('y')) {
      clearPin();
      redraw();
    }
  };

  // --- Reset ---
  document.getElementById('rangeReset').onclick = () => {
    state.viewLimits = { minX: null, maxX: null, minY: null, maxY: null };
    state.viewHistory = [{ limits: { minX: null, maxX: null, minY: null, maxY: null }, axis: 'xy' }];
    state.historyIndex = 0;
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

  // Actualizar estado de los botones ↶X y ↶Y
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
