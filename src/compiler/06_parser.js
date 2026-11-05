// ============================================================
// PHASE 06 — MASTER PARSER
// ============================================================
// Function: parseLine(line, fixedCanon)
//
// Input: {index, content}, [token]
// Output: { index, ok, values, diagnostics }
// ============================================================

export function parseLine(line, fixedCanon) {
  const { index, content } = line;
  const values = [];
  const diagnostics = [];
  let i = 0;

  for (let col = 0; col < fixedCanon.length; col++) {
    const type = fixedCanon[col];

    if (type === ',') {
      while (i < content.length && !/[0-9]/.test(content[i]) && content[i] !== '+' && content[i] !== '-') {
        i++;
      }
      continue;
    }

    if (i >= content.length) {
      values.push(null);
      continue;
    }

    if (/[0-9]/.test(content[i]) || content[i] === '+' || content[i] === '-') {
      let start = i;
      while (i < content.length) {
        // ¡AQUÍ TAMBIÉN ARREGLADO! \-
        if (/[0-9eE\+\-]/.test(content[i])) {
          i++;
        } else if (content[i] === '.' || content[i] === ',') {
          if (i + 1 < content.length && /[0-9]/.test(content[i + 1])) {
            i++;
          } else {
            break;
          }
        } else {
          break;
        }
      }
      const raw = content.slice(start, i);
      const normalized = raw.replace(',', '.');
      const val = parseFloat(normalized);
      values.push(isNaN(val) ? null : val);
    } else {
      values.push(null);
    }
  }

  return { index, ok: true, values, diagnostics };
}
