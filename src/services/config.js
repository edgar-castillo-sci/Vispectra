import { parseYAML, stringifyYAML } from './yaml.js';

/**
 * Reads a state object and returns a YAML-serializable config.
 * Pure: never mutates `state`.
 */
export function stateToConfig(state) {
  return {
    version: 2,
    frame: {
      width:  state.frame.width,
      height: state.frame.height,
      mode:   state.frame.mode,
    },
    axis: {
      x: { ...state.axisConfig.x },
      y: { ...state.axisConfig.y },
    },
    graph: {
      fontFamily:        state.graphConfig.fontFamily,
      frame:             state.graphConfig.frame,
      tickDirection:     state.graphConfig.tickDirection,
      mirrorTicks:       state.graphConfig.mirrorTicks,
      grid:              state.graphConfig.grid,
      legendFrame:       state.graphConfig.legendFrame,
      useSuperExponent:  state.graphConfig.useSuperExponent,
      seriesWidthLocked: state.seriesWidthLocked === true,
      masterWidth:       state.masterWidth,
    },
    columns: {
      x:          state.columnConfig.x ?? null,
      discard:    [...(state.columnConfig.discard || [])],
      selected_y: state.columnConfig.selectedY ?? null,
    },
    series: Object.fromEntries(
      Object.entries(state.seriesConfig || {}).map(([k, v]) => [k, { ...v }])
    ),
    series_locked: state.seriesConfigLocked === true,
    view: { ...state.viewLimits },
  };
}

/**
 * Reads a config object and returns a *patch* — a partial state update.
 * Pure: never touches `state`. Validation happens here so the patch is
 * already sanitized when it reaches `applyConfigPatch`.
 */
export function configToStatePatch(config) {
  const patch = {};

  if (config.frame) {
    patch.frame = {};
    if (Number.isFinite(config.frame.width))  patch.frame.width  = config.frame.width;
    if (Number.isFinite(config.frame.height)) patch.frame.height = config.frame.height;
    if (['stretch', 'extend', 'crop'].includes(config.frame.mode)) patch.frame.mode = config.frame.mode;
  }

  if (config.axis) {
    patch.axisConfig = {};
    for (const ax of ['x', 'y']) {
      const src = config.axis[ax];
      if (!src) continue;
      const dst = {};
      if (['linear', 'log10'].includes(src.scale))              dst.scale = src.scale;
      if (['auto', 'count', 'step', 'nice'].includes(src.mode))  dst.mode  = src.mode;
      if (Number.isFinite(src.count))                            dst.count = src.count;
      if (Number.isFinite(src.step))                             dst.step  = src.step;
      if (['auto', 'fixed', 'scientific'].includes(src.format))  dst.format = src.format;
      if (Number.isFinite(src.minor))                            dst.minor = src.minor;
      if (typeof src.label === 'string')                         dst.label = src.label;
      if (typeof src.showMinorLabels === 'boolean')              dst.showMinorLabels = src.showMinorLabels;
      if (typeof src.invert === 'boolean')                       dst.invert = src.invert;
      patch.axisConfig[ax] = dst;
    }
  }

  if (config.graph) {
    const g = config.graph;
    patch.graphConfig = {};
    const gc = patch.graphConfig;
    if (['cm', 'serif', 'sans'].includes(g.fontFamily))          gc.fontFamily       = g.fontFamily;
    if (typeof g.frame === 'boolean')                            gc.frame            = g.frame;
    if (['in', 'out', 'inout'].includes(g.tickDirection))        gc.tickDirection    = g.tickDirection;
    if (typeof g.mirrorTicks === 'boolean')                      gc.mirrorTicks      = g.mirrorTicks;
    if (['none', 'major', 'both'].includes(g.grid))              gc.grid             = g.grid;
    if (['none', 'thin', 'default'].includes(g.legendFrame))     gc.legendFrame      = g.legendFrame;
    if (typeof g.useSuperExponent === 'boolean')                 gc.useSuperExponent = g.useSuperExponent;

    // These two live on state root, not on graphConfig
    if (typeof g.seriesWidthLocked === 'boolean') patch.seriesWidthLocked = g.seriesWidthLocked;
    if (Number.isFinite(g.masterWidth))           patch.masterWidth      = g.masterWidth;
  }

  if (config.series) {
    patch.seriesConfig = {};
    for (const [k, v] of Object.entries(config.series)) {
      patch.seriesConfig[k] = { ...v };
    }
  }

  if ('series_locked' in config) {
    patch.seriesConfigLocked = !!config.series_locked;
  }

  if (config.columns) {
    patch.columnConfig = {
      x:         config.columns.x ?? null,
      discard:   Array.isArray(config.columns.discard) ? config.columns.discard : [],
      selectedY: config.columns.selected_y ?? null,
    };
  }

  if (config.view) {
    patch.viewLimits = {
      minX: config.view.minX ?? null,
      maxX: config.view.maxX ?? null,
      minY: config.view.minY ?? null,
      maxY: config.view.maxY ?? null,
    };
  }

  return patch;
}

/** Pure: `state` in, YAML string out. */
export function exportStateToYAML(state) {
  return stringifyYAML(stateToConfig(state));
}

/** Pure: YAML string in, patch out. */
export function importYAMLToPatch(yamlText) {
  return configToStatePatch(parseYAML(yamlText));
}
