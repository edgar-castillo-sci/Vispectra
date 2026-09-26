// ============================================================
// FASE 10 — UI HÍBRIDA (futuro)
// ============================================================
// Recibe: el resultado del compilador y las columnas.
// Devuelve: la configuración de roles de columnas.
//
// Hace:
//   - R80: si se detectan más de 2 columnas, la UI pregunta al usuario
//          qué significa cada una.
//   - R81: roles posibles: longitud de onda, absorbancia, transmitancia,
//          absorbancia adicional, otro parámetro, ignorar.
//   - R82: según la respuesta, se aplican las operaciones correspondientes
//          (normalización, suavizado, baseline, picos).
//   - R83: ni automatización absoluta ni control absoluto: el parser
//          deduce lo que puede, pregunta cuando no.
//
// NO hace:
//   - No parsea.
//   - No valida.
//   - Solo interactúa con el usuario y aplica la configuración elegida.
//
// Notas:
//   - Esta fase no forma parte del compilador en sí.
//     Vive en la capa de UI, después de que el compilador termina.
// ============================================================
// ============================================================
// UI
// ============================================================
// Recibe: una función de procesamiento (callback).
// Devuelve: nada.
//
// Hace:
//   - Registrar listeners del input y del drag & drop.
//   - Mantener la lista de archivos seleccionados.
//   - Llamar al callback cuando el usuario pulsa "Procesar".
//
// NO hace:
//   - No compila.
//   - No parsea.
//   - Solo captura archivos y delega.
// ============================================================

let archivos = [];
let onProcesar = null;

export function initUI(procesarFn) {
  onProcesar = procesarFn;

  const zona = document.getElementById('zonaDrop');
  const input = document.getElementById('entradaArchivos');
  const botonProcesar = document.getElementById('botonProcesar');
  const salida = document.getElementById('salida');

  // --- Input clásico ---
  input.addEventListener('change', (e) => {
    actualizarArchivos(e.target.files, salida);
    input.value = ''; // permite volver a seleccionar el mismo archivo
  });

  // --- Drag & drop ---
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evento => {
    zona.addEventListener(evento, (e) => e.preventDefault());
  });

  zona.addEventListener('dragenter', () => {
    zona.style.borderColor = '#7B5EA7';
    zona.style.background = '#f0eaff';
  });
  zona.addEventListener('dragleave', () => {
    zona.style.borderColor = '#999';
    zona.style.background = '';
  });
  zona.addEventListener('drop', (e) => {
    zona.style.borderColor = '#999';
    zona.style.background = '';
    actualizarArchivos(e.dataTransfer.files, salida);
  });

  // --- Procesar ---
  botonProcesar.addEventListener('click', async () => {
    if (archivos.length === 0) {
      salida.textContent = 'No hay archivos para procesar.';
      return;
    }
    if (onProcesar) {
      await onProcesar(archivos, salida);
    }
  });
}

function actualizarArchivos(fileList, salida) {
  archivos = Array.from(fileList);
  if (archivos.length === 0) {
    salida.textContent = 'Esperando archivos...';
    return;
  }
  salida.textContent = `${archivos.length} archivo(s): ` +
    archivos.map(a => a.name).join(', ');
}