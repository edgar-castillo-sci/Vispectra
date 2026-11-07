// ============================================================
// COMPILER — SHARED TOKENIZER
// ============================================================

export function tokenize(line) {
  const tokens = [];
  let i = 0;

  while (i < line.length) {
    if (isNumberStart(line, i)) {
      const start = i;
      const { end, hasDot } = consumeNumber(line, i);
      const raw = line.slice(start, end);
      const value = parseFloat(raw);
      tokens.push({
        type: 'number',
        raw,
        value: Number.isNaN(value) ? null : value,
        hasDot,
        start,
        end,
      });
      i = end;
      continue;
    }

    if (line[i] === ',') {
      tokens.push({ type: 'comma', start: i, end: i + 1 });
      i++;
      continue;
    }

    // Separador duro: espacios, punto y coma, tabs, etc.
    const start = i;
    while (i < line.length && !isNumberStart(line, i) && line[i] !== ',') {
      i++;
    }
    if (i === start) { i++; continue; }
    tokens.push({
      type: 'separator',
      raw: line.slice(start, i),
      start,
      end: i,
    });
  }

  return tokens;
}

function isNumberStart(line, i) {
  const ch = line[i];
  if (ch === undefined) return false;
  if (ch >= '0' && ch <= '9') return true;
  if (ch === '.' && isDigit(line[i + 1])) return true;
  if (ch === '+' || ch === '-') {
    if (isDigit(line[i + 1])) return true;
    if (line[i + 1] === '.' && isDigit(line[i + 2])) return true;
  }
  return false;
}

function isDigit(ch) {
  return ch !== undefined && ch >= '0' && ch <= '9';
}

function consumeNumber(line, i) {
  const start = i;
  let hasDot = false;
  let hasDigits = false;
  let hasExponent = false;

  if (line[i] === '+' || line[i] === '-') i++;

  while (i < line.length) {
    const ch = line[i];

    if (isDigit(ch)) {
      hasDigits = true;
      i++;
    } else if (ch === '.' && !hasDot && !hasExponent) {
      hasDot = true;
      i++;
    } else if ((ch === 'e' || ch === 'E') && hasDigits && !hasExponent) {
      const next = line[i + 1];
      const nextNext = line[i + 2];
      const validExponent =
        isDigit(next) || ((next === '+' || next === '-') && isDigit(nextNext));
      if (!validExponent) break;
      hasExponent = true;
      i++;
      if (line[i] === '+' || line[i] === '-') i++;
    } else {
      break;
    }
  }

  return { start, end: i, hasDot };
}
