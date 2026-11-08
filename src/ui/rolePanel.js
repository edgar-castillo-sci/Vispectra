import { t } from '../i18n.js';
import { state } from '../plot/state.js';

let normalChecked = [];
let onlyChecked = [];
let onlyModeActive = false;

export function prepararRolePanel(numColumnas, originalIndices, autoSelect, onSelectionChange) {
  const selectX = document.getElementById('selectX');
  const checkboxesY = document.getElementById('checkboxesY');
  if (!selectX || !checkboxesY) return;

  const isNewFile = (originalIndices !== null);

  if (isNewFile) {
    normalChecked = [];
    onlyChecked = [];
    onlyModeActive = false;
    state.seriesConfig = {};
  }

  selectX.innerHTML = '';
  checkboxesY.innerHTML = '';

  for (let i = 0; i < numColumnas; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    const label = originalIndices ? originalIndices[i] : i;
    opt.textContent = `${t('col_prefix')} ${label}`;
    selectX.appendChild(opt);
  }

  let onlyModeContainer = document.getElementById('onlyModeContainer');
  if (!onlyModeContainer) {
    onlyModeContainer = document.createElement('div');
    onlyModeContainer.id = 'onlyModeContainer';
    onlyModeContainer.style.cssText = 'margin: 10px 0; padding: 6px 0; border-top: 1px solid #eee; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 6px;';

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.id = 'onlyModeToggle';

    const label = document.createElement('label');
    label.htmlFor = 'onlyModeToggle';
    label.textContent = t('only_mode') || 'Only Mode';
    label.style.cssText = 'font-size: 0.9rem; font-weight: bold; color: #555; cursor: pointer; user-select: none;';

    onlyModeContainer.appendChild(toggle);
    onlyModeContainer.appendChild(label);
    checkboxesY.parentNode.insertBefore(onlyModeContainer, checkboxesY);
  }

  const onlyModeToggle = document.getElementById('onlyModeToggle');

  for (let i = 0; i < numColumnas; i++) {
    const row = document.createElement('div');
    row.style.cssText = 'margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px dashed #eee;';

    const topRow = document.createElement('div');
    topRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; width: 100%;';

    const leftGroup = document.createElement('span');
    leftGroup.style.cssText = 'display: flex; align-items: center; gap: 4px; flex: 1;';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = i;
    cb.className = 'checkbox-y';
    const cbId = `col-checkbox-${i}`;
    cb.id = cbId;

    if (isNewFile) {
        if (autoSelect) cb.checked = (i !== 0);
        else cb.checked = (i === 1);
    } else {
        const activeChecked = onlyModeActive ? onlyChecked : normalChecked;
        cb.checked = activeChecked.includes(i);
    }

    cb.addEventListener('change', () => {
        const current = Array.from(document.querySelectorAll('.checkbox-y')).filter(b => b.checked).map(b => parseInt(b.value));
        if (onlyModeActive) onlyChecked = current;
        else normalChecked = current;
        onSelectionChange();
    });

    leftGroup.appendChild(cb);

    const defaultName = `${t('col_prefix')} ${originalIndices ? originalIndices[i] : i}`;
    if (i !== 0 && !state.seriesConfig[i]) {
      const colorIdx = i % state.defaultColors.length;
      const styleIdx = Math.floor(i / state.defaultColors.length) % state.defaultStyles.length;
      state.seriesConfig[i] = {
        color: state.defaultColors[colorIdx],
        style: state.defaultStyles[styleIdx],
        width: 1.5,
        label: defaultName
      };
    }

    const nameSpan = document.createElement('span');
    nameSpan.contentEditable = 'true';
    nameSpan.style.cssText = 'cursor: text; outline: none; border-bottom: 1px dashed transparent; padding: 0 2px; min-width: 60px; color: #333;';
    nameSpan.textContent = (i === 0) ? (state.axisConfig.x.label || defaultName) : state.seriesConfig[i].label;

    nameSpan.addEventListener('focus', () => nameSpan.style.borderBottomColor = '#aaa');
    nameSpan.addEventListener('blur', () => {
      nameSpan.style.borderBottomColor = 'transparent';
      const newLabel = nameSpan.textContent.trim() || defaultName;
      nameSpan.textContent = newLabel;

      if (i === 0) {
        state.axisConfig.x.label = newLabel;
      } else {
        state.seriesConfig[i].label = newLabel;
      }
      onSelectionChange();
    });
    nameSpan.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); nameSpan.blur(); }
    });

    leftGroup.appendChild(nameSpan);
    topRow.appendChild(leftGroup);

    const valSpan = document.createElement('span');
    valSpan.className = 'y-val-display';
    valSpan.dataset.col = i;
    valSpan.style.cssText = 'color: #0055cc; font-family: monospace; font-weight: bold; font-size: 0.8rem; min-width: 50px; text-align: right;';
    topRow.appendChild(valSpan);
    row.appendChild(topRow);

    if (i !== 0) {
      const bottomRow = document.createElement('div');
      bottomRow.style.cssText = 'display: flex; gap: 4px; margin-top: 4px; align-items: center; justify-content: flex-end;';

      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.style.cssText = 'width: 20px; height: 20px; padding: 0; border: none; cursor: pointer;';
      colorInput.value = state.seriesConfig[i].color;
      colorInput.addEventListener('input', (e) => { state.seriesConfig[i].color = e.target.value; onSelectionChange(); });

      const styleSelect = document.createElement('select');
      styleSelect.style.cssText = 'font-size: 10px; padding: 0; height: 20px; border: 1px solid #ccc; border-radius: 2px; cursor: pointer; width: 40px;';
      styleSelect.innerHTML = `
        <option value="solid">──</option>
        <option value="dashed">- -</option>
        <option value="dotted">··</option>
        <option value="dashdot">-·</option>
      `;
      styleSelect.value = state.seriesConfig[i].style;
      styleSelect.addEventListener('change', (e) => { state.seriesConfig[i].style = e.target.value; onSelectionChange(); });

      bottomRow.appendChild(colorInput);
      bottomRow.appendChild(styleSelect);
      row.appendChild(bottomRow);
    }

    checkboxesY.appendChild(row);
  }

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
      onSelectionChange();
  };

  if (isNewFile) {
      const boxes = Array.from(document.querySelectorAll('.checkbox-y'));
      normalChecked = boxes.filter(cb => cb.checked).map(cb => parseInt(cb.value));
      onlyChecked = [];
  }

  selectX.onchange = onSelectionChange;
}
