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
  const salida = document.getElementById('salida');
  const rolePanel = document.getElementById('rolePanel');
  const toggleAutoPlot = document.getElementById('toggleAutoPlot');

  zona.addEventListener('click', () => input.click());

  input.addEventListener('change', (e) => {
    actualizarArchivos(e.target.files, salida);
    input.value = '';
  });

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evento => {
    zona.addEventListener(evento, (e) => e.preventDefault());
  });

  zona.addEventListener('drop', (e) => {
    actualizarArchivos(e.dataTransfer.files, salida);
  });

  botonProcesar.addEventListener('click', async () => {
    if (archivos.length === 0) {
      salida.textContent = 'No hay archivos para procesar.';
      return;
    }

    salida.textContent = 'Procesando...';
    const resultado = await onProcesar(archivos[0], salida);

    if (resultado) {
      columnasGlobales = resultado.columns;
      prepararRolePanel(resultado.columns.length);
      rolePanel.style.display = 'block';

      if (toggleAutoPlot.checked) actualizarGrafico();
    }
  });

  botonGraficar.addEventListener('click', actualizarGrafico);

  toggleAutoPlot.addEventListener('change', (e) => {
    if (e.target.checked) {
      botonGraficar.style.display = 'none';
      actualizarGrafico();
    } else {
      botonGraficar.style.display = 'block';
    }
  });

  function actualizarGrafico() {
    if (!columnasGlobales) return;

    const selectX = document.getElementById('selectX');
    const xIndex = parseInt(selectX.value);

    const yIndices = [];
    document.querySelectorAll('.checkbox-y:checked').forEach(cb => {
      yIndices.push(parseInt(cb.value));
    });

    onGraficar(columnasGlobales, xIndex, yIndices);
  }

  function onSelectionChange() {
    if (toggleAutoPlot.checked) actualizarGrafico();
  }

  function prepararRolePanel(numColumnas) {
    const selectX = document.getElementById('selectX');
    const checkboxesY = document.getElementById('checkboxesY');

    selectX.innerHTML = '';
    checkboxesY.innerHTML = '';

    // Llenar el selector del Eje X con TODAS las columnas
    for (let i = 0; i < numColumnas; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `Columna ${i}`;
      selectX.appendChild(opt);
    }

    // Llenar los checkboxes del Eje Y con TODAS las columnas
    for (let i = 0; i < numColumnas; i++) {
      // ELIMINADO: if (i === 0) continue;

      const label = document.createElement('label');
      label.style.display = 'block';
      label.style.fontSize = '0.9rem';
      label.style.marginBottom = '0.2rem';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = i;
      cb.className = 'checkbox-y';

      // Por defecto, seleccionamos la columna 1 como Y (si existe)
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
  if (archivos.length === 0) {
    salida.textContent = 'Esperando archivos...';
    return;
  }
  salida.textContent = `${archivos.length} archivo(s) listos para procesar.`;
}
