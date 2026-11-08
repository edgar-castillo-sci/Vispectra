import { state, adjustViewForFrameChange } from '../plot/state.js';
import { t } from '../i18n.js';

const PRESETS = [
  { key: '16:10', width: 800, height: 500, i18nKey: 'frame_preset_16_10' },
  { key: '16:9',  width: 800, height: 450, i18nKey: 'frame_preset_16_9' },
  { key: '21:9',  width: 800, height: 340, i18nKey: 'frame_preset_21_9' },
  { key: 'A4L',   width: 800, height: 566, i18nKey: 'frame_preset_a4l' },
  { key: '1:1',   width: 700, height: 700, i18nKey: 'frame_preset_1_1' },
  { key: 'A4P',   width: 566, height: 800, i18nKey: 'frame_preset_a4p' },
  { key: '9:16',  width: 450, height: 800, i18nKey: 'frame_preset_9_16' },
  { key: 'custom', width: null, height: null, i18nKey: 'frame_preset_custom' },
];

export function initFramePanel(onUpdate) {
  const container = document.getElementById('framePanel');
  if (!container) return;

  const presetOptions = PRESETS
    .map(p => `<option value="${p.key}">${t(p.i18nKey)}</option>`)
    .join('');

  container.innerHTML = `
    <label style="display: flex; justify-content: space-between; margin-bottom: 6px;">${t('frame_preset')}:
      <select id="framePreset" style="width: 180px; padding: 2px;">${presetOptions}</select>
    </label>
    <div id="frameCustomRow" style="display: none; gap: 4px; align-items: center; margin-bottom: 6px;">
      <label style="flex: 1;">${t('frame_w')}: <input type="number" id="frameWidth" min="200" max="3000" step="50" style="width: 60px; padding: 2px;"></label>
      <label style="flex: 1;">${t('frame_h')}: <input type="number" id="frameHeight" min="200" max="3000" step="50" style="width: 60px; padding: 2px;"></label>
    </div>
    <div style="font-size: 0.75rem; color: #888; margin-bottom: 8px;">
      ${t('frame_min_max')}
    </div>
    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
      <div style="font-size: 0.8rem; font-weight: bold; margin-bottom: 4px;">${t('frame_mode')}</div>
      <label style="display: flex; align-items: center; gap: 4px; font-size: 0.85rem; margin-bottom: 2px;">
        <input type="radio" name="frameMode" value="stretch" ${state.frame.mode === 'stretch' ? 'checked' : ''}>
        <span>${t('frame_mode_stretch')}</span>
      </label>
      <label style="display: flex; align-items: center; gap: 4px; font-size: 0.85rem; margin-bottom: 2px;">
        <input type="radio" name="frameMode" value="extend" ${state.frame.mode === 'extend' ? 'checked' : ''}>
        <span>${t('frame_mode_extend')}</span>
      </label>
      <label style="display: flex; align-items: center; gap: 4px; font-size: 0.85rem;">
        <input type="radio" name="frameMode" value="crop" ${state.frame.mode === 'crop' ? 'checked' : ''}>
        <span>${t('frame_mode_crop')}</span>
      </label>
    </div>
  `;

  const presetSelect = document.getElementById('framePreset');
  const customRow = document.getElementById('frameCustomRow');
  const widthInput = document.getElementById('frameWidth');
  const heightInput = document.getElementById('frameHeight');

  const initialPreset = PRESETS.find(p => p.width === state.frame.width && p.height === state.frame.height);
  presetSelect.value = initialPreset ? initialPreset.key : 'custom';
  widthInput.value = state.frame.width;
  heightInput.value = state.frame.height;
  if (!initialPreset) customRow.style.display = 'flex';

  const applyFrameChange = (newWidth, newHeight) => {
    const oldW = state.frame.width;
    const oldH = state.frame.height;
    adjustViewForFrameChange(oldW, oldH, newWidth, newHeight, state.frame.mode);
    state.frame.width = newWidth;
    state.frame.height = newHeight;
    onUpdate();
  };

  presetSelect.addEventListener('change', (e) => {
    const key = e.target.value;
    if (key === 'custom') {
      customRow.style.display = 'flex';
      return;
    }
    customRow.style.display = 'none';
    const preset = PRESETS.find(p => p.key === key);
    if (!preset) return;
    widthInput.value = preset.width;
    heightInput.value = preset.height;
    applyFrameChange(preset.width, preset.height);
  });

  const applyCustom = () => {
    const w = Math.max(200, Math.min(3000, parseInt(widthInput.value) || 800));
    const h = Math.max(200, Math.min(3000, parseInt(heightInput.value) || 500));
    widthInput.value = w;
    heightInput.value = h;
    applyFrameChange(w, h);
  };

  widthInput.addEventListener('change', applyCustom);
  heightInput.addEventListener('change', applyCustom);

  container.querySelectorAll('input[name="frameMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.frame.mode = e.target.value;
    });
  });
}
