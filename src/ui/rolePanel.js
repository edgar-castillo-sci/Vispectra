import { t } from '../i18n.js';
import { state } from '../plot/state.js';

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
  let prev = null;
  let step = null;
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
  let increasing = true;
  let decreasing = true;
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] <= nums[i - 1]) increasing = false;
    if (nums[i] >= nums[i - 1]) decreasing = false;
    if (!increasing && !decreasing) return false;
  }
  return true;
}

function guessXColumn(rawColumns, numColumns, discardSet) {
  try {
    if (!Array.isArray(rawColumns) || rawColumns.length === 0) return 0;
    const availableIndices = [];
    for (let i = 0; i < numColumns; i++) {
      if (!discardSet.has(i)) availableIndices.push(i);
    }
    if (availableIndices.length === 0) return 0;
    const firstIdx = availableIndices[0];
    if (isSequentialIndex(rawColumns[firstIdx])) {
      for (let k = 1; k < availableIndices.length; k++) {
        const idx = availableIndices[k];
        if (isMonotonicNumeric(rawColumns[idx])) return idx;
      }
    }
    return firstIdx;
  } catch (err) {
    console.warn('[rolePanel] guessXColumn failed:', err);
    return 0;
  }
}

// Reassigns colors and styles sequentially to active non-empty Y-series.
// Called only when the selection changes (not on manual color/style edits).
export function recompactSeriesConfig(columns, activeYIndices) {
  if (state.seriesConfigLocked) return;
  if (!Array.isArray(columns) || !Array.isArray(activeYIndices)) return;

  let k = 0;
  for (const colIdx of activeYIndices) {
    const col = columns[colIdx];
    if (!col) continue;
    if (isColumnEmpty(col)) continue;

    if (!state.seriesConfig[colIdx]) {
      state.seriesConfig[colIdx] = { width: 1.5, label: `Col ${colIdx}` };
    }
    state.seriesConfig[colIdx].color = state.defaultColors[k % state.defaultColors.length];
    state.seriesConfig[colIdx].style = state.defaultStyles[Math.floor(k / state.defaultColors.length) % state.defaultStyles.length];
    k++;
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
    (state.columnConfig?.discard || []).filter(i => Number.isInteger(i))
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
    const firstY = visibleIndices.find(v => v !== xIndex);
    selectedYFn = (i) => i === firstY;
  } else if (Array.isArray(cfgSelY)) {
    const set = new Set(cfgSelY);
    selectedYFn = (i) => i !== xIndex && set.has(i);
  } else if (autoSelect) {
    selectedYFn = (i, isEmpty) => i !== xIndex && !isEmpty;
  } else {
    const firstY = visibleIndices.find(v => v !== xIndex);
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

  let controlsContainer = document.getElementById('yControlsContainer');
  if (!controlsContainer) {
    controlsContainer = document.createElement('div');
    controlsContainer.id = 'yControlsContainer';
    controlsContainer.style.cssText = 'margin: 10px 0; padding: 6px 0; border-top: 1px solid #eee; border-bottom: 1px solid #eee; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 6px;';

    const onlyDiv = document.createElement('div');
    onlyDiv.style.cssText = 'display: flex; align-items: center; gap: 6px; flex-wrap: wrap;';
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.id = 'onlyModeToggle';
    toggle.name = 'only-mode';
    const onlyLabel = document.createElement('label');
    onlyLabel.htmlFor = 'onlyModeToggle';
    onlyLabel.textContent = t('only_mode') || 'Only Mode';
    onlyLabel.style.cssText = 'font-size: 0.85rem; font-weight: bold; color: #555; cursor: pointer; user-select: none;';
    onlyDiv.appendChild(toggle);
    onlyDiv.appendChild(onlyLabel);

    const lockDiv = document.createElement('div');
    lockDiv.style.cssText = 'display: flex; align-items: center; gap: 6px;';
    const lockToggle = document.createElement('input');
    lockToggle.type = 'checkbox';
    lockToggle.id = 'lockStylesToggle';
    lockToggle.name = 'lock-styles';
    const lockLabel = document.createElement('label');
    lockLabel.htmlFor = 'lockStylesToggle';
    lockLabel.textContent = t('lock_styles') || 'Lock styles';
    lockLabel.style.cssText = 'font-size: 0.85rem; font-weight: bold; color: #555; cursor: pointer; user-select: none;';
    lockDiv.appendChild(lockToggle);
    lockDiv.appendChild(lockLabel);

    const bulkDiv = document.createElement('div');
    bulkDiv.style.cssText = 'display: flex; gap: 6px; align-items: center;';
    bulkDiv.innerHTML = `
      <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 0.75rem; color: #666;">
        <input type="checkbox" id="chkShowEmpty" name="show-empty" checked> ${t('show_empty') || 'Show empty'}
      </label>
      <button id="btnSelectAll" name="select-all" style="background:none; border:none; color:#0055cc; cursor:pointer; font-size:0.75rem; text-decoration:underline;">All</button>
      <button id="btnSelectNone" name="select-none" style="background:none; border:none; color:#0055cc; cursor:pointer; font-size:0.75rem; text-decoration:underline;">None</button>
    `;

    onlyDiv.appendChild(lockDiv);
    controlsContainer.appendChild(onlyDiv);
    controlsContainer.appendChild(bulkDiv);
    checkboxesY.parentNode.insertBefore(controlsContainer, checkboxesY);
  }

  const onlyModeToggle = document.getElementById('onlyModeToggle');
  const lockStylesToggle = document.getElementById('lockStylesToggle');
  const btnSelectAll = document.getElementById('btnSelectAll');
  const btnSelectNone = document.getElementById('btnSelectNone');
  const chkShowEmpty = document.getElementById('chkShowEmpty');

  // Initialize initial seriesConfig for active non-empty columns.
  if (isNewFile && !state.seriesConfigLocked) {
    const activeY = [];
    for (const i of visibleIndices) {
      if (i === xIndex) continue;
      const col = rawColumns?.[i];
      if (isColumnEmpty(col)) continue;
      if (selectedYFn(i, false)) activeY.push(i);
    }
    let k = 0;
    for (const i of activeY) {
      if (!state.seriesConfig[i]) {
        state.seriesConfig[i] = {
          width: 1.5,
          label: `${t('col_prefix')} ${originalIndices ? originalIndices[i] : i}`,
        };
      }
      state.seriesConfig[i].color = state.defaultColors[k % state.defaultColors.length];
      state.seriesConfig[i].style = state.defaultStyles[Math.floor(k / state.defaultColors.length) % state.defaultStyles.length];
      k++;
    }
  }

  for (const i of visibleIndices) {
    const row = document.createElement('div');
    row.style.cssText = 'margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px dashed #eee;';

    const col = rawColumns ? rawColumns[i] : null;
    const isEmpty = isColumnEmpty(col);
    if (isEmpty) {
      row.classList.add('empty-row');
      row.style.opacity = '0.55';
    }

    const topRow = document.createElement('div');
    topRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; width: 100%;';

    const leftGroup = document.createElement('span');
    leftGroup.style.cssText = 'display: flex; align-items: center; gap: 4px; flex: 1;';

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
      const activeChecked = onlyModeActive ? onlyChecked : normalChecked;
      cb.checked = activeChecked.includes(i);
    }

    cb.addEventListener('change', () => {
      const current = Array.from(document.querySelectorAll('.checkbox-y'))
        .filter(b => b.checked)
        .map(b => parseInt(b.value));
      if (onlyModeActive) onlyChecked = current;
      else normalChecked = current;
      seriesChangeCb();
    });

    leftGroup.appendChild(cb);

    const defaultName = `${t('col_prefix')} ${originalIndices ? originalIndices[i] : i}`;
    if (i !== xIndex && !isEmpty && !state.seriesConfig[i]) {
      state.seriesConfig[i] = {
        color: '#888',
        style: 'solid',
        width: 1.5,
        label: defaultName,
      };
    }

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

    leftGroup.appendChild(nameSpan);

    if (isEmpty) {
      const badge = document.createElement('span');
      badge.textContent = '(empty)';
      badge.style.cssText = 'font-size: 0.7rem; color: #999; font-style: italic; margin-left: 4px;';
      leftGroup.appendChild(badge);
    }

    topRow.appendChild(leftGroup);

    const valSpan = document.createElement('span');
    valSpan.className = 'y-val-display';
    valSpan.dataset.col = i;
    valSpan.style.cssText = 'color: #0055cc; font-family: monospace; font-weight: bold; font-size: 0.8rem; min-width: 50px; text-align: right;';
    topRow.appendChild(valSpan);
    row.appendChild(topRow);

    // Only show color/style pickers for active, non-empty Y-series.
    if (i !== xIndex && !isEmpty && state.seriesConfig[i]) {
      const bottomRow = document.createElement('div');
      bottomRow.style.cssText = 'display: flex; gap: 4px; margin-top: 4px; align-items: center; justify-content: flex-end;';

      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.id = `y-color-${i}`;
      colorInput.name = `y-color-${i}`;
      colorInput.setAttribute('aria-label', `Color for Y-series ${i}`);
      colorInput.style.cssText = 'width: 20px; height: 20px; padding: 0; border: none; cursor: pointer;';
      colorInput.value = state.seriesConfig[i].color;
      colorInput.addEventListener('input', (e) => {
        state.seriesConfig[i].color = e.target.value;
        onSelectionChange();
      });

      const styleSelect = document.createElement('select');
      styleSelect.id = `y-style-${i}`;
      styleSelect.name = `y-style-${i}`;
      styleSelect.setAttribute('aria-label', `Line style for Y-series ${i}`);
      styleSelect.style.cssText = 'font-size: 10px; padding: 0; height: 20px; border: 1px solid #ccc; border-radius: 2px; cursor: pointer; width: 40px;';
      styleSelect.innerHTML = `
        <option value="solid">──</option>
        <option value="dashed">- -</option>
        <option value="dotted">··</option>
        <option value="dashdot">-·</option>
      `;
      styleSelect.value = state.seriesConfig[i].style;
      styleSelect.addEventListener('change', (e) => {
        state.seriesConfig[i].style = e.target.value;
        onSelectionChange();
      });

      bottomRow.appendChild(colorInput);
      bottomRow.appendChild(styleSelect);
      row.appendChild(bottomRow);
    }

    checkboxesY.appendChild(row);
  }

  if (chkShowEmpty) {
    chkShowEmpty.onchange = (e) => {
      document.querySelectorAll('.empty-row').forEach(r => {
        r.style.display = e.target.checked ? '' : 'none';
      });
    };
    if (!chkShowEmpty.checked) {
      document.querySelectorAll('.empty-row').forEach(r => { r.style.display = 'none'; });
    }
  }

  lockStylesToggle.checked = state.seriesConfigLocked;
  lockStylesToggle.onchange = (e) => {
    state.seriesConfigLocked = e.target.checked;
    if (!state.seriesConfigLocked) {
      const activeY = Array.from(document.querySelectorAll('.checkbox-y:checked'))
        .map(cb => parseInt(cb.value));
      recompactSeriesConfig(rawColumns, activeY);
    }
    onSelectionChange();
  };

  onlyModeToggle.checked = onlyModeActive;

  onlyModeToggle.onchange = (e) => {
    const boxes = Array.from(document.querySelectorAll('.checkbox-y'));
    if (e.target.checked) {
      normalChecked = boxes.filter(cb => cb.checked).map(cb => parseInt(cb.value));
      onlyModeActive = true;
      boxes.forEach(cb => { cb.checked = onlyChecked.includes(parseInt(cb.value)); });
    } else {
      onlyChecked = boxes.filter(cb => cb.checked).map(cb => parseInt(cb.value));
      onlyModeActive = false;
      boxes.forEach(cb => { cb.checked = normalChecked.includes(parseInt(cb.value)); });
    }
    seriesChangeCb();
  };

  btnSelectAll.onclick = () => {
    const boxes = Array.from(document.querySelectorAll('.checkbox-y:not(:disabled)'));
    boxes.forEach(cb => { cb.checked = true; });
    if (onlyModeActive) onlyChecked = boxes.map(cb => parseInt(cb.value));
    else normalChecked = boxes.map(cb => parseInt(cb.value));
    seriesChangeCb();
  };

  btnSelectNone.onclick = () => {
    const boxes = Array.from(document.querySelectorAll('.checkbox-y'));
    boxes.forEach(cb => { cb.checked = false; });
    if (onlyModeActive) onlyChecked = [];
    else normalChecked = [];
    seriesChangeCb();
  };

  if (isNewFile) {
    const boxes = Array.from(document.querySelectorAll('.checkbox-y'));
    normalChecked = boxes.filter(cb => cb.checked).map(cb => parseInt(cb.value));
    onlyChecked = [];
  }

  selectX.onchange = onSelectionChange;
}
