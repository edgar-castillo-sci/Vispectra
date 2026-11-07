import { t, setLanguage } from './i18n.js';
import { deduplicateColumns } from './services/columns.js';
import { applyPipeline } from './services/pipeline.js';
import { openDisambiguationModal } from './ui/disambiguationModal.js';
import { openColumnsModal } from './ui/columnsModal.js';

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
  const toggleAutoPlot = document.getElementById('toggleAutoPlot');
  const langSelector = document.getElementById('langSelector');
  const btnAddOp = document.getElementById('btnAddOp');
  const pipelineContainer = document.getElementById('pipelineContainer');

  if (!zona || !input || !botonProcesar) return;

  if (langSelector) {
    langSelector.addEventListener('change', (e) => {
      setLanguage(e.target.value);
      if (columnasGlobales) {
        prepararRolePanel(columnasGlobales.length, null, false);
        const currentPipeline = getMathPipeline();
        pipelineContainer.innerHTML = '';
        currentPipeline.forEach((op) => agregarPasoPipeline(op));
      }
    });
  }

  zona.addEventListener('click', () => input.click());
  input.addEventListener('change', (e) => {
    actualizarArchivos(e.target.files, salida);
    input.value = '';
  });
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((ev) =>
    zona.addEventListener(ev, (e) => e.preventDefault())
  );
  zona.addEventListener('drop', (e) =>
    actualizarArchivos(e.dataTransfer.files, salida)
  );

  botonProcesar.addEventListener('click', async () => {
    if (archivos.length === 0) return (salida.textContent = t('status_waiting'));
    salida.textContent = t('status_processing');

    try {
      let result = await onProcesar(archivos[0], {});

      if (!result) {
        salida.textContent = `✗ ${archivos[0].name}: compile() returned null\n`;
        return;
      }

      if (result.status === 'needs_disambiguation') {
        const resolutions = await openDisambiguationModal(result.ambiguities);
        if (!resolutions) {
          salida.textContent = `✗ ${archivos[0].name}: disambiguation cancelled\n`;
          return;
        }
        salida.textContent = t('status_processing');
        result = await onProcesar(archivos[0], { resolutions });
      }

      if (!result) {
        salida.textContent = `✗ ${archivos[0].name}: compile() returned null after disambiguation\n`;
        return;
      }

      if (result.status === 'failed') {
        salida.textContent = `✗ ${archivos[0].name}: failed (${result.failedRows}/${result.totalRows} rows)\n`;
        const errors = (result.diagnostics || [])
          .filter((d) => d.severity === 'error')
          .slice(0, 5);
        for (const e of errors) {
          salida.textContent += `    ${e.code}\n`;
        }
        return;
      }

      if (result.status === 'ok' || result.status === 'partial') {
        if (!result.columns || result.columns.length === 0) {
          salida.textContent = `✗ ${archivos[0].name}: no columns produced\n`;
          return;
        }

        const { unique, originalIndices } = deduplicateColumns(result.columns);

        let autoSelect = false;
        let finalColumns = unique;
        let finalIndices = originalIndices;

                // Si hay columnas duplicadas, preguntamos al usuario usando el modal
        if (unique.length < result.columns.length) {
          const duplicatesCount = result.columns.length - unique.length;
          const shouldCollapse = await openColumnsModal(
            duplicatesCount,
            unique.length,
            result.columns.length
          );

          if (shouldCollapse) {
            autoSelect = true; // Activa las Y automáticamente
          } else {
            // Si dice que no, no colapsa y no auto-selecciona nada
            finalColumns = result.columns;
            finalIndices = result.columns.map((_, i) => i);
          }
        }

        columnasGlobales = finalColumns;

        salida.textContent =
          `✓ ${archivos[0].name}\n` +
          `  status: ${result.status}\n` +
          `  columns: ${finalColumns.length} (from ${result.columns.length})\n` +
          `  rows: ${result.totalRows} (failed: ${result.failedRows})\n` +
          `  canon: ${result.canonLiteral.substring(0, 50)}...\n` +
          `  segments: ${result.segments.length}` +
          (result.segments.some((s) => s.isException) ? ' (with exceptions)' : '') +
          '\n';

        prepararRolePanel(finalColumns.length, finalIndices, autoSelect);

        if (rolePanel) rolePanel.style.display = 'block';
        if (botonExportCsvRaw) botonExportCsvRaw.style.display = 'block';
        if (toggleAutoPlot && toggleAutoPlot.checked) actualizarGrafico();
      }
    } catch (err) {
      console.error(err);
      salida.textContent = `✗ Error inesperado: ${err.message}\nRevisa la consola (F12) para más detalles.`;
    }
  });

  if (btnAddOp) {
    btnAddOp.addEventListener('click', () => {
      agregarPasoPipeline();
      onSelectionChange();
    });
  }

  if (toggleAutoPlot) {
    toggleAutoPlot.addEventListener('change', (e) => {
      if (botonGraficar)
        botonGraficar.style.display = e.target.checked ? 'none' : 'block';
      if (e.target.checked) actualizarGrafico();
    });
  }

  if (botonExportar) {
    botonExportar.addEventListener('click', async () => {
      const svg = document.getElementById('spectrumSvg');
      if (!svg || !svg.innerHTML) return;
      const format = selectFormat.value;
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(svg);
      if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"'))
        svgString = svgString.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');

      if (format === 'svg') descargarArchivo(svgString, 'image/svg+xml', 'svg');
      else if (format === 'png' || format === 'jpeg') exportarRaster(svgString, format);
      else if (format === 'pdf') exportarPDF(svg);
    });
  }

  if (botonExportCsvRaw) botonExportCsvRaw.addEventListener('click', () => exportarCSV(false));
  if (botonExportCsvProcessed) botonExportCsvProcessed.addEventListener('click', () => exportarCSV(true));

  // ------------------------------------------------------------
  // Math Pipeline UI
  // ------------------------------------------------------------
  function agregarPasoPipeline(opData = null) {
    const step = document.createElement('div');
    step.className = 'pipeline-step';
    step.innerHTML =
      `<button class="btn-remove" title="Remove">×</button>` +
      `<select class="op-type">` +
      `<option value="none">${t('op_none')}</option>` +
      `<option value="smooth">${t('op_smooth')}</option>` +
      `<option value="derivative">${t('op_derivative')}</option>` +
      `<option value="baseline">${t('op_baseline')}</option>` +
      `<option value="minmax">${t('op_minmax')}</option>` +
      `<option value="max">${t('op_max')}</option>` +
      `</select>` +
      `<div class="op-params" style="display: none; margin-top: 0.5rem; font-size: 0.8rem;"></div>`;

    const select = step.querySelector('.op-type');
    const paramsDiv = step.querySelector('.op-params');
    const btnRemove = step.querySelector('.btn-remove');

    select.addEventListener('change', () => {
      actualizarParametros(select.value, paramsDiv);
      onSelectionChange();
    });
    btnRemove.addEventListener('click', () => {
      step.remove();
      onSelectionChange();
    });
    pipelineContainer.appendChild(step);

    if (opData) {
      select.value = opData.type;
      actualizarParametros(opData.type, paramsDiv, opData);
    }
  }

  function actualizarParametros(tipo, container, prevData = null) {
    container.innerHTML = '';
    container.style.display = 'block';

    if (tipo === 'smooth') {
      const win = prevData ? prevData.window : 5;
      container.innerHTML =
        `<label>${t('param_window')} <span class="win-val">${win}</span></label>` +
        `<input type="range" class="win-slider" min="3" max="21" step="2" value="${win}" style="width: 100%;">`;
      const slider = container.querySelector('.win-slider');
      const val = container.querySelector('.win-val');
      slider.addEventListener('input', (e) => {
        val.textContent = e.target.value;
        onSelectionChange();
      });
    } else if (tipo === 'baseline') {
      const len = columnasGlobales ? columnasGlobales[0].length : 100;
      const startIdx = prevData ? prevData.start : Math.floor(len * 0.1);
      const endIdx = prevData ? prevData.end : Math.floor(len * 0.9);
      container.innerHTML =
        `<label>${t('param_start')} <input type="number" class="base-start" value="${startIdx}" style="width: 60px;"></label>` +
        `<label>${t('param_end')} <input type="number" class="base-end" value="${endIdx}" style="width: 60px;"></label>`;
      container.querySelector('.base-start').addEventListener('input', onSelectionChange);
      container.querySelector('.base-end').addEventListener('input', onSelectionChange);
    } else if (tipo === 'none') {
      container.style.display = 'none';
    }
  }

  function getMathPipeline() {
    const steps = [];
    document.querySelectorAll('.pipeline-step').forEach((step) => {
      const type = step.querySelector('.op-type').value;
      if (type === 'none') return;
      const params = { type };
      if (type === 'smooth') {
        params.window = parseInt(step.querySelector('.win-slider').value);
      } else if (type === 'baseline') {
        params.start = parseInt(step.querySelector('.base-start').value);
        params.end = parseInt(step.querySelector('.base-end').value);
      }
      steps.push(params);
    });
    return steps;
  }

  function actualizarGrafico() {
    if (!columnasGlobales) return;
    const selectX = document.getElementById('selectX');
    if (!selectX) return;
    const xIndex = parseInt(selectX.value);
    const yIndices = [];
    document.querySelectorAll('.checkbox-y:checked').forEach((cb) => yIndices.push(parseInt(cb.value)));

    const pipeline = getMathPipeline();
    const processedColumns = applyPipeline(columnasGlobales, xIndex, yIndices, pipeline);
    onGraficar(processedColumns, xIndex, yIndices);
  }

  function exportarCSV(procesar) {
    if (!columnasGlobales) return;
    const selectX = document.getElementById('selectX');
    const xIndex = parseInt(selectX.value);
    const yIndices = [];
    document.querySelectorAll('.checkbox-y:checked').forEach((cb) => yIndices.push(parseInt(cb.value)));
    if (yIndices.length === 0) return alert(t('alert_select_y'));

    let finalColumns = columnasGlobales;
    if (procesar) {
      const pipeline = getMathPipeline();
      finalColumns = applyPipeline(columnasGlobales, xIndex, yIndices, pipeline);
    }

    const xData = finalColumns[xIndex];
    const ySeries = yIndices.map((i) => finalColumns[i]);

    let csvContent = '';
    const headers = [`${t('col_prefix')}_${xIndex}`];
    yIndices.forEach((idx) => headers.push(`${t('col_prefix')}_${idx}`));
    csvContent += headers.join(',') + '\n';

    for (let i = 0; i < xData.length; i++) {
      const row = [xData[i]];
      ySeries.forEach((yData) => row.push(yData[i] !== null && yData[i] !== undefined ? yData[i] : ''));
      csvContent += row.join(',') + '\n';
    }
    descargarArchivo(csvContent, 'text/csv;charset=utf-8;', 'csv');
  }

  function descargarArchivo(content, mimeType, extension) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vispectra_${extension === 'csv' ? 'data' : 'plot'}_${Date.now()}.${extension}`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  }

  function exportarRaster(svgString, format) {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 1000;
      const ctx = canvas.getContext('2d');
      if (format === 'jpeg') { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const link = document.createElement('a'); link.href = canvas.toDataURL(mime, 0.95);
      link.download = `vispectra_plot_${Date.now()}.${format}`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  async function exportarPDF(svg) {
    if (!window.jspdf || !window.svg2pdf) return alert('PDF libs loading...');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape', 'px', [800, 500]);
    await doc.svg(svg, { x: 0, y: 0, width: 800, height: 500 });
    doc.save(`vispectra_plot_${Date.now()}.pdf`);
  }

  function onSelectionChange() {
    if (toggleAutoPlot && toggleAutoPlot.checked) actualizarGrafico();
  }

  function prepararRolePanel(numColumnas, originalIndices, autoSelect) {
    const selectX = document.getElementById('selectX');
    const checkboxesY = document.getElementById('checkboxesY');
    if (!selectX || !checkboxesY) return;
    selectX.innerHTML = '';
    checkboxesY.innerHTML = '';

    for (let i = 0; i < numColumnas; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      const label = originalIndices ? originalIndices[i] : i;
      opt.textContent = `${t('col_prefix')} ${label}`;
      selectX.appendChild(opt);
    }

    for (let i = 0; i < numColumnas; i++) {
      const label = document.createElement('label');
      label.style.display = 'block';
      label.style.fontSize = '0.9rem';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = i;
      cb.className = 'checkbox-y';

      const cbId = `col-checkbox-${i}`;
      cb.id = cbId;
      label.htmlFor = cbId;

      // NUEVA LÓGICA DE AUTO-SELECCIÓN
      if (autoSelect) {
        // Si el usuario aceptó colapsar, seleccionamos todas las Y (excepto X=0)
        if (i !== 0) cb.checked = true;
      } else {
        // Por defecto, solo marcamos la primera Y (la 1)
        if (i === 1) cb.checked = true;
      }

      cb.addEventListener('change', onSelectionChange);

      label.appendChild(cb);
      const labelIdx = originalIndices ? originalIndices[i] : i;
      label.appendChild(document.createTextNode(` ${t('col_prefix')} ${labelIdx}`));
      checkboxesY.appendChild(label);
    }
    selectX.addEventListener('change', onSelectionChange);
  }
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function actualizarArchivos(fileList, salida) {
  archivos = Array.from(fileList);
  if (archivos.length === 0) return (salida.textContent = t('status_waiting'));
  salida.textContent = `${archivos.length} file(s) ready.`;
}
