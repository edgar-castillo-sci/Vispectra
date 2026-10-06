// ============================================================
// VISPECTRA — ORQUESTADOR
// ============================================================
// No implementa lógica del compilador. Solo llama a las fases
// en orden y pasa los datos entre ellas.
//
// Pipeline:
//   [Archivo]
//       ↓
//   [00_lectura]      → texto + diagnósticos
//       ↓
//   [01_muestreo]     → líneas, terciolineas, muestra + diagnósticos
//       ↓
//   [02_lexer]        → estructura por línea + diagnósticos
//       ↓
//   [03_ir]           → IR ensamblado + diagnósticos
//       ↓
//   [04_canon]        → canon generalizado con i + diagnósticos
//       ↓
//   [05_fijacion]  → canon fijo + diagnósticos
//       ↓
//   [06_parser]       → valores por línea + diagnósticos
//       ↓
//   [07_semantica]    → valores verificados + diagnósticos
//       ↓
//   [08_codegen]      → columnas llenas (mutación)
//       ↓
//   [09_diagnostico]  → acumulador de diagnósticos
//       ↓
//   [Datos normalizados + diagnósticos]
//
// NO hace:
//   - No lee archivos.
//   - No interpreta.
//   - No verifica.
//   - Solo orquesta.
// ============================================================

import { initUI } from './ui.js';

import { leerArchivo } from './compilador/00_lectura.js';
import { muestrear } from './compilador/01_muestreo.js';
import { lexear } from './compilador/02_lexer.js';
import { construirIR } from './compilador/03_ir.js';
import { construirCanon } from './compilador/04_canon.js';
import { fijarCanon, contarColumnas } from './compilador/05_fijacion.js';
import { interpretarLinea } from './compilador/06_parser.js';
import { verificar } from './compilador/07_semantica.js';
import { crearColumnas, inyectar } from './compilador/08_codegen.js';
import { crearLog } from './compilador/09_diagnostico.js';

// ------------------------------------------------------------
// Auxiliar local: recolecta diagnósticos en el log,
// añadiendo el contexto común (nombre del archivo, índice, etc.)
// a los params de cada diagnóstico.
// ------------------------------------------------------------
function recolectar(diagnosticos, log, contexto = {}) {
  for (const d of diagnosticos) {
    log.agregar({ ...d, params: { ...d.params, ...contexto } });
  }
}

// ------------------------------------------------------------
// compilar(file) → { columnas, canonFijo, log }
// ------------------------------------------------------------
export async function compilar(file) {
  const log = crearLog();

  // --- Fase 00: lectura ---
  const { texto, diagnosticos: diagLectura } = await leerArchivo(file);
  recolectar(diagLectura, log, { nombre: file.name });

  // --- Fase 01: muestreo ---
  const { lineas, terciolineas, muestra, diagnosticos: diagMuestreo } = muestrear(texto);
  recolectar(diagMuestreo, log, { nombre: file.name });

  // --- Fase 02: lexer (solo sobre la muestra) ---
  const estructuras = [];
  for (const idx of muestra) {
    const { estructura, diagnosticos } = lexear(lineas[idx].contenido);
    recolectar(diagnosticos, log, { nombre: file.name, indice: idx });
    estructuras.push({ indice: idx, estructura });
  }

  // --- Fase 03: IR ---
  const { porLinea, frecuencias, longitudes, diagnosticos: diagIR } = construirIR(estructuras);
  recolectar(diagIR, log, { nombre: file.name });

  // --- Fase 04: canon + expansión ---
  const {
    canon,
    cuerpo,
    diagnosticos: diagCanon,
  } = construirCanon({ porLinea, frecuencias, longitudes }, lineas, terciolineas);
  recolectar(diagCanon, log, { nombre: file.name });
  
  // --- Fase 05: fijación ---
  const { canonFijo, diagnosticos: diagFijo } = fijarCanon(canon);
  recolectar(diagFijo, log, { nombre: file.name });

  // --- Preparación de columnas ---
  const numColumn = contarColumnas(canonFijo);
  const columnas = crearColumnas(numColumn);

  // --- Fases 06–08: interpretar, verificar, inyectar ---
  for (let i = 0; i < lineas.length; i++) {
    const interpretada = interpretarLinea(lineas[i], canonFijo);
    recolectar(interpretada.diagnosticos, log, { nombre: file.name, indice: i });
    if (!interpretada.ok) continue;

    const verificada = verificar(interpretada, canonFijo);
    recolectar(verificada.diagnosticos, log, { nombre: file.name, indice: i });
    if (!verificada.ok) continue;

    inyectar(verificada.valores, columnas);
  }

  return { columnas, canonFijo, cuerpo, log };
}

// ------------------------------------------------------------
// Punto de entrada: conecta la UI con el compilador.
// ------------------------------------------------------------
initUI(async (archivos, salida) => {
  salida.textContent = '';

  for (const archivo of archivos) {
    try {
      const { columnas, canonFijo, cuerpo, log } = await compilar(archivo);

      salida.textContent += `✓ ${archivo.name}\n`;
      salida.textContent += `  columnas: ${columnas.length}\n`;
      salida.textContent += `  canon: ${canonFijo.join('')}\n`;
      salida.textContent += `  cuerpo: [${cuerpo.inicio}, ${cuerpo.fin}]\n`;

      const errores = log.porSeveridad('error');
      const avisos = log.porSeveridad('warn');

      if (errores.length > 0) {
        salida.textContent += `  errores: ${errores.length}\n`;
      }
      if (avisos.length > 0) {
        salida.textContent += `  avisos: ${avisos.length}\n`;
      }
    } catch (err) {
      salida.textContent += `✗ ${archivo.name}: ${err.message}\n`;
    }
  }
});
