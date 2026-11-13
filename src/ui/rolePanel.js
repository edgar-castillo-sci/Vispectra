import { t } from '../i18n.js';
import { state } from '../plot/state.js';

const SVG_NS = "http://www.w3.org/2000/svg";
const DEFAULT_WIDTH = 0.8;
const MIN_WIDTH = 0.1;
const MAX_WIDTH = 10;
const STEP_WIDTH = 0.05;

let normalChecked = [];
let onlyChecked = [];
let onlyModeActive = false;

function isColumnEmpty(col) {
  if (!col || !Array.isArray(col)) return false;
  for (let i = 0; i < col.length; i++) {
    if (col[i] !== null && col[i] !== undefined) return false;
  }
  return true;
}

function isSequentialIndex(col) {
  if (!col || col.length < 3) return false;
  let prev = null, step = null;
  const limit = Math.min(col.length, 100);
  for (let i = 0; i < limit; i++) {
    const v = col[i];
    if (v === null || v === undefined) return false;
    const num = Number(v);
    if (!Number.isFinite(num) || !Number.isInteger(num)) return false;
    if (prev !== null) {
      const s = num - prev;
      if (step === null) step = s;
      else if (s !== step) return false;
    }
    prev = num;
  }
  return step === 1 || step === -1;
}

function isMonotonicNumeric(col) {
  if (!col || col.length < 3) return false;
  const nums = [];
  const limit = Math.min(col.length, 200);
  for (let i = 0; i < limit; i++) {
    const v = col[i];
    if (v === null || v === undefined) continue;
    const num = Number(v);
    if (!Number.isFinite(num)) continue;
    nums.push(num);
  }
  if (nums.length < 3) return false;
  let inc = true, dec = true;
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] <= nums[i - 1]) inc = false;
    if (nums[i] >= nums[i - 1]) dec = false;
    if (!inc && !dec) return false;
  }
  return true;
}

function guessXColumn(rawColumns, numColumns, discardSet) {
  try {
    if (!Array.isArray(rawColumns) || rawColumns.length === 0) return 0;
    const avail = [];
    for (let i = 0; i < numColumns; i++) if (!discardSet.has(i)) avail.push(i);
    if (avail.length === 0) return 0;
    const firstIdx = avail[0];
    if (isSequentialIndex(rawColumns[firstIdx])) {
      for (let k = 1; k < avail.length; k++) {
        if (isMonotonicNumeric(rawColumns[avail[k]])) return avail[k];
      }
    }
    return firstIdx;
  } catch (err) {
    console.warn('[rolePanel] guessXColumn failed:', err);
    return 0;
  }
}

function dashArrayFor(style) {
  if (style === 'dashed') return '6 4';
  if (style === 'dotted') return '2 4';
  if (style === 'dashdot') return '6 4 2 4';
  return 'none';
}

function clampWidth(w) {
  if (!Number.isFinite(w)) return DEFAULT_WIDTH;
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, w));
}

function updateSwatch(colIdx) {
  const conf = state.seriesConfig[colIdx];
  if (!conf) return;
  const svg = document.querySelector(`.y-swatch-svg[data-col="${colIdx}"]`);
  if (!svg) return;
  const line = svg.querySelector('line');
  if (!line) return;
  line.setAttribute('stroke', conf.color || '#888888');
  line.setAttribute('stroke-width', String(conf.width || state.masterWidth || DEFAULT_WIDTH));
  line.setAttribute('stroke-dasharray', dashArrayFor(conf.style));
}

export function recompactSeriesConfig(columns, activeYIndices) {
  if (state.seriesConfigLocked) return;
  if (!Array.isArray(columns) || !Array.isArray(activeYIndices)) return;

  let k = 0;
  for (const colIdx of activeYIndices) {
    const col = columns[colIdx];
    if (!col || isColumnEmpty(col)) continue;

    if (!state.seriesConfig[colIdx]) {
      state.seriesConfig[colIdx] = {
        width: state.seriesWidthLocked ? state.masterWidth : DEFAULT_WIDTH,
        label: `Col ${colIdx}`,
      };
    }
    state.seriesConfig[colIdx].color = state.defaultColors[k % state.defaultColors.length];
    state.seriesConfig[colIdx].style = state.defaultStyles[Math.floor(k / state.defaultColors.length) % state.defaultStyles.length];
    if (state.seriesWidthLocked) {
      state.seriesConfig[colIdx].width = state.masterWidth;
    }
    k++;
  }
}

export function refreshRolePanelFromState() {
  document.querySelectorAll('.y-color-input').forEach((input) => {
    const idx = parseInt(input.dataset.col);
    if (state.seriesConfig[idx]?.color) input.value = state.seriesConfig[idx].color;
  });
  document.querySelectorAll('.y-style-select').forEach((sel) => {
    const idx = parseInt(sel.dataset.col);
    if (state.seriesConfig[idx]?.style) sel.value = state.seriesConfig[idx].style;
  });
  document.querySelectorAll('.y-width-slider').forEach((slider) => {
    const idx = parseInt(slider.dataset.col);
    const w = state.seriesConfig[idx]?.width ?? state.masterWidth ?? DEFAULT_WIDTH;
    slider.value = String(w);
    slider.disabled = state.seriesWidthLocked;
    slider.style.opacity = state.seriesWidthLocked ? '0.4' : '1';
    const valueEl = document.querySelector(`.y-width-value[data-col="${idx}"]`);
    if (valueEl) {
      valueEl.value = w.toFixed(2);
      valueEl.disabled = state.seriesWidthLocked;
    }
  });
  document.querySelectorAll('.y-swatch-svg').forEach((svg) => {
    updateSwatch(parseInt(svg.dataset.col));
  });
  // Master width control
  const masterSlider = document.getElementById('masterWidthSlider');
  const masterValue = document.getElementById('masterWidthValue');
  const lockToggle = document.getElementById('lockWidthsToggle');
  if (masterSlider) {
    masterSlider.value = String(state.masterWidth);
    masterSlider.disabled = !state.seriesWidthLocked;
    masterSlider.style.opacity = state.seriesWidthLocked ? '1' : '0.4';
  }
  if (masterValue) {
    masterValue.value = state.masterWidth.toFixed(2);
    masterValue.disabled = !state.seriesWidthLocked;
  }
  if (lockToggle) lockToggle.checked = state.seriesWidthLocked;
  // Checkboxes (only if selectedY is concrete array)
  if (Array.isArray(state.columnConfig?.selectedY)) {
    const set = new Set(state.columnConfig.selectedY);
    document.querySelectorAll('.checkbox-y').forEach((cb) => {
      const idx = parseInt(cb.value);
      if (!cb.disabled) cb.checked = set.has(idx);
    });
    normalChecked = Array.from(document.querySelectorAll('.checkbox-y'))
      .filter((cb) => cb.checked)
      .map((cb) => parseInt(cb.value));
  }
}

export function prepararRolePanel(numColumnas, originalIndices, autoSelect, onSelectionChange, rawColumns = null, onSeriesToggle = null) {
  const selectX = document.getElementById('selectX');
  const checkboxesY = document.getElementById('checkboxesY');
  if (!selectX || !checkboxesY) return;

  const isNewFile = (originalIndices !== null);
  const seriesChangeCb = onSeriesToggle || onSelectionChange;

  if (isNewFile) {
    normalChecked = [];
    onlyChecked = [];
    onlyModeActive = false;
    state.seriesConfig = {};
  }

  const discardSet = new Set(
    (state.columnConfig?.discard || []).filter((i) => Number.isInteger(i))
  );

  const visibleIndices = [];
  for (let i = 0; i < numColumnas; i++) {
    if (!discardSet.has(i)) visibleIndices.push(i);
  }

  const cfgX = parseInt(state.columnConfig?.x);
  let xIndex;
  if (Number.isInteger(cfgX) && !discardSet.has(cfgX) && cfgX >= 0 && cfgX < numColumnas) {
    xIndex = cfgX;
  } else {
    xIndex = guessXColumn(rawColumns, numColumnas, discardSet);
  }

  const cfgSelY = state.columnConfig?.selectedY;
  let selectedYFn;
  if (cfgSelY === 'all') {
    selectedYFn = (i, isEmpty) => i !== xIndex && !isEmpty;
  } else if (cfgSelY === 'first') {
    const firstY = visibleIndices.find((v) => v !== xIndex);
    selectedYFn = (i) => i === firstY;
  } else if (Array.isArray(cfgSelY)) {
    const set = new Set(cfgSelY);
    selectedYFn = (i) => i !== xIndex && set.has(i);
  } else if (autoSelect) {
    selectedYFn = (i, isEmpty) => i !== xIndex && !isEmpty;
  } else {
    const firstY = visibleIndices.find((v) => v !== xIndex);
    selectedYFn = (i) => i === firstY;
  }

  selectX.innerHTML = '';
  checkboxesY.innerHTML = '';

  for (const i of visibleIndices) {
    const opt = document.createElement('option');
    opt.value = i;
    const label = originalIndices ? originalIndices[i] : i;
    opt.textContent = `${t('col_prefix')} ${label}`;
    if (i === xIndex) opt.selected = true;
    selectX.appendChild(opt);
  }

  // ── Controls container: rebuild fresh each call ──
  let controlsContainer = document.getElementById('yControlsContainer');
  if (controlsContainer) controlsContainer.remove();
  controlsContainer = document.createElement('div');
  controlsContainer.id = 'yControlsContainer';
  controlsContainer.style.cssText = 'margin: 10px 0; padding: 6px 0; border-top: 1px solid #eee; border-bottom: 1px solid #eee; display: flex; flex-direction: column; gap: 6px;';

  // Row 1: Only Mode, Lock styles, Show empty, All, None
  const row1 = document.createElement('div');
  row1.style.cssText = 'display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 0.8rem;';

  row1.innerHTML = `
    <label style="display:flex; align-items:center; gap:4px; cursor:pointer;">
      <input type="checkbox" id="onlyModeToggle" name="only-mode"> <span style="font-weight:bold; color:#555;">${t('only_mode')}</span>
    </label>
    <label style="display:flex; align-items:center; gap:4px; cursor:pointer;">
      <input type="checkbox" id="lockStylesToggle" name="lock-styles"> <span style="font-weight:bold; color:#555;">${t('lock_styles')}</span>
    </label>
    <label style="display:flex; align-items:center; gap:4px; cursor:pointer;">
      <input type="checkbox" id="chkShowEmpty" name="show-empty" checked> <span style="color:#666;">${t('show_empty')}</span>
    </label>
    <button id="btnSelectAll" name="select-all" style="background:none; border:none; color:#0055cc; cursor:pointer; font-size:0.75rem; text-decoration:underline; padding:0;">All</button>
    <button id="btnSelectNone" name="select-none" style="background:none; border:none; color:#0055cc; cursor:pointer; font-size:0.75rem; text-decoration:underline; padding:0;">None</button>
  `;
  controlsContainer.appendChild(row1);

  // Row 2: Master width + lock
  const row2 = document.createElement('div');
  row2.style.cssText = 'display: flex; align-items: center; gap: 6px; font-size: 0.8rem;';
  row2.innerHTML = `
    <span style="color:#555; font-weight:bold;">${t('master_width')}:</span>
    <input type="range" id="masterWidthSlider" min="${MIN_WIDTH}" max="5" step="${STEP_WIDTH}" value="${state.masterWidth}" style="flex: 1; min-width: 60px;">
    <input type="number" id="masterWidthValue" class="width-input" min="${MIN_WIDTH}" max="${MAX_WIDTH}" step="${STEP_WIDTH}" value="${state.masterWidth.toFixed(2)}">
    <label style="display:flex; align-items:center; gap:4px; cursor:pointer; color:#555;">
      <input type="checkbox" id="lockWidthsToggle" ${state.seriesWidthLocked ? 'checked' : ''}> ${t('lock_widths')}
    </label>
  `;
  controlsContainer.appendChild(row2);

  checkboxesY.parentNode.insertBefore(controlsContainer, checkboxesY);

  const onlyModeToggle = document.getElementById('onlyModeToggle');
  const lockStylesToggle = document.getElementById('lockStylesToggle');
  const btnSelectAll = document.getElementById('btnSelectAll');
  const btnSelectNone = document.getElementById('btnSelectNone');
  const chkShowEmpty = document.getElementById('chkShowEmpty');
  const masterWidthSlider = document.getElementById('masterWidthSlider');
  const masterWidthValue = document.getElementById('masterWidthValue');
  const lockWidthsToggle = document.getElementById('lockWidthsToggle');

  // ── Initial series config ──
  if (isNewFile && !state.seriesConfigLocked) {
    let k = 0;
    for (const i of visibleIndices) {
      if (i === xIndex) continue;
      if (isColumnEmpty(rawColumns?.[i])) continue;

      const isActive = selectedYFn(i, false);

      if (!state.seriesConfig[i]) state.seriesConfig[i] = {};
      const conf = state.seriesConfig[i];

      if (!conf.width) conf.width = state.seriesWidthLocked ? state.masterWidth : DEFAULT_WIDTH;
      if (state.seriesWidthLocked) conf.width = state.masterWidth;
      if (!conf.label) conf.label = `${t('col_prefix')} ${originalIndices ? originalIndices[i] : i}`;

      if (isActive) {
        if (!conf.color) conf.color = state.defaultColors[k % state.defaultColors.length];
        if (!conf.style) conf.style = state.defaultStyles[Math.floor(k / state.defaultColors.length) % state.defaultStyles.length];
        k++;
      }
    }
  }

  // ── Build series rows ──
  for (const i of visibleIndices) {
    const col = rawColumns ? rawColumns[i] : null;
    const isEmpty = isColumnEmpty(col);
    const row = document.createElement('div');
    row.style.cssText = 'margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px dashed #eee;';
    if (isEmpty) {
      row.classList.add('empty-row');
      row.style.opacity = '0.55';
    }

    const topRow = document.createElement('div');
    topRow.style.cssText = 'display: flex; align-items: center; gap: 6px; font-size: 0.9rem;';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = i;
    cb.className = 'checkbox-y';
    cb.name = `y-series-${i}`;
    cb.id = `col-checkbox-${i}`;
    cb.setAttribute('aria-label', `Y-series ${i}`);
    if (isEmpty) cb.disabled = true;

    if (isNewFile) {
      cb.checked = !isEmpty && selectedYFn(i, false);
    } else {
      const active = onlyModeActive ? onlyChecked : normalChecked;
      cb.checked = active.includes(i);
    }

    cb.addEventListener('change', () => {
      const current = Array.from(document.querySelectorAll('.checkbox-y'))
        .filter((b) => b.checked)
        .map((b) => parseInt(b.value));
      if (onlyModeActive) onlyChecked = current;
      else normalChecked = current;
      seriesChangeCb();
    });

    topRow.appendChild(cb);

    const defaultName = `${t('col_prefix')} ${originalIndices ? originalIndices[i] : i}`;
    const nameSpan = document.createElement('span');
    nameSpan.contentEditable = 'true';
    nameSpan.style.cssText = 'cursor: text; outline: none; border-bottom: 1px dashed transparent; padding: 0 2px; min-width: 60px; color: #333;';
    nameSpan.textContent = (i === xIndex)
      ? (state.axisConfig.x.label || defaultName)
      : (state.seriesConfig[i]?.label || defaultName);

    nameSpan.addEventListener('focus', () => { nameSpan.style.borderBottomColor = '#aaa'; });
    nameSpan.addEventListener('blur', () => {
      nameSpan.style.borderBottomColor = 'transparent';
      const newLabel = nameSpan.textContent.trim() || defaultName;
      nameSpan.textContent = newLabel;
      if (i === xIndex) state.axisConfig.x.label = newLabel;
      else if (state.seriesConfig[i]) state.seriesConfig[i].label = newLabel;
      onSelectionChange();
    });
    nameSpan.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); nameSpan.blur(); }
    });

    topRow.appendChild(nameSpan);

    if (isEmpty) {
      const badge = document.createElement('span');
      badge.textContent = '(empty)';
      badge.style.cssText = 'font-size: 0.7rem; color: #999; font-style: italic;';
      topRow.appendChild(badge);
    }

    // Swatch (only for non-X, non-empty)
    if (i !== xIndex && !isEmpty && state.seriesConfig[i]) {
      const conf = state.seriesConfig[i];
      const swatch = document.createElementNS(SVG_NS, 'svg');
      swatch.setAttribute('class', 'y-swatch-svg');
      swatch.setAttribute('data-col', i);
      swatch.setAttribute('width', '50');
      swatch.setAttribute('height', '16');
      swatch.setAttribute('viewBox', '0 0 50 16');
      swatch.setAttribute('style', 'cursor: pointer; flex-shrink: 0;');
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', '4'); line.setAttribute('y1', '8');
      line.setAttribute('x2', '46'); line.setAttribute('y2', '8');
      line.setAttribute('stroke', conf.color || '#888888');
      line.setAttribute('stroke-width', String(conf.width || state.masterWidth || DEFAULT_WIDTH));
      line.setAttribute('stroke-dasharray', dashArrayFor(conf.style));
      line.setAttribute('stroke-linecap', 'round');
      swatch.appendChild(line);
      swatch.addEventListener('click', () => {
        const panel = document.querySelector(`.y-style-panel[data-col="${i}"]`);
        if (panel) panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
      });
      topRow.appendChild(swatch);
    }

    const valSpan = document.createElement('span');
    valSpan.className = 'y-val-display';
    valSpan.dataset.col = i;
    valSpan.style.cssText = 'margin-left:auto; color: #0055cc; font-family: monospace; font-weight: bold; font-size: 0.8rem; text-align: right; min-width: 50px;';
    topRow.appendChild(valSpan);

    row.appendChild(topRow);

    // Panel (color, style, width)
    if (i !== xIndex && !isEmpty && state.seriesConfig[i]) {
      const panel = document.createElement('div');
      panel.className = 'y-style-panel';
      panel.dataset.col = i;
      panel.style.cssText = 'display: none; flex-direction: column; gap: 4px; margin-top: 6px; padding-left: 20px; font-size: 0.8rem; color: #555;';

      const currentWidth = state.seriesConfig[i].width || state.masterWidth || DEFAULT_WIDTH;

      panel.innerHTML = `
        <label style="display:flex; align-items:center; gap:6px;">
          <span style="min-width:45px;">Color</span>
          <input type="color" class="y-color-input" data-col="${i}" value="${state.seriesConfig[i].color || '#888888'}" style="width:28px; height:22px; padding:0; border:1px solid #ccc; border-radius:3px; cursor:pointer;">
        </label>
        <label style="display:flex; align-items:center; gap:6px;">
          <span style="min-width:45px;">${t('series_style')}</span>
          <select class="y-style-select" data-col="${i}" style="flex:1; padding:2px; font-size:0.8rem;">
            <option value="solid">${'──'}</option>
            <option value="dashed">- -</option>
            <option value="dotted">··</option>
            <option value="dashdot">-·</option>
          </select>
        </label>
        <label style="display:flex; align-items:center; gap:6px;">
          <span style="min-width:45px;">${t('style_width')}</span>
          <input type="range" class="y-width-slider" data-col="${i}" min="${MIN_WIDTH}" max="5" step="${STEP_WIDTH}" value="${currentWidth}" style="flex:1;" ${state.seriesWidthLocked ? 'disabled' : ''}>
          <input type="number" class="y-width-value width-input" data-col="${i}" min="${MIN_WIDTH}" max="${MAX_WIDTH}" step="${STEP_WIDTH}" value="${currentWidth.toFixed(2)}" ${state.seriesWidthLocked ? 'disabled' : ''}>
        </label>
      `;

      const styleSelect = panel.querySelector('.y-style-select');
      styleSelect.value = state.seriesConfig[i].style || 'solid';

      const colorInput = panel.querySelector('.y-color-input');
      colorInput.addEventListener('input', (e) => {
        state.seriesConfig[i].color = e.target.value;
        updateSwatch(i);
        onSelectionChange();
      });

      styleSelect.addEventListener('change', (e) => {
        state.seriesConfig[i].style = e.target.value;
        updateSwatch(i);
        onSelectionChange();
      });

      const widthSlider = panel.querySelector('.y-width-slider');
      const widthInput = panel.querySelector('.y-width-value');

      widthSlider.addEventListener('input', (e) => {
        const w = parseFloat(e.target.value);
        state.seriesConfig[i].width = w;
        if (widthInput) widthInput.value = w.toFixed(2);
        updateSwatch(i);
        onSelectionChange();
      });

      // Inline edit: type a number, blur/Enter to apply
      widthInput.addEventListener('change', (e) => {
        let w = parseFloat(e.target.value);
        w = clampWidth(w);
        e.target.value = w.toFixed(2);
        state.seriesConfig[i].width = w;
        if (widthSlider) widthSlider.value = String(w);
        updateSwatch(i);
        onSelectionChange();
      });
      widthInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
      });

      row.appendChild(panel);
    }

    checkboxesY.appendChild(row);
  }

  // ── Show-empty toggle ──
  chkShowEmpty.onchange = (e) => {
    document.querySelectorAll('.empty-row').forEach((r) => {
      r.style.display = e.target.checked ? '' : 'none';
    });
  };
  if (!chkShowEmpty.checked) {
    document.querySelectorAll('.empty-row').forEach((r) => { r.style.display = 'none'; });
  }

  // ── Lock styles (color/style preservation) ──
  lockStylesToggle.checked = state.seriesConfigLocked;
  lockStylesToggle.onchange = (e) => {
    state.seriesConfigLocked = e.target.checked;
    if (!state.seriesConfigLocked) {
      const activeY = Array.from(document.querySelectorAll('.checkbox-y:checked')).map((cb) => parseInt(cb.value));
      recompactSeriesConfig(rawColumns, activeY);
      refreshRolePanelFromState();
    }
    onSelectionChange();
  };

  // ── Master width slider + inline input ──
  const applyMasterWidth = (w) => {
    w = clampWidth(w);
    state.masterWidth = w;
    if (masterWidthValue) masterWidthValue.value = w.toFixed(2);
    if (masterWidthSlider) masterWidthSlider.value = String(w);
    if (state.seriesWidthLocked) {
      const activeY = Array.from(document.querySelectorAll('.checkbox-y:checked')).map((cb) => parseInt(cb.value));
      for (const i of activeY) {
        if (state.seriesConfig[i]) {
          state.seriesConfig[i].width = w;
          updateSwatch(i);
          const slider = document.querySelector(`.y-width-slider[data-col="${i}"]`);
          if (slider) slider.value = String(w);
          const vEl = document.querySelector(`.y-width-value[data-col="${i}"]`);
          if (vEl) vEl.value = w.toFixed(2);
        }
      }
    }
  };

  masterWidthSlider.addEventListener('input', (e) => {
    applyMasterWidth(parseFloat(e.target.value));
  });
  masterWidthSlider.addEventListener('change', () => {
    onSelectionChange();
  });

  masterWidthValue.addEventListener('change', (e) => {
    const w = parseFloat(e.target.value);
    applyMasterWidth(w);
    onSelectionChange();
  });
  masterWidthValue.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
  });

  // ── Lock widths toggle ──
  lockWidthsToggle.onchange = (e) => {
    state.seriesWidthLocked = e.target.checked;
    if (state.seriesWidthLocked) {
      const activeY = Array.from(document.querySelectorAll('.checkbox-y:checked')).map((cb) => parseInt(cb.value));
      for (const i of activeY) {
        if (state.seriesConfig[i]) {
          state.seriesConfig[i].width = state.masterWidth;
          updateSwatch(i);
        }
      }
    }
    document.querySelectorAll('.y-width-slider').forEach((slider) => {
      slider.disabled = state.seriesWidthLocked;
      slider.style.opacity = state.seriesWidthLocked ? '0.4' : '1';
      const i = parseInt(slider.dataset.col);
      if (state.seriesConfig[i]) slider.value = String(state.seriesConfig[i].width || state.masterWidth || DEFAULT_WIDTH);
    });
    document.querySelectorAll('.y-width-value').forEach((vEl) => {
      const i = parseInt(vEl.dataset.col);
      vEl.disabled = state.seriesWidthLocked;
      if (state.seriesConfig[i]) vEl.value = (state.seriesConfig[i].width || state.masterWidth || DEFAULT_WIDTH).toFixed(2);
    });
    masterWidthSlider.disabled = !state.seriesWidthLocked;
    masterWidthSlider.style.opacity = state.seriesWidthLocked ? '1' : '0.4';
    masterWidthValue.disabled = !state.seriesWidthLocked;
    onSelectionChange();
  };

  // Initial state for master controls
  masterWidthSlider.disabled = !state.seriesWidthLocked;
  masterWidthSlider.style.opacity = state.seriesWidthLocked ? '1' : '0.4';
  masterWidthValue.disabled = !state.seriesWidthLocked;

  // ── Only Mode ──
  onlyModeToggle.checked = onlyModeActive;
  onlyModeToggle.onchange = (e) => {
    const boxes = Array.from(document.querySelectorAll('.checkbox-y'));
    if (e.target.checked) {
      normalChecked = boxes.filter((cb) => cb.checked).map((cb) => parseInt(cb.value));
      onlyModeActive = true;
      boxes.forEach((cb) => { cb.checked = onlyChecked.includes(parseInt(cb.value)); });
    } else {
      onlyChecked = boxes.filter((cb) => cb.checked).map((cb) => parseInt(cb.value));
      onlyModeActive = false;
      boxes.forEach((cb) => { cb.checked = normalChecked.includes(parseInt(cb.value)); });
    }
    seriesChangeCb();
  };

  // ── Bulk buttons ──
  btnSelectAll.onclick = () => {
    const boxes = Array.from(document.querySelectorAll('.checkbox-y:not(:disabled)'));
    boxes.forEach((cb) => { cb.checked = true; });
    if (onlyModeActive) onlyChecked = boxes.map((cb) => parseInt(cb.value));
    else normalChecked = boxes.map((cb) => parseInt(cb.value));
    seriesChangeCb();
  };
  btnSelectNone.onclick = () => {
    const boxes = Array.from(document.querySelectorAll('.checkbox-y'));
    boxes.forEach((cb) => { cb.checked = false; });
    if (onlyModeActive) onlyChecked = [];
    else normalChecked = [];
    seriesChangeCb();
  };

  if (isNewFile) {
    const boxes = Array.from(document.querySelectorAll('.checkbox-y'));
    normalChecked = boxes.filter((cb) => cb.checked).map((cb) => parseInt(cb.value));
    onlyChecked = [];
  }

  selectX.onchange = onSelectionChange;
}
