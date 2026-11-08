import { exportStateToYAML, importYAMLToState } from '../services/config.js';
import { t } from '../i18n.js';

export function initConfigPanel(onApplied) {
  const container = document.getElementById('configPanel');
  if (!container) return;

  container.innerHTML = `
    <div style="display: flex; gap: 6px; margin-bottom: 8px;">
      <button id="btnSaveConfig" style="flex: 1; background: #0a7; color: #fff;" data-i18n="config_save">${t('config_save')}</button>
      <button id="btnLoadConfig" style="flex: 1; background: #0055cc; color: #fff;" data-i18n="config_load">${t('config_load')}</button>
    </div>
    <textarea id="configTextarea" placeholder="${t('config_placeholder')}" style="width: 100%; height: 120px; font-family: monospace; font-size: 0.75rem; padding: 4px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;"></textarea>
    <button id="btnApplyConfig" style="width: 100%; margin-top: 6px; background: #ff9800;" data-i18n="config_apply">${t('config_apply')}</button>
    <div id="configStatus" style="font-size: 0.75rem; margin-top: 4px; color: #666;"></div>
  `;

  const statusEl = document.getElementById('configStatus');
  const textarea = document.getElementById('configTextarea');

  document.getElementById('btnSaveConfig').onclick = () => {
    try {
      const yaml = exportStateToYAML();
      textarea.value = yaml;
      const blob = new Blob([yaml], { type: 'text/yaml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vispectra_config_${Date.now()}.yaml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      statusEl.textContent = `✓ ${t('config_saved')}`;
      statusEl.style.color = '#0a7';
    } catch (err) {
      statusEl.textContent = `✗ ${err.message}`;
      statusEl.style.color = 'red';
    }
  };

  document.getElementById('btnLoadConfig').onclick = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.yaml,.yml,.txt';
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        textarea.value = ev.target.result;
        statusEl.textContent = `✓ ${t('config_loaded')}`;
        statusEl.style.color = '#0055cc';
      };
      reader.readAsText(file);
    };
    fileInput.click();
  };

  document.getElementById('btnApplyConfig').onclick = () => {
    const yaml = textarea.value.trim();
    if (!yaml) {
      statusEl.textContent = `✗ ${t('config_empty')}`;
      statusEl.style.color = 'red';
      return;
    }
    try {
      importYAMLToState(yaml);
      statusEl.textContent = `✓ ${t('config_applied')}`;
      statusEl.style.color = '#0a7';
      if (onApplied) onApplied();
    } catch (err) {
      statusEl.textContent = `✗ ${err.message}`;
      statusEl.style.color = 'red';
    }
  };
}
