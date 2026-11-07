import { lex } from './02_lexer.js';

export function buildBlockCanon(block, lines, resolution) {
  const diagnostics = [];
  const commaCount = countCommas(block.pattern);

  let commas;
  if (resolution && resolution.commas) {
    if (resolution.commas.length !== commaCount) {
      diagnostics.push({
        severity: 'error',
        code: 'RESOLUTION_LENGTH_MISMATCH',
        params: { pattern: block.pattern, expected: commaCount, got: resolution.commas.length },
      });
      return { canon: '', columns: [], diagnostics };
    }
    commas = resolution.commas;
  } else {
    commas = Array(commaCount).fill('sep');
  }

  const rowSlots = [];
  let successfulRows = 0;

  for (const lineIndex of block.instances) {
    const structure = lex(lines[lineIndex].content).structure;
    const slots = applyResolution(structure, commas);

    if (slots === null) {
      // Si la fila no encaja (ej. es cabecera de texto), la marcamos como nula
      rowSlots.push(null);
    } else {
      rowSlots.push(slots);
      successfulRows++;
    }
  }

  // Si más del 90% de las filas fallan, el bloque entero es basura (ej. cabecera)
  if (successfulRows === 0 || (block.instances.length > 0 && successfulRows / block.instances.length < 0.1)) {
    diagnostics.push({
      severity: 'info',
      code: 'BLOCK_IGNORED_AS_GARBAGE',
      params: { pattern: block.pattern, rows: block.instances.length },
    });
    return { canon: '', columns: [], diagnostics };
  }

  // Tomamos la primera fila exitosa para saber cuántas columnas tiene este bloque
  const sampleSlot = rowSlots.find(s => s !== null);
  const nCols = sampleSlot.length;

  const columns = [];
  for (let j = 0; j < nCols; j++) {
    const types = rowSlots.filter(s => s !== null).map(s => s[j]);
    const nonEmpty = types.filter(t => t !== 'v');
    const hasN = nonEmpty.includes('n');
    const hasZ = nonEmpty.includes('z');
    const filled = nonEmpty.length;
    const total = block.instances.length;
    const gapIndices = block.instances.filter((_, idx) => rowSlots[idx] === null || rowSlots[idx][j] === 'v');

    let type;
    if (nonEmpty.length === 0) type = 'v';
    else if (hasN && hasZ) type = 'i';
    else if (hasN) type = 'n';
    else type = 'z';

    columns.push({ type, completeness: { filled, total, gapIndices } });
  }

  const canon = columns.map(c => c.type).join(',');
  return { canon, columns, diagnostics };
}

function countCommas(pattern) {
  let n = 0;
  for (const ch of pattern) if (ch === ',') n++;
  return n;
}

function applyResolution(structure, commas) {
  const slots = [];
  let i = 0;
  let commaIdx = 0;
  let pending = null;

  while (i < structure.length) {
    const ch = structure[i];

    if (ch === 'n') {
      if (pending !== null) return null;
      pending = 'n';
      i++;
    } else if (ch === 'z') {
      if (pending !== null) return null;
      pending = 'z';
      i++;
    } else if (ch === '|') {
      slots.push(pending === null ? 'v' : pending);
      pending = null;
      i++;
    } else if (ch === ',') {
      if (commaIdx >= commas.length) return null;
      const dec = commas[commaIdx++];
      if (dec === 'sep') {
        slots.push(pending === null ? 'v' : pending);
        pending = null;
        i++;
      } else {
        if (pending === 'n') return null;
        if (i + 1 >= structure.length) return null;

        const nextCh = structure[i + 1];
        if (nextCh === 'z' || nextCh === 'n') {
          pending = 'n';
          i += 2;
        } else {
          return null;
        }
      }
    } else {
      return null;
    }
  }

  if (pending !== null) slots.push(pending);
  return slots;
}
