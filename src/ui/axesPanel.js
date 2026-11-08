import { state } from '../plot/state.js';

export function initAxesPanel(onUpdate) {
  const container = document.getElementById('axesPanel');
  if (!container) return;

  const renderAxisHTML = (axis) => `
    <div class="axis-config-group" data-axis="${axis}">
      <h4>${axis.toUpperCase()} Axis</h4>

      <label>Label:
        <input type="text" class="cfg-label" placeholder="e.g. Wavelength (nm)" style="width: 120px;">
      </label>

      <label>Scale:
        <select class="cfg-scale">
          <option value="linear">Linear</option>
          <option value="log10">Log10</option>
        </select>
      </label>

      <label>Mode:
        <select class="cfg-mode">
          <option value="auto">Auto (Nice)</option>
          <option value="count">Fixed Count</option>
          <option value="nice">Forced Nice Step</option>
          <option value="step">Exact Step</option>
        </select>
      </label>

      <label class="cfg-row-count" style="display:none;">Count:
        <input type="number" class="cfg-count" min="2" max="20">
      </label>

      <label class="cfg-row-step" style="display:none;">Step:
        <input type="number" class="cfg-step" step="any">
      </label>

      <label>Minors:
        <input type="number" class="cfg-minor" min="0" max="10">
      </label>

      <label>Format:
        <select class="cfg-format">
          <option value="auto">Auto (10^x if log)</option>
          <option value="fixed">Fixed Decimals</option>
          <option value="scientific">Scientific (1e-2)</option>
        </select>
      </label>
    </div>
  `;

  container.innerHTML = `
    <div class="axes-panel-inner">
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
    group.querySelector('.cfg-format').value = conf.format;
    group.querySelector('.cfg-count').value = conf.count;
    group.querySelector('.cfg-step').value = conf.step;

    // Desactivar opciones que no aplican en Log10
    group.querySelector('.cfg-mode').disabled = isLog;

    if (!isLog) {
      group.querySelector('.cfg-row-count').style.display = (conf.mode === 'count') ? 'flex' : 'none';
      group.querySelector('.cfg-row-step').style.display = (conf.mode === 'step' || conf.mode === 'nice') ? 'flex' : 'none';
    } else {
      group.querySelector('.cfg-row-count').style.display = 'none';
      group.querySelector('.cfg-row-step').style.display = 'none';
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

    group.querySelector('.cfg-scale').onchange = (e) => {
      handleChange('scale', e.target.value);
      // Si cambia a log, forzamos 'auto' (que se traducirá a 10^x)
      if (e.target.value === 'log10' && state.axisConfig[axis].format === 'fixed') {
        state.axisConfig[axis].format = 'auto';
        group.querySelector('.cfg-format').value = 'auto';
      }
    };

    group.querySelector('.cfg-mode').onchange = (e) => handleChange('mode', e.target.value);
    group.querySelector('.cfg-minor').onchange = (e) => handleChange('minor', parseInt(e.target.value) || 0);
    group.querySelector('.cfg-format').onchange = (e) => handleChange('format', e.target.value);
    group.querySelector('.cfg-count').onchange = (e) => handleChange('count', parseInt(e.target.value) || 5);
    group.querySelector('.cfg-step').onchange = (e) => handleChange('step', parseFloat(e.target.value) || 1);
  });

  syncUI('x');
  syncUI('y');
}
