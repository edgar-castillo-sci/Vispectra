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

  if (!zona || !input || !botonProcesar || !salida) return;

  zona.addEventListener('click', () => input.click());
  input.addEventListener('change', (e) => { actualizarArchivos(e.target.files, salida); input.value = ''; });
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => zona.addEventListener(ev, e => e.preventDefault()));
  zona.addEventListener('drop', (e) => actualizarArchivos(e.dataTransfer.files, salida));

  botonProcesar.addEventListener('click', async () => {
    if (archivos.length === 0) return salida.textContent = 'No hay archivos.';
    salida.textContent = 'Procesando...';
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

  // --- LÓGICA DE EXPORTACIÓN GRÁFICA ---
  if (botonExportar) {
    botonExportar.addEventListener('click', async () => {
      const svg = document.getElementById('spectrumSvg');
      if (!svg || !svg.innerHTML) return;

      const format = selectFormat.value;
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(svg);

      if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
        svgString = svgString.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
      }

      if (format === 'svg') {
        descargarArchivo(svgString, 'image/svg+xml', 'svg');
      } else if (format === 'png' || format === 'jpeg') {
        exportarRaster(svgString, format);
      } else if (format === 'pdf') {
        exportarPDF(svg);
      }
    });
  }

  // --- LÓGICA DE EXPORTACIÓN CSV ---
  if (botonExportCsv) {
    botonExportCsv.addEventListener('click', () => {
      if (!columnasGlobales) return;

      const selectX = document.getElementById('selectX');
      const xIndex = parseInt(selectX.value);
      const yIndices = [];
      document.querySelectorAll('.checkbox-y:checked').forEach(cb => yIndices.push(parseInt(cb.value)));

      if (yIndices.length === 0) {
        alert("Selecciona al menos una columna Y para exportar.");
        return;
      }

      const xData = columnasGlobales[xIndex];
      const ySeries = yIndices.map(i => columnasGlobales[i]);

      // Construir el CSV
      let csvContent = "";

      // Encabezados
      let headers = [`Columna_${xIndex}`];
      yIndices.forEach(idx => headers.push(`Columna_${idx}`));
      csvContent += headers.join(',') + "\n";

      // Filas
      for (let i = 0; i < xData.length; i++) {
        let row = [xData[i]];
        ySeries.forEach(yData => {
          // Si el valor es null o undefined, lo dejamos vacío en el CSV
          row.push(yData[i] !== null && yData[i] !== undefined ? yData[i] : "");
        });
        csvContent += row.join(',') + "\n";
      }

      // Descargar
      descargarArchivo(csvContent, 'text/csv;charset=utf-8;', 'csv');
    });
  }

  function descargarArchivo(content, mimeType, extension) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vispectra_${extension === 'csv' ? 'data' : 'plot'}_${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportarRaster(svgString, format) {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 1000;
      const ctx = canvas.getContext('2d');

      if (format === 'jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const dataUrl = canvas.toDataURL(mime, 0.95);

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `vispectra_plot_${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  async function exportarPDF(svg) {
    if (!window.jspdf || !window.svg2pdf) {
      alert("Las librerías para exportar PDF aún se están cargando. Intenta de nuevo en un segundo.");
      return;
    }
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
    onGraficar(columnasGlobales, xIndex, yIndices);
  }

  function onSelectionChange() {
    if (toggleAutoPlot && toggleAutoPlot.checked) actualizarGrafico();
  }

  function prepararRolePanel(numColumnas) {
    const selectX = document.getElementById('selectX');
    const checkboxesY = document.getElementById('checkboxesY');
    if (!selectX || !checkboxesY) return;

    selectX.innerHTML = '';
    checkboxesY.innerHTML = '';

    for (let i = 0; i < numColumnas; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `Columna ${i}`;
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
      if (i === 1) cb.checked = true;
      cb.addEventListener('change', onSelectionChange);
      label.appendChild(cb);
      label.appendChild(document.createTextNode(` Columna ${i}`));
      checkboxesY.appendChild(label);
    }
    selectX.addEventListener('change', onSelectionChange);
  }
}

function actualizarArchivos(fileList, salida) {
  archivos = Array.from(fileList);
  if (archivos.length === 0) return salida.textContent = 'Esperando archivos...';
  salida.textContent = `${archivos.length} archivo(s) listos para procesar.`;
}
