import { state } from '../plot/state.js';
import { parseYAML, stringifyYAML } from './yaml.js';

export function stateToConfig() {
  return {
    version: 2,
    columns: {
      x: state.columnConfig.x,
      discard: state.columnConfig.discard.slice(),
      selected_y: state.columnConfig.selectedY,
    },
    frame: {
      width: state.frame.width,
      height: state.frame.height,
      mode: state.frame.mode,
    },
    axis: {
      x: { ...state.axisConfig.x },
      y: { ...state.axisConfig.y },
    },
    graph: {
      title: state.graphConfig.title || '',
      legend: { ...state.graphConfig.legend },
      fontFamily: state.graphConfig.fontFamily,
      frame: state.graphConfig.frame,
      tickDirection: state.graphConfig.tickDirection,
      mirrorTicks: state.graphConfig.mirrorTicks,
      grid: state.graphConfig.grid,
      legendFrame: state.graphConfig.legendFrame,
        useSuperExponent: state.graphConfig.useSuperExponent,
              seriesWidthLocked: state.seriesWidthLocked,
      masterWidth: state.masterWidth,
    },
    series: Object.fromEntries(
      Object.entries(state.seriesConfig).map(([k, v]) => [k, { ...v }])
    ),
    series_locked: state.seriesConfigLocked === true,
    view: {
      minX: state.viewLimits.minX,
      maxX: state.viewLimits.maxX,
      minY: state.viewLimits.minY,
      maxY: state.viewLimits.maxY,
    },
  };
}

export function configToState(config) {
  if (!config || typeof config !== 'object') return;

  if (config.columns) {
    const c = config.columns;
    if (c.x !== undefined && c.x !== null) {
      const parsed = parseInt(c.x);
      state.columnConfig.x = Number.isInteger(parsed) ? parsed : null;
    } else if (c.x === null) {
      state.columnConfig.x = null;
    }
    if (Array.isArray(c.discard)) {
      state.columnConfig.discard = c.discard.map(v => parseInt(v)).filter(v => Number.isInteger(v));
    }
    if (c.selected_y === null || c.selected_y === 'all' || c.selected_y === 'first') {
      state.columnConfig.selectedY = c.selected_y;
    } else if (Array.isArray(c.selected_y)) {
      state.columnConfig.selectedY = c.selected_y.map(v => parseInt(v)).filter(v => Number.isInteger(v));
    }
  }

  if (config.frame) {
    if (typeof config.frame.width === 'number') state.frame.width = config.frame.width;
    if (typeof config.frame.height === 'number') state.frame.height = config.frame.height;
    if (['stretch', 'extend', 'crop'].includes(config.frame.mode)) state.frame.mode = config.frame.mode;
  }

  if (config.axis) {
    if (config.axis.x) Object.assign(state.axisConfig.x, config.axis.x);
    if (config.axis.y) Object.assign(state.axisConfig.y, config.axis.y);
  }

  if (config.graph) {
    const g = config.graph;
    if (typeof g.title === 'string') state.graphConfig.title = g.title;
    if (g.legend) Object.assign(state.graphConfig.legend, g.legend);
    if (['cm', 'serif', 'sans'].includes(g.fontFamily)) state.graphConfig.fontFamily = g.fontFamily;
    if (typeof g.frame === 'boolean') state.graphConfig.frame = g.frame;
    if (['in', 'out', 'inout'].includes(g.tickDirection)) state.graphConfig.tickDirection = g.tickDirection;
    if (typeof g.mirrorTicks === 'boolean') state.graphConfig.mirrorTicks = g.mirrorTicks;
    if (['none', 'major', 'both'].includes(g.grid)) state.graphConfig.grid = g.grid;
    if (['none', 'thin', 'default'].includes(g.legendFrame)) state.graphConfig.legendFrame = g.legendFrame;
      if (typeof g.useSuperExponent === 'boolean') state.graphConfig.useSuperExponent = g.useSuperExponent;
          if (typeof g.seriesWidthLocked === 'boolean') state.seriesWidthLocked = g.seriesWidthLocked;
    if (typeof g.masterWidth === 'number') state.masterWidth = g.masterWidth;
  }

  if (config.series) {
    state.seriesConfig = {};
    Object.entries(config.series).forEach(([k, v]) => {
      state.seriesConfig[String(k)] = { ...v };
    });
  }

  if (typeof config.series_locked === 'boolean') {
    state.seriesConfigLocked = config.series_locked;
  }

  if (config.view) {
    const v = config.view;
    const isValid = ['minX', 'maxX', 'minY', 'maxY'].every(
      key => v[key] === null || typeof v[key] === 'number'
    );
    if (isValid) {
      state.viewLimits = {
        minX: v.minX ?? null,
        maxX: v.maxX ?? null,
        minY: v.minY ?? null,
        maxY: v.maxY ?? null,
      };
      state.viewHistory = [{ limits: { ...state.viewLimits }, axis: 'xy' }];
      state.historyIndex = 0;
    }
  }
}

export function exportStateToYAML() {
  return stringifyYAML(stateToConfig());
}

export function importYAMLToState(yamlText) {
  const parsed = parseYAML(yamlText);
  configToState(parsed);
  return parsed;
}
