import { t, setLanguage, translateDOM } from './i18n.js';
import { deduplicateColumns } from './services/columns.js';
import { applyPipeline } from './services/pipeline.js';
import { exportarCSV, exportarPlot } from './services/export.js';
import { openDisambiguationModal } from './ui/disambiguationModal.js';
import { openColumnsModal } from './ui/columnsModal.js';
import { prepararRolePanel, recompactSeriesConfig, refreshRolePanelFromState } from './ui/rolePanel.js';
import { agregarPasoPipeline, getMathPipeline } from './ui/pipelinePanel.js';
import { initAxesPanel } from './ui/axesPanel.js';
import { initFramePanel } from './ui/framePanel.js';
import { initConfigPanel } from './ui/configPanel.js';
import { initRangePanel } from './ui/rangePanel.js';
import { initAppearancePanel } from './ui/appearancePanel.js';
import { state, resetView } from './plot/state.js';
import { initAboutPanel } from './ui/aboutPanel.js';

let archivos = [];
let onProcesar = null;
let onGraficar = null;
let columnasGlobales = null;
let currentOriginalIndices = null;

function bindCollapsiblePanel(checkboxId, panelId) {
  const checkbox = document.getElementById(checkboxId);
  const panel = document.getElementById(panelId);
  if (!checkbox || !panel) return;
  checkbox.addEventListener('change', (e) => {
    panel.style.display = e.target.checked ? 'block' : 'none';
    if (e.target.checked) {
      requestAnimationFrame(() => panel.scrollIntoView({ behavior: 'smooth', block: 'end' }));
    }
  });
}

export function initUI(procesarFn, graficarFn) {
  onProcesar = procesarFn;
  onGraficar = graficarFn;

  const zona = document.getElementById('zonaDrop');
  const input = document.getElementById('entradaArchivos');
  const botonProcesar = document.getElementById('botonProcesar');
  const botonExportCsvRaw = document.getElementById('botonExportCsvRaw');
  const botonGraficar = document.getElementById('botonGraficar');
  const botonExportar = document.getElementById('botonExportar');
  const botonExportCsvProcessed = document.getElementById('botonExportCsvProcessed');
  const selectFormat = document.getElementById('selectFormat');
  const exportTransparent = document.getElementById('exportTransparent');
  const exportTransparentLabel = document.getElementById('exportTransparentLabel');
  const salida = document.getElementById('salida');
  const rolePanel = document.getElementById('rolePanel');
  const exportGroup = document.getElementById('exportGroup');
  const toggleAutoPlot = document.getElementById('toggleAutoPlot');
  const langSelector = document.getElementById('langSelector');
  const btnAddOp = document.getElementById('btnAddOp');
  const pipelineContainer = document.getElementById('pipelineContainer');

  if (!zona || !input || !botonProcesar) return;

  const getActiveYIndices = () => {
    return Array.from(document.querySelectorAll('.checkbox-y:checked'))
      .map(cb => parseInt(cb.value))
      .filter(i => {
        const col = columnasGlobales?.[i];
        if (!col) return false;
        for (let k = 0; k < col.length; k++) {
          if (col[k] !== null && col[k] !== undefined) return true;
        }
        return false;
      });
  };

  const onSelectionChange = () => {
    if (toggleAutoPlot && toggleAutoPlot.checked) actualizarGrafico();
  };

  const onSeriesToggle = () => {
    const active = getActiveYIndices();
    state.columnConfig.selectedY = active;

    if (!state.seriesConfigLocked && columnasGlobales) {
      recompactSeriesConfig(columnasGlobales, active);
    }

    // Always sync widths when width is locked (independent of style lock)
    if (state.seriesWidthLocked) {
      for (const i of active) {
        if (state.seriesConfig[i]) {
          state.seriesConfig[i].width = state.masterWidth;
        }
      }
    }

    refreshRolePanelFromState();
    onSelectionChange();
  };

  // ── Init panels ──
  if (document.getElementById('toggleAxesPanel')) initAxesPanel(() => actualizarGrafico());
  if (document.getElementById('toggleFramePanel')) initFramePanel(() => actualizarGrafico());
  if (document.getElementById('toggleConfigPanel')) {
    initConfigPanel(() => {
      refreshRolePanelFromState();
      actualizarGrafico();
    });
  }
  if (document.getElementById('rangePanel')) initRangePanel(() => actualizarGrafico());
  if (document.getElementById('toggleAppearancePanel')) {
    initAppearancePanel(() => actualizarGrafico());
  }
  // Init about panel (citation badges + modal)
  initAboutPanel();
  bindCollapsiblePanel('toggleAxesPanel', 'axesPanel');
  bindCollapsiblePanel('toggleFramePanel', 'framePanel');
  bindCollapsiblePanel('toggleConfigPanel', 'configPanel');
  bindCollapsiblePanel('toggleAppearancePanel', 'appearancePanel');

  // ── Export options: enable/disable "Transparent" per format ──
  const updateTransparentState = () => {
    if (!selectFormat || !exportTransparent) return;
    const fmt = selectFormat.value;
    const supportsTransparency = (fmt === 'svg' || fmt === 'png');
    exportTransparent.disabled = !supportsTransparency;
    if (exportTransparentLabel) {
      exportTransparentLabel.classList.toggle('disabled', !supportsTransparency);
    }
  };
  if (selectFormat && exportTransparent) {
    selectFormat.addEventListener('change', updateTransparentState);
    updateTransparentState();
  }

  // ── Language ──
  if (langSelector) {
    langSelector.addEventListener('change', (e) => {
      setLanguage(e.target.value);
      translateDOM();
      initAxesPanel(() => actualizarGrafico());
      initFramePanel(() => actualizarGrafico());
      initConfigPanel(() => { refreshRolePanelFromState(); actualizarGrafico(); });
      initRangePanel(() => actualizarGrafico());
      initAppearancePanel(() => actualizarGrafico());

      if (columnasGlobales) {
        prepararRolePanel(columnasGlobales.length, currentOriginalIndices, false, onSelectionChange, columnasGlobales, onSeriesToggle);
        const currentPipeline = getMathPipeline();
        pipelineContainer.innerHTML = '';
        currentPipeline.forEach(op => agregarPasoPipeline(pipelineContainer, op, onSelectionChange));
      }
    });
  }

  // ── Drag & Drop ──
  zona.addEventListener('click', () => input.click());
  input.addEventListener('change', (e) => {
    actualizarArchivos(e.target.files, salida);
    input.value = '';
  });
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev =>
    zona.addEventListener(ev, e => e.preventDefault())
  );
  zona.addEventListener('drop', (e) => actualizarArchivos(e.dataTransfer.files, salida));

  // ── Process ──
  botonProcesar.addEventListener('click', async () => {
    if (archivos.length === 0) return (salida.textContent = t('status_waiting'));
    salida.textContent = t('status_processing');

    try {
      let result = await onProcesar(archivos[0], {});

      if (result && result.status === 'needs_disambiguation') {
        const resolutions = await openDisambiguationModal(result.ambiguities);
        if (!resolutions) return (salida.textContent = `✗ Disambiguation cancelled\n`);
        salida.textContent = t('status_processing');
        result = await onProcesar(archivos[0], { resolutions });
      }

      if (!result || result.status === 'failed') {
        salida.textContent = `✗ ${archivos[0].name}: failed\n`;
        if (result && result.diagnostics) {
          const errors = result.diagnostics.filter(d => d.severity === 'error').slice(0, 5);
          for (const e of errors) salida.textContent += `    ${e.code}\n`;
        }
        return;
      }

      if (result.status === 'ok' || result.status === 'partial') {
        const { unique, originalIndices } = deduplicateColumns(result.columns);
        let autoSelect = false;
        let finalColumns = unique;
        let finalIndices = originalIndices;

        if (unique.length < result.columns.length) {
          const shouldCollapse = await openColumnsModal(
            result.columns.length - unique.length,
            unique.length,
            result.columns.length
          );
          if (shouldCollapse) {
            autoSelect = true;
          } else {
            finalColumns = result.columns;
            finalIndices = result.columns.map((_, i) => i);
          }
        }

        columnasGlobales = finalColumns;
        currentOriginalIndices = finalIndices;
        resetView();

        salida.textContent =
          `✓ ${archivos[0].name}\n` +
          `  status: ${result.status}\n` +
          `  columns: ${finalColumns.length} (from ${result.columns.length})\n` +
          `  rows: ${result.totalRows} (failed: ${result.failedRows})\n`;

        prepararRolePanel(finalColumns.length, finalIndices, autoSelect, onSelectionChange, finalColumns, onSeriesToggle);

        if (rolePanel) rolePanel.style.display = 'flex';
        if (exportGroup) exportGroup.style.display = 'flex';
        if (botonExportCsvRaw) botonExportCsvRaw.style.display = 'block';
        if (toggleAutoPlot && toggleAutoPlot.checked) actualizarGrafico();
      }
    } catch (err) {
      console.error(err);
      salida.textContent = `✗ Error inesperado: ${err.message}`;
    }
  });

  if (btnAddOp) {
    btnAddOp.addEventListener('click', () => {
      agregarPasoPipeline(pipelineContainer, null, onSelectionChange);
      onSelectionChange();
    });
  }

  if (toggleAutoPlot) {
    toggleAutoPlot.addEventListener('change', (e) => {
      if (botonGraficar) botonGraficar.style.display = e.target.checked ? 'none' : 'block';
      if (e.target.checked) actualizarGrafico();
    });
  }

  if (botonExportar) {
    botonExportar.addEventListener('click', async () => {
      const prevText = salida.textContent;
      botonExportar.disabled = true;
      salida.textContent = t('export_preparing');

      try {
        state.exportMode = true;
        actualizarGrafico();
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

        salida.textContent = t('export_exporting');
        const svg = document.getElementById('spectrumSvg');
        const transparent = !!(exportTransparent && exportTransparent.checked);
        exportarPlot(svg, selectFormat.value, { transparent });
        salida.textContent = prevText;
      } catch (err) {
        console.error('Export failed:', err);
        salida.textContent = `${t('export_failed')}: ${err.message}`;
      } finally {
        botonExportar.disabled = false;
        state.exportMode = false;
        actualizarGrafico();
      }
    });
  }

  if (botonExportCsvRaw) {
    botonExportCsvRaw.addEventListener('click', () => {
      const selectX = document.getElementById('selectX');
      if (!selectX) return;
      const xIndex = parseInt(selectX.value);
      exportarCSV(columnasGlobales, xIndex, getActiveYIndices(), getMathPipeline(), false);
    });
  }

  if (botonExportCsvProcessed) {
    botonExportCsvProcessed.addEventListener('click', () => {
      const selectX = document.getElementById('selectX');
      if (!selectX) return;
      const xIndex = parseInt(selectX.value);
      exportarCSV(columnasGlobales, xIndex, getActiveYIndices(), getMathPipeline(), true);
    });
  }

  function actualizarGrafico() {
    if (!columnasGlobales) return;
    const selectX = document.getElementById('selectX');
    if (!selectX) return;
    const xIndex = parseInt(selectX.value);
    const yIndices = getActiveYIndices();

    const pipeline = getMathPipeline();
    const processedColumns = applyPipeline(columnasGlobales, xIndex, yIndices, pipeline);
    onGraficar(processedColumns, xIndex, yIndices);
  }
}

function actualizarArchivos(fileList, salida) {
  archivos = Array.from(fileList);
  if (archivos.length === 0) return (salida.textContent = t('status_waiting'));
  salida.textContent = `${archivos.length} file(s) ready.`;
}
