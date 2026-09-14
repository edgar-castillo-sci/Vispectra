// ============================================================
// VISPECTRA — ORQUESTADOR
// ============================================================
// Este archivo no implementa lógica del compilador.
// Solo llama a las fases en orden y pasa los datos entre ellas.
//
// Pipeline:
//   [Archivo]
//       ↓
//   [00_lectura]      → texto
//       ↓
//   [01_muestreo]     → líneas, terciolineas, muestra
//       ↓
//   [02_lexer]        → estructura_interna por línea
//       ↓
//   [03_ir]           → IR ensamblado
//       ↓
//   [04_canon]        → canon generalizado con i
//       ↓
//   [05_congelacion]  → canon congelado
//       ↓
//   [06_parser]       → valores por línea
//       ↓
//   [07_semantica]    → validación
//       ↓
//   [08_codegen]      → columnas llenas
//       ↓
//   [09_diagnostico]  → logs y errores
//       ↓
//   [Datos normalizados]
//
// NO hace:
//   - No lee archivos.
//   - No parsea.
//   - No valida.
//   - Solo orquesta.
// ============================================================

import { leerArchivo } from './compilador/00_lectura.js';
import { muestrear } from './compilador/01_muestreo.js';
import { lexear } from './compilador/02_lexer.js';
import { construirIR } from './compilador/03_ir.js';
import { construirCanon } from './compilador/04_canon.js';
import { congelarCanon } from './compilador/05_congelacion.js';
import { parsearLinea } from './compilador/06_parser.js';
import { validar } from './compilador/07_semantica.js';
import { generarColumnas } from './compilador/08_codegen.js';
import { crearLog } from './compilador/09_diagnostico.js';

export async function compilar(file) {
  const log = crearLog();

  // Fase 0: lectura
  const texto = await leerArchivo(file);
  log.info(`Archivo leído: ${file.name}`);

  // Fase 1: muestreo
  const { lineas, muestra, terciolineas } = muestrear(texto);
  log.info(`Total de líneas: ${lineas.length}, terciolineas: ${terciolineas}`);

  // Fase 2: lexer → estructura_interna por línea muestreada
  const estructuras = muestra.map(m => lexear(m.contenido));

  // Fase 3: IR → ensamblar estructuras en un IR único
  const ir = construirIR(estructuras);

  // Fase 4: canon → generalizar a una clave canónica con i
  const canon = construirCanon(ir);

  // Fase 5: congelación
  const canonCongelado = congelarCanon(canon);

  // Fase 6-8: parsear todas las líneas con el canon congelado
  const columnas = generarColumnas(lineas.length);
  for (let i = 0; i < lineas.length; i++) {
    const resultado = parsearLinea(lineas[i], canonCongelado);
    if (resultado.ok) {
      validar(resultado.valores, columnas, canonCongelado, i);
    } else {
      log.error(`Línea ${i + 1}: ${resultado.error}`);
    }
  }

  return { columnas, canon: canonCongelado, log };
}