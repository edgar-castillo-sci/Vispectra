import { state } from '../plot/state.js';

export function initAxesPanel(onUpdate) {
  const container = document.getElementById('axesPanel');
  if (!container) return;

  const renderAxisHTML = (axis) => `
    <div class="axis-config-group" data-axis="${axis}" style="margin-bottom: 15px;">
      <h4 style="margin: 0 0 8px 0; color: #333;">${axis.toUpperCase()} Axis</h4>

      <label style="display: flex; justify-content: space-between; margin-bottom: 4px;">Label:
        <input type="text" class="cfg-label" placeholder="e.g. Wavelength (nm)" style="width: 120px; padding: 2px;">
      </label>

      <label style="display: flex; justify-content: space-between; margin-bottom: 4px;">Scale:
        <select class="cfg-scale" style="width: 125px; padding: 2px;">
          <option value="linear">Linear</option>
          <option value="log10">Log10</option>
        </select>
      </label>

      <div class="cfg-linear-options">
        <label style="display: flex; justify-content: space-between; margin-bottom: 4px;">Mode:
          <select class="cfg-mode" style="width: 125px; padding: 2px;">
            <option value="auto">Auto (Nice)</option>
            <option value="count">Fixed Count</option>
            <option value="nice">Forced Nice Step</option>
            <option value="step">Exact Step</option>
          </select>
        </label>

        <label class="cfg-row-count" style="display:none; justify-content: space-between; margin-bottom: 4px;">Count:
          <input type="number" class="cfg-count" min="2" max="20" style="width: 50px; padding: 2px;">
        </label>

        <label class="cfg-row-step" style="display:none; justify-content: space-between; margin-bottom: 4px;">Step:
          <input type="number" class="cfg-step" step="any" style="width: 50px; padding: 2px;">
        </label>
      </div>

      <!-- Control de Minors para LINEAL -->
      <label class="cfg-minor-linear" style="display: flex; justify-content: space-between; margin-bottom: 4px;">Minors:
        <input type="number" class="cfg-minor" min="0" max="10" style="width: 50px; padding: 2px;">
      </label>

      <!-- Control de Minors para LOG (Checkbox) -->
      <label class="cfg-minor-log" style="display: none; justify-content: space-between; margin-bottom: 4px; font-size: 0.75rem; color: #555;">
        Minor Ticks (2..9): <input type="checkbox" class="cfg-show-minor-log">
      </label>

      <label class="cfg-minor-labels" style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 0.75rem; color: #666;">
        Show Minor Labels: <input type="checkbox" class="cfg-show-minor-labels">
      </label>

      <label style="display: flex; justify-content: space-between; margin-bottom: 4px;">Format:
        <select class="cfg-format" style="width: 125px; padding: 2px;">
          <option value="auto">Auto</option>
          <option value="fixed">Fixed Decimals</option>
          <option value="scientific">Scientific (1e-2)</option>
        </select>
      </label>
    </div>
  `;

  container.innerHTML = `
    <div class="axes-panel-inner" style="padding: 5px;">
      ${renderAxisHTML('x')}
      <hr style="border:0; border-top:1px solid #ddd; margin: 10px 0;">
      ${renderAxisHTML('y')}
    </div>
  `;

  const syncUI = (axis) => {
    const conf = state.axisConfig[axis];
    const group = container.querySelector(`[data-axis="${axis}"]`);
    const isLog = conf.scale === 'log10';

    group.querySelector('.cfg-label').value = conf.label || '';
    group.querySelector('.cfg-scale').value = conf.scale;
    group.querySelector('.cfg-mode').value = conf.mode;
    group.querySelector('.cfg-minor').value = conf.minor;
    group.querySelector('.cfg-show-minor-log').checked = conf.minor > 0; // Reutilizamos el valor numérico como booleano
    group.querySelector('.cfg-show-minor-labels').checked = conf.showMinorLabels;
    group.querySelector('.cfg-format').value = conf.format;
    group.querySelector('.cfg-count').value = conf.count;
    group.querySelector('.cfg-step').value = conf.step;

    // Alternar visibilidad según escala
    group.querySelector('.cfg-linear-options').style.display = isLog ? 'none' : 'block';
    group.querySelector('.cfg-minor-linear').style.display = isLog ? 'none' : 'flex';
    group.querySelector('.cfg-minor-log').style.display = isLog ? 'flex' : 'none';

    // Mostrar/ocultar labels menores
    const hasMinors = isLog ? (conf.minor > 0) : (conf.minor > 0);
    group.querySelector('.cfg-minor-labels').style.display = hasMinors ? 'flex' : 'none';

    if (!isLog) {
      group.querySelector('.cfg-row-count').style.display = (conf.mode === 'count') ? 'flex' : 'none';
      group.querySelector('.cfg-row-step').style.display = (conf.mode === 'step' || conf.mode === 'nice') ? 'flex' : 'none';
    }
  };

  ['x', 'y'].forEach(axis => {
    const group = container.querySelector(`[data-axis="${axis}"]`);

    const handleChange = (key, val) => {
      state.axisConfig[axis][key] = val;
      syncUI(axis);
      onUpdate();
    };

    group.querySelector('.cfg-label').oninput = (e) => handleChange('label', e.target.value);
    group.querySelector('.cfg-scale').onchange = (e) => handleChange('scale', e.target.value);
    group.querySelector('.cfg-mode').onchange = (e) => handleChange('mode', e.target.value);
    group.querySelector('.cfg-minor').onchange = (e) => handleChange('minor', parseInt(e.target.value) || 0);
    group.querySelector('.cfg-show-minor-log').onchange = (e) => handleChange('minor', e.target.checked ? 1 : 0);
    group.querySelector('.cfg-show-minor-labels').onchange = (e) => handleChange('showMinorLabels', e.target.checked);
    group.querySelector('.cfg-format').onchange = (e) => handleChange('format', e.target.value);
    group.querySelector('.cfg-count').onchange = (e) => handleChange('count', parseInt(e.target.value) || 5);
    group.querySelector('.cfg-step').onchange = (e) => handleChange('step', parseFloat(e.target.value) || 1);
  });

  syncUI('x');
  syncUI('y');
}
