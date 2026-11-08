import { t } from '../i18n.js';

let normalChecked = [];
let onlyChecked = [];
let onlyModeActive = false;

export function prepararRolePanel(numColumnas, originalIndices, autoSelect, onSelectionChange) {
  const selectX = document.getElementById('selectX');
  const checkboxesY = document.getElementById('checkboxesY');
  if (!selectX || !checkboxesY) return;

  // Detectar si es un archivo nuevo (para resetear el estado del Only Mode)
  const isNewFile = (originalIndices !== null);

  if (isNewFile) {
    normalChecked = [];
    onlyChecked = [];
    onlyModeActive = false;
  }

  selectX.innerHTML = '';
  checkboxesY.innerHTML = '';

  // 1. Poblar el selector X (Columna 0)
  for (let i = 0; i < numColumnas; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    const label = originalIndices ? originalIndices[i] : i;
    opt.textContent = `${t('col_prefix')} ${label}`;
    selectX.appendChild(opt);
  }

  // 2. Crear el toggle de Only Mode (insertado justo antes de las Y-series)
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

  // 3. Poblar los checkboxes Y
  for (let i = 0; i < numColumnas; i++) {
    const label = document.createElement('label');
    label.style.display = 'block';
    label.style.fontSize = '0.9rem';
    label.style.marginBottom = '4px';
    label.style.overflow = 'hidden';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = i;
    cb.className = 'checkbox-y';

    const cbId = `col-checkbox-${i}`;
    cb.id = cbId;
    label.htmlFor = cbId;

    // Restaurar estado inicial
    if (isNewFile) {
        if (autoSelect) cb.checked = (i !== 0);
        else cb.checked = (i === 1);
    } else {
        const activeChecked = onlyModeActive ? onlyChecked : normalChecked;
        cb.checked = activeChecked.includes(i);
    }

    // Evento al cambiar un checkbox
    cb.addEventListener('change', () => {
        const current = Array.from(document.querySelectorAll('.checkbox-y'))
                             .filter(b => b.checked)
                             .map(b => parseInt(b.value));

        if (onlyModeActive) onlyChecked = current;
        else normalChecked = current;

        onSelectionChange();
    });

    label.appendChild(cb);
    const labelIdx = originalIndices ? originalIndices[i] : i;
    label.appendChild(document.createTextNode(` ${t('col_prefix')} ${labelIdx} `));

    // Span alineado a la derecha
    const valSpan = document.createElement('span');
    valSpan.className = 'y-val-display';
    valSpan.dataset.col = i;
    valSpan.style.cssText = `
      float: right;
      text-align: right;
      min-width: 80px;
      color: #0055cc;
      font-family: monospace;
      font-weight: bold;
    `;
    label.appendChild(valSpan);

    checkboxesY.appendChild(label);
  }

  // 4. Configurar el toggle de Only Mode
  onlyModeToggle.checked = onlyModeActive;

  onlyModeToggle.onchange = (e) => {
      const boxes = Array.from(document.querySelectorAll('.checkbox-y'));

      if (e.target.checked) {
          // ACTIVAR Only Mode
          normalChecked = boxes.filter(cb => cb.checked).map(cb => parseInt(cb.value));
          onlyModeActive = true;

          // Al estar onlyChecked vacío, apaga todo. Si ya tenía selección, la restaura.
          boxes.forEach(cb => {
              cb.checked = onlyChecked.includes(parseInt(cb.value));
          });
      } else {
          // DESACTIVAR Only Mode
          onlyChecked = boxes.filter(cb => cb.checked).map(cb => parseInt(cb.value));
          onlyModeActive = false;

          boxes.forEach(cb => {
              cb.checked = normalChecked.includes(parseInt(cb.value));
          });
      }
      onSelectionChange();
  };

  // Guardar el estado inicial si es un archivo nuevo
  if (isNewFile) {
      const boxes = Array.from(document.querySelectorAll('.checkbox-y'));
      normalChecked = boxes.filter(cb => cb.checked).map(cb => parseInt(cb.value));
      onlyChecked = []; // <--- LA CORRECCIÓN: Iniciar vacío
  }

  // Usamos onchange en lugar de addEventListener para evitar duplicados al re-renderizar
  selectX.onchange = onSelectionChange;
}
