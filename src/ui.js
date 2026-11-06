import { t, setLanguage } from './i18n.js';

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
  const botonGraficar = document.getElementById('botonGraficar');
  const botonExportar = document.getElementById('botonExportar');
  const botonExportCsv = document.getElementById('botonExportCsv');
  const selectFormat = document.getElementById('selectFormat');
  const salida = document.getElementById('salida');
  const rolePanel = document.getElementById('rolePanel');
  const toggleAutoPlot = document.getElementById('toggleAutoPlot');
  const langSelector = document.getElementById('langSelector');

  const selectMathOp = document.getElementById('selectMathOp');
  const smoothParams = document.getElementById('smoothParams');
  const sliderWindow = document.getElementById('sliderWindow');
  const windowValue = document.getElementById('windowValue');

  if (!zona || !input || !botonProcesar || !salida) return;

  // --- Selector de Idioma ---
  if (langSelector) {
    langSelector.addEventListener('change', (e) => {
      setLanguage(e.target.value);
      // Redibujar el panel de roles si ya hay datos cargados para traducir los checkboxes
      if (columnasGlobales) prepararRolePanel(columnasGlobales.length);
    });
  }

  zona.addEventListener('click', () => input.click());
  input.addEventListener('change', (e) => { actualizarArchivos(e.target.files, salida); input.value = ''; });
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => zona.addEventListener(ev, e => e.preventDefault()));
  zona.addEventListener('drop', (e) => actualizarArchivos(e.dataTransfer.files, salida));

  botonProcesar.addEventListener('click', async () => {
    if (archivos.length === 0) return salida.textContent = t('status_waiting');
    salida.textContent = t('status_processing');
    const resultado = await onProcesar(archivos[0], salida);

    if (resultado) {
      columnasGlobales = resultado.columns;
      prepararRolePanel(resultado.columns.length);
      if(rolePanel) rolePanel.style.display = 'block';
      if (toggleAutoPlot && toggleAutoPlot.checked) actualizarGrafico();
    }
  });

  if (botonGraficar) botonGraficar.addEventListener('click', actualizarGrafico);

  if (toggleAutoPlot) {
    toggleAutoPlot.addEventListener('change', (e) => {
      if (botonGraficar) botonGraficar.style.display = e.target.checked ? 'none' : 'block';
      if (e.target.checked) actualizarGrafico();
    });
  }

  if (selectMathOp) {
    selectMathOp.addEventListener('change', (e) => {
      if (e.target.value === 'smooth') smoothParams.style.display = 'block';
      else smoothParams.style.display = 'none';
      onSelectionChange();
    });
  }

  if (sliderWindow) {
    sliderWindow.addEventListener('input', (e) => {
      windowValue.textContent = e.target.value;
      onSelectionChange();
    });
  }

  // --- Exportaciones ---
  if (botonExportar) {
    botonExportar.addEventListener('click', async () => {
      const svg = document.getElementById('spectrumSvg');
      if (!svg || !svg.innerHTML) return;
      const format = selectFormat.value;
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(svg);
      if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) svgString = svgString.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
      if (format === 'svg') descargarArchivo(svgString, 'image/svg+xml', 'svg');
      else if (format === 'png' || format === 'jpeg') exportarRaster(svgString, format);
      else if (format === 'pdf') exportarPDF(svg);
    });
  }

  if (botonExportCsv) {
    botonExportCsv.addEventListener('click', () => {
      if (!columnasGlobales) return;
      const selectX = document.getElementById('selectX');
      const xIndex = parseInt(selectX.value);
      const yIndices = [];
      document.querySelectorAll('.checkbox-y:checked').forEach(cb => yIndices.push(parseInt(cb.value)));
      if (yIndices.length === 0) return alert(t('alert_select_y'));

      const xData = columnasGlobales[xIndex];
      const ySeries = yIndices.map(i => columnasGlobales[i]);

      let csvContent = "";
      let headers = [`${t('col_prefix')}_${xIndex}`];
      yIndices.forEach(idx => headers.push(`${t('col_prefix')}_${idx}`));
      csvContent += headers.join(',') + "\n";

      for (let i = 0; i < xData.length; i++) {
        let row = [xData[i]];
        ySeries.forEach(yData => row.push(yData[i] !== null && yData[i] !== undefined ? yData[i] : ""));
        csvContent += row.join(',') + "\n";
      }
      descargarArchivo(csvContent, 'text/csv;charset=utf-8;', 'csv');
    });
  }

  function getMathOptions() {
    return {
      type: selectMathOp ? selectMathOp.value : 'none',
      window: sliderWindow ? parseInt(sliderWindow.value) : 5
    };
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
    if (!window.jspdf || !window.svg2pdf) return alert("PDF libs loading...");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape', 'px', [800, 500]);
    await doc.svg(svg, { x: 0, y: 0, width: 800, height: 500 });
    doc.save(`vispectra_plot_${Date.now()}.pdf`);
  }

  function actualizarGrafico() {
    if (!columnasGlobales) return;
    const selectX = document.getElementById('selectX');
    if (!selectX) return;
    const xIndex = parseInt(selectX.value);
    const yIndices = [];
    document.querySelectorAll('.checkbox-y:checked').forEach(cb => yIndices.push(parseInt(cb.value)));
    onGraficar(columnasGlobales, xIndex, yIndices, getMathOptions());
  }

  function onSelectionChange() {
    if (toggleAutoPlot && toggleAutoPlot.checked) actualizarGrafico();
  }

  function prepararRolePanel(numColumnas) {
    const selectX = document.getElementById('selectX');
    const checkboxesY = document.getElementById('checkboxesY');
    if (!selectX || !checkboxesY) return;
    selectX.innerHTML = ''; checkboxesY.innerHTML = '';

    for (let i = 0; i < numColumnas; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `${t('col_prefix')} ${i}`;
      selectX.appendChild(opt);
    }
    for (let i = 0; i < numColumnas; i++) {
      const label = document.createElement('label'); label.style.display = 'block'; label.style.fontSize = '0.9rem';
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.value = i; cb.className = 'checkbox-y';
      if (i === 1) cb.checked = true;
      cb.addEventListener('change', onSelectionChange);
      label.appendChild(cb);
      label.appendChild(document.createTextNode(` ${t('col_prefix')} ${i}`));
      checkboxesY.appendChild(label);
    }
    selectX.addEventListener('change', onSelectionChange);
  }
}

function actualizarArchivos(fileList, salida) {
  archivos = Array.from(fileList);
  if (archivos.length === 0) return salida.textContent = t('status_waiting');
  salida.textContent = `${archivos.length} file(s) ready.`;
}
