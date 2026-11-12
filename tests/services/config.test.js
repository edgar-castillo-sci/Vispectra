import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stateToConfig, configToStatePatch, exportStateToYAML, importYAMLToPatch } from '../../src/services/config.js';

const mockState = {
  frame: { width: 800, height: 500, mode: 'stretch' },
  axisConfig: {
    x: { scale: 'linear', mode: 'auto', count: 5, step: 0.5, format: 'auto', minor: 0, label: '', showMinorLabels: false, invert: false },
    y: { scale: 'linear', mode: 'auto', count: 5, step: 0.5, format: 'auto', minor: 0, label: '', showMinorLabels: false, invert: false },
  },
  graphConfig: { fontFamily: 'cm', frame: true, tickDirection: 'in', mirrorTicks: true, grid: 'none', legendFrame: 'thin', useSuperExponent: true },
  columnConfig: { x: null, discard: [], selectedY: null },
  seriesConfig: { '1': { color: '#cc0000', style: 'dashed', width: 1.5, label: 'Sample A' } },
  seriesConfigLocked: false,
  seriesWidthLocked: true,
  masterWidth: 1.5,
  viewLimits: { minX: 100, maxX: 800, minY: 0, maxY: 1 },
};

test('stateToConfig does not mutate input', () => {
  const before = JSON.stringify(mockState);
  stateToConfig(mockState);
  assert.equal(JSON.stringify(mockState), before);
});

test('configToStatePatch does not mutate input', () => {
  const config = stateToConfig(mockState);
  const before = JSON.stringify(config);
  configToStatePatch(config);
  assert.equal(JSON.stringify(config), before);
});

test('state -> config -> patch preserves scalar values', () => {
  const patch = configToStatePatch(stateToConfig(mockState));
  assert.deepEqual(patch.frame, mockState.frame);
  assert.deepEqual(patch.graphConfig.fontFamily, mockState.graphConfig.fontFamily);
  assert.equal(patch.seriesWidthLocked, true);
  assert.equal(patch.masterWidth, 1.5);
  assert.deepEqual(patch.columnConfig.selectedY, null);
  assert.deepEqual(patch.viewLimits, mockState.viewLimits);
});

test('invalid fields are dropped by the sanitizer', () => {
  const patch = configToStatePatch({
    graph: { fontFamily: 'comic-sans', grid: 'weird', frame: true },
    view: { minX: 0 },  // minX only, rest must become null
  });
  assert.equal(patch.graphConfig.fontFamily, undefined);
  assert.equal(patch.graphConfig.grid, undefined);
  assert.equal(patch.graphConfig.frame, true);
  assert.deepEqual(patch.viewLimits, { minX: 0, maxX: null, minY: null, maxY: null });
});

test('YAML round-trip is faithful', () => {
  const yaml = exportStateToYAML(mockState);
  const patch = importYAMLToPatch(yaml);
  assert.deepEqual(patch.frame, mockState.frame);
  assert.equal(patch.masterWidth, mockState.masterWidth);
});
