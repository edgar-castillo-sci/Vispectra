import { t, setLanguage, translateDOM } from './i18n.js';
import { deduplicateColumns } from './services/columns.js';
import { applyPipeline } from './services/pipeline.js';
import { exportarCSV, exportarPlot } from './services/export.js';
import { openDisambiguationModal } from './ui/disambiguationModal.js';
import { openColumnsModal } from './ui/columnsModal.js';
import { prepararRolePanel } from './ui/rolePanel.js';
import { agregarPasoPipeline, getMathPipeline } from './ui/pipelinePanel.js';
import { initAxesPanel } from './ui/axesPanel.js';
import { initFramePanel } from './ui/framePanel.js';
import { state, resetView } from './plot/state.js';
import { initConfigPanel } from './ui/configPanel.js';
import { initRangePanel } from './ui/rangePanel.js';

let archivos = [];
let onProcesar = null;
let onGraficar = null;
let columnasGlobales = null;

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
  const salida = document.getElementById('salida');
  const rolePanel = document.getElementById('rolePanel');
  const exportGroup = document.getElementById('exportGroup');
  const toggleAutoPlot = document.getElementById('toggleAutoPlot');
  const langSelector = document.getElementById('langSelector');
  const btnAddOp = document.getElementById('btnAddOp');
  const pipelineContainer = document.getElementById('pipelineContainer');

  if (!zona || !input || !botonProcesar) return;

  const onSelectionChange = () => {
    if (toggleAutoPlot && toggleAutoPlot.checked) actualizarGrafico();
  };

  // --- Inicializar Paneles Colapsables ---
  const toggleAxesPanel = document.getElementById('toggleAxesPanel');
  const axesPanel = document.getElementById('axesPanel');
  if (toggleAxesPanel && axesPanel) {
    initAxesPanel(() => actualizarGrafico());
    toggleAxesPanel.addEventListener('change', (e) => {
      axesPanel.style.display = e.target.checked ? 'block' : 'none';
    });
  }

  const toggleFramePanel = document.getElementById('toggleFramePanel');
  const framePanel = document.getElementById('framePanel');
  if (toggleFramePanel && framePanel) {
    initFramePanel(() => actualizarGrafico());
    toggleFramePanel.addEventListener('change', (e) => {
      framePanel.style.display = e.target.checked ? 'block' : 'none';
    });
  }

const rangePanelEl = document.getElementById('rangePanel');
if (rangePanelEl) {
  initRangePanel(() => actualizarGrafico());
}

   const toggleConfigPanel = document.getElementById('toggleConfigPanel');
const configPanelEl = document.getElementById('configPanel');
if (toggleConfigPanel && configPanelEl) {
  initConfigPanel(() => actualizarGrafico());
  toggleConfigPanel.addEventListener('change', (e) => {
    configPanelEl.style.display = e.target.checked ? 'block' : 'none';
  });
}

  const toggleAppearancePanel = document.getElementById('toggleAppearancePanel');
  const appearancePanel = document.getElementById('appearancePanel');
  const inputGraphTitle = document.getElementById('inputGraphTitle');
  const chkShowLegend = document.getElementById('chkShowLegend');
  const selectLegendPos = document.getElementById('selectLegendPos');
  const selectLegendLayout = document.getElementById('selectLegendLayout');
  const legendLayoutRow = document.getElementById('legendLayoutRow');

  if (toggleAppearancePanel && appearancePanel) {
    toggleAppearancePanel.addEventListener('change', (e) => {
      appearancePanel.style.display = e.target.checked ? 'block' : 'none';
    });
  }

  if (inputGraphTitle) {
    inputGraphTitle.addEventListener('input', (e) => {
      state.graphConfig.title = e.target.value;
      onSelectionChange();
    });
  }

  if (chkShowLegend) {
    chkShowLegend.addEventListener('change', (e) => {
      state.graphConfig.legend.show = e.target.checked;
      onSelectionChange();
    });
  }

  if (selectLegendPos) {
    const updateLayoutVisibility = () => {
      const pos = state.graphConfig.legend.position;
      const isCorner = ['top-right', 'top-left', 'bottom-right', 'bottom-left'].includes(pos);
      if (legendLayoutRow) legendLayoutRow.style.display = isCorner ? 'block' : 'none';
    };

    selectLegendPos.addEventListener('change', (e) => {
      state.graphConfig.legend.position = e.target.value;
      updateLayoutVisibility();
      onSelectionChange();
    });

    if (selectLegendLayout) {
      selectLegendLayout.addEventListener('change', (e) => {
        state.graphConfig.legend.layout = e.target.value;
        onSelectionChange();
      });
    }

    updateLayoutVisibility();
  }

  // --- Selector de idioma ---
  if (langSelector) {
    langSelector.addEventListener('change', (e) => {
      setLanguage(e.target.value);

      // Re-traducir el DOM estático
      translateDOM();

      // Re-renderizar paneles dinámicos con i18n
      initAxesPanel(() => actualizarGrafico());
      initFramePanel(() => actualizarGrafico());

      if (columnasGlobales) {
        prepararRolePanel(columnasGlobales.length, null, false, onSelectionChange);
        const currentPipeline = getMathPipeline();
        pipelineContainer.innerHTML = '';
        currentPipeline.forEach(op => agregarPasoPipeline(pipelineContainer, op, onSelectionChange));
      }
    });
  }

  // --- Drag & Drop ---
  zona.addEventListener('click', () => input.click());
  input.addEventListener('change', (e) => { actualizarArchivos(e.target.files, salida); input.value = ''; });
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => zona.addEventListener(ev, e => e.preventDefault()));
  zona.addEventListener('drop', (e) => actualizarArchivos(e.dataTransfer.files, salida));

  // --- Botón Procesar ---
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
          const shouldCollapse = await openColumnsModal(result.columns.length - unique.length, unique.length, result.columns.length);
          if (shouldCollapse) {
            autoSelect = true;
          } else {
            finalColumns = result.columns;
            finalIndices = result.columns.map((_, i) => i);
          }
        }

        columnasGlobales = finalColumns;
        resetView();

        salida.textContent = `✓ ${archivos[0].name}\n  status: ${result.status}\n  columns: ${finalColumns.length} (from ${result.columns.length})\n  rows: ${result.totalRows} (failed: ${result.failedRows})\n`;

        prepararRolePanel(finalColumns.length, finalIndices, autoSelect, onSelectionChange);

        if (rolePanel) rolePanel.style.display = 'block';
        if (exportGroup) exportGroup.style.display = 'flex';
        if (botonExportCsvRaw) botonExportCsvRaw.style.display = 'block';
        if (toggleAutoPlot && toggleAutoPlot.checked) actualizarGrafico();
      }
    } catch (err) {
      console.error(err);
      salida.textContent = `✗ Error inesperado: ${err.message}`;
    }
  });

  // --- Add Operation ---
  if (btnAddOp) {
    btnAddOp.addEventListener('click', () => {
      agregarPasoPipeline(pipelineContainer, null, onSelectionChange);
      onSelectionChange();
    });
  }

  // --- Auto-plot toggle ---
  if (toggleAutoPlot) {
    toggleAutoPlot.addEventListener('change', (e) => {
      if (botonGraficar) botonGraficar.style.display = e.target.checked ? 'none' : 'block';
      if (e.target.checked) actualizarGrafico();
    });
  }

  // --- Export Plot (con modo SVG forzado) ---
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
        exportarPlot(svg, selectFormat.value);
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

  // --- Export CSV Raw ---
  if (botonExportCsvRaw) {
    botonExportCsvRaw.addEventListener('click', () => {
      const selectX = document.getElementById('selectX');
      if (!selectX) return;
      const xIndex = parseInt(selectX.value);
      const yIndices = Array.from(document.querySelectorAll('.checkbox-y:checked')).map(cb => parseInt(cb.value));
      exportarCSV(columnasGlobales, xIndex, yIndices, getMathPipeline(), false);
    });
  }

  // --- Export CSV Processed ---
  if (botonExportCsvProcessed) {
    botonExportCsvProcessed.addEventListener('click', () => {
      const selectX = document.getElementById('selectX');
      if (!selectX) return;
      const xIndex = parseInt(selectX.value);
      const yIndices = Array.from(document.querySelectorAll('.checkbox-y:checked')).map(cb => parseInt(cb.value));
      exportarCSV(columnasGlobales, xIndex, yIndices, getMathPipeline(), true);
    });
  }

  function actualizarGrafico() {
    if (!columnasGlobales) return;
    const selectX = document.getElementById('selectX');
    if (!selectX) return;
    const xIndex = parseInt(selectX.value);
    const yIndices = Array.from(document.querySelectorAll('.checkbox-y:checked')).map(cb => parseInt(cb.value));

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
