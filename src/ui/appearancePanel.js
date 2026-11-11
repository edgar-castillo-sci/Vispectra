import { state } from '../plot/state.js';
import { t } from '../i18n.js';

export function initAppearancePanel(onUpdate) {
  const container = document.getElementById('appearancePanel');
  if (!container) return;

  const group = (titleKey, inner) => `
    <div style="border-top: 1px dashed #eee; padding-top: 8px; margin-top: 8px;">
      <div style="font-size: 0.75rem; font-weight: bold; color: #888; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
        ${t(titleKey)}
      </div>
      ${inner}
    </div>
  `;

  const row = (labelKey, inner) => `
    <label style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 0.85rem; color: #333; gap: 8px;">
      <span>${t(labelKey)}</span>
      ${inner}
    </label>
  `;

  container.innerHTML = `
    <div style="padding: 5px;">
      <!-- Title -->
      <label style="display: block; margin-bottom: 8px;">
        <span style="font-size: 0.85rem; color: #333;">${t('appearance_title')}:</span>
        <input type="text" id="ap-title" placeholder="${t('appearance_title_placeholder')}" style="width: 100%; padding: 4px; margin-top: 4px; box-sizing: border-box;">
      </label>

      ${group('appearance_show_legend', `
        ${row('appearance_show_legend', `<input type="checkbox" id="ap-legend-show">`)}
        ${row('appearance_position', `
          <select id="ap-legend-pos" style="width: 150px; padding: 2px;">
            <option value="top-right">${t('appearance_pos_top_right')}</option>
            <option value="top-left">${t('appearance_pos_top_left')}</option>
            <option value="bottom-right">${t('appearance_pos_bottom_right')}</option>
            <option value="bottom-left">${t('appearance_pos_bottom_left')}</option>
            <option value="right">${t('appearance_pos_right')}</option>
            <option value="bottom">${t('appearance_pos_bottom')}</option>
          </select>
        `)}
        ${row('appearance_layout', `
          <select id="ap-legend-layout" style="width: 150px; padding: 2px;">
            <option value="vertical">${t('appearance_layout_vertical')}</option>
            <option value="horizontal">${t('appearance_layout_horizontal')}</option>
          </select>
        `)}
        ${row('style_legend_frame', `
          <select id="ap-legend-frame" style="width: 150px; padding: 2px;">
            <option value="none">${t('style_legend_frame_none')}</option>
            <option value="thin">${t('style_legend_frame_thin')}</option>
            <option value="default">${t('style_legend_frame_default')}</option>
          </select>
        `)}
      `)}

      ${group('style_title', `
        ${row('style_font', `
          <select id="ap-font" style="width: 150px; padding: 2px;">
            <option value="cm">${t('style_font_cm')}</option>
            <option value="serif">${t('style_font_serif')}</option>
            <option value="sans">${t('style_font_sans')}</option>
          </select>
        `)}
        ${row('style_frame', `<input type="checkbox" id="ap-frame">`)}
        ${row('style_tick_direction', `
          <select id="ap-tick-dir" style="width: 150px; padding: 2px;">
            <option value="in">${t('style_tick_in')}</option>
            <option value="out">${t('style_tick_out')}</option>
            <option value="inout">${t('style_tick_inout')}</option>
          </select>
        `)}
        ${row('style_mirror_ticks', `<input type="checkbox" id="ap-mirror-ticks">`)}
        ${row('style_grid', `
          <select id="ap-grid" style="width: 150px; padding: 2px;">
            <option value="none">${t('style_grid_none')}</option>
            <option value="major">${t('style_grid_major')}</option>
            <option value="both">${t('style_grid_both')}</option>
          </select>
        `)}
        ${row('style_super_exponent', `<input type="checkbox" id="ap-super-exp">`)}
      `)}
    </div>
  `;

  // ── Grab elements ──
  const elTitle = document.getElementById('ap-title');
  const elLegendShow = document.getElementById('ap-legend-show');
  const elLegendPos = document.getElementById('ap-legend-pos');
  const elLegendLayout = document.getElementById('ap-legend-layout');
  const elLegendFrame = document.getElementById('ap-legend-frame');
  const elFont = document.getElementById('ap-font');
  const elFrame = document.getElementById('ap-frame');
  const elTickDir = document.getElementById('ap-tick-dir');
  const elMirrorTicks = document.getElementById('ap-mirror-ticks');
  const elGrid = document.getElementById('ap-grid');
  const elSuperExp = document.getElementById('ap-super-exp');

  // ── Sync from state ──
  const syncUI = () => {
    const g = state.graphConfig;
    elTitle.value = g.title || '';
    elLegendShow.checked = g.legend.show === true;
    elLegendPos.value = g.legend.position;
    elLegendLayout.value = g.legend.layout || 'vertical';
    elLegendFrame.value = g.legendFrame || 'thin';
    elFont.value = g.fontFamily || 'cm';
    elFrame.checked = g.frame !== false;
    elTickDir.value = g.tickDirection || 'in';
    elMirrorTicks.checked = g.mirrorTicks !== false;
    elGrid.value = g.grid || 'none';
    elSuperExp.checked = g.useSuperExponent !== false;

    // Layout selector only applies to corner positions
    const isCorner = ['top-right', 'top-left', 'bottom-right', 'bottom-left'].includes(g.legend.position);
    elLegendLayout.disabled = !isCorner;
    elLegendLayout.style.opacity = isCorner ? '1' : '0.5';
  };

  // ── Handlers ──
  const handle = (fn) => (e) => {
    fn(e);
    onUpdate();
  };

  elTitle.addEventListener('input', handle((e) => { state.graphConfig.title = e.target.value; }));
  elLegendShow.addEventListener('change', handle((e) => { state.graphConfig.legend.show = e.target.checked; }));
  elLegendPos.addEventListener('change', handle((e) => {
    state.graphConfig.legend.position = e.target.value;
    syncUI();
  }));
  elLegendLayout.addEventListener('change', handle((e) => { state.graphConfig.legend.layout = e.target.value; }));
  elLegendFrame.addEventListener('change', handle((e) => { state.graphConfig.legendFrame = e.target.value; }));
  elFont.addEventListener('change', handle((e) => { state.graphConfig.fontFamily = e.target.value; }));
  elFrame.addEventListener('change', handle((e) => { state.graphConfig.frame = e.target.checked; }));
  elTickDir.addEventListener('change', handle((e) => { state.graphConfig.tickDirection = e.target.value; }));
  elMirrorTicks.addEventListener('change', handle((e) => { state.graphConfig.mirrorTicks = e.target.checked; }));
  elGrid.addEventListener('change', handle((e) => { state.graphConfig.grid = e.target.value; }));
  elSuperExp.addEventListener('change', handle((e) => { state.graphConfig.useSuperExponent = e.target.checked; }));

  syncUI();
}
