// ============================================================
// VISPECTRA — ORCHESTRATOR
// ============================================================
// Does not implement compiler logic. It only calls the phases
// in order and passes data between them.
// ============================================================
import { initUI } from './ui.js';
import { drawPlot } from './plot.js'; // <-- IMPORTANTE

import { readFile } from './compiler/00_reading.js';
import { sample } from './compiler/01_sampling.js';
import { lex } from './compiler/02_lexer.js';
import { buildIR } from './compiler/03_ir.js';
import { buildCanon } from './compiler/04_canon.js';
import { fixCanon, countColumns } from './compiler/05_fixation.js';
import { parseLine } from './compiler/06_parser.js';
import { verify } from './compiler/07_semantics.js';
import { createColumns, inject } from './compiler/08_codegen.js';
import { createLog } from './compiler/09_diagnostics.js';

function collect(diagnostics, log, context = {}) {
  for (const d of diagnostics) {
    log.add({ ...d, params: { ...d.params, ...context } });
  }
}

export async function compile(file) {
  const log = createLog();

  const { text, diagnostics: readDiag } = await readFile(file);
  collect(readDiag, log, { fileName: file.name });

  const { lines, centralBlock, sample: sampleIndices, diagnostics: samplingDiag } = sample(text);
  collect(samplingDiag, log, { fileName: file.name });

  const structures = [];
  for (const idx of sampleIndices) {
    const { structure, diagnostics } = lex(lines[idx].content);
    collect(diagnostics, log, { fileName: file.name, index: idx });
    structures.push({ index: idx, structure });
  }

  const { perLine, frequencies, lengths, diagnostics: irDiag } = buildIR(structures);
  collect(irDiag, log, { fileName: file.name });

  const { canon, body, diagnostics: canonDiag } = buildCanon({ perLine, frequencies, lengths }, lines, centralBlock);
  collect(canonDiag, log, { fileName: file.name });

  const { fixedCanon, diagnostics: fixationDiag } = fixCanon(canon);
  collect(fixationDiag, log, { fileName: file.name });

  const numColumn = countColumns(fixedCanon);
  const columns = createColumns(numColumn);

  for (let i = body.start; i < body.end; i++) {
    const parsed = parseLine(lines[i], fixedCanon);
    collect(parsed.diagnostics, log, { fileName: file.name, index: i });
    if (!parsed.ok) continue;

    const verified = verify(parsed, fixedCanon);
    collect(verified.diagnostics, log, { fileName: file.name, index: i });
    if (!verified.ok) continue;

    inject(verified.values, columns);
  }

  return { columns, fixedCanon, body, log };
}

// Inicializar la UI pasando las dos funciones
initUI(
  // Función de Procesar
  async (archivo, salida) => {
    salida.textContent = '';
    try {
      const { columns, fixedCanon, body, log } = await compile(archivo);

      salida.textContent += `✓ ${archivo.name}\n`;
      salida.textContent += `  columns: ${columns.length}\n`;
      salida.textContent += `  canon: ${fixedCanon.join('')}\n`;
      salida.textContent += `  body: [${body.start}, ${body.end}]\n`;

      const errors = log.bySeverity('error');
      const warnings = log.bySeverity('warn');

      if (errors.length > 0) salida.textContent += `  errors: ${errors.length}\n`;
      if (warnings.length > 0) salida.textContent += `  warnings: ${warnings.length}\n`;

      return { columns }; // Devolvemos las columnas a la UI
    } catch (err) {
      salida.textContent += `✗ ${archivo.name}: ${err.message}\n`;
      return null;
    }
  },
  // Función de Graficar
  (columns, xIndex, yIndices) => {
    drawPlot(columns, xIndex, yIndices);
  }
);
