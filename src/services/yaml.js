// ============================================================
// YAML — Minimal parser + stringifier (Vanilla JS)
// ============================================================
// Supports: scalars, nested objects, arrays of scalars/objects,
// single-line strings, numbers, booleans, null, comments (#).
// Does NOT support: anchors, aliases, multi-doc, tags, block
// scalars, flow style ({...}, [...]).
// ============================================================

export function parseYAML(text) {
  const lines = [];
  text.split('\n').forEach((raw, i) => {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const indent = raw.length - raw.trimStart().length;
    lines.push({ content: trimmed, indent, num: i + 1 });
  });

  let pos = 0;

  function parseBlock(indent) {
    if (pos >= lines.length) return null;
    const first = lines[pos];
    if (first.indent < indent) return null;
    if (first.content.startsWith('-')) return parseArray(first.indent);
    return parseObject(first.indent);
  }

  function parseArray(indent) {
    const arr = [];
    while (pos < lines.length && lines[pos].indent === indent && lines[pos].content.startsWith('-')) {
      const line = lines[pos];
      let rest = line.content.slice(1).trim();
      pos++;

      if (rest === '') {
        if (pos < lines.length && lines[pos].indent > indent) {
          arr.push(parseBlock(lines[pos].indent));
        } else {
          arr.push(null);
        }
      } else if (/^[^:]+:\s/.test(rest) || /^[^:]+:$/.test(rest)) {
        // Inline object start
        const obj = {};
        const colonIdx = rest.indexOf(':');
        const key = rest.slice(0, colonIdx).trim().replace(/^"|"$/g, '');
        const val = rest.slice(colonIdx + 1).trim();

        if (val === '') {
          obj[key] = (pos < lines.length && lines[pos].indent > indent)
            ? parseBlock(lines[pos].indent)
            : null;
        } else {
          obj[key] = parseScalar(val);
        }

        // Additional keys on following lines (deeper indent)
        while (pos < lines.length && lines[pos].indent > indent) {
          const next = lines[pos];
          const nc = next.content.indexOf(':');
          if (nc === -1) break;
          const nkey = next.content.slice(0, nc).trim().replace(/^"|"$/g, '');
          const nval = next.content.slice(nc + 1).trim();
          pos++;
          if (nval === '') {
            obj[nkey] = (pos < lines.length && lines[pos].indent > next.indent)
              ? parseBlock(lines[pos].indent)
              : null;
          } else {
            obj[nkey] = parseScalar(nval);
          }
        }
        arr.push(obj);
      } else {
        arr.push(parseScalar(rest));
      }
    }
    return arr;
  }

  function parseObject(indent) {
    const obj = {};
    while (pos < lines.length && lines[pos].indent === indent) {
      const line = lines[pos];
      if (line.content.startsWith('-')) break;

      const colonIdx = line.content.indexOf(':');
      if (colonIdx === -1) throw new Error(`Line ${line.num}: expected 'key: value'`);

      const key = line.content.slice(0, colonIdx).trim().replace(/^"|"$/g, '');
      const val = line.content.slice(colonIdx + 1).trim();
      pos++;

      if (val === '') {
        if (pos < lines.length && lines[pos].indent > indent) {
          obj[key] = parseBlock(lines[pos].indent);
        } else {
          obj[key] = null;
        }
      } else {
        obj[key] = parseScalar(val);
      }
    }
    return obj;
  }

  if (lines.length === 0) return {};
  return parseBlock(lines[0].indent);
}

function parseScalar(str) {
  if (str === 'null' || str === '~') return null;
  if (str === 'true') return true;
  if (str === 'false') return false;
  if (/^-?\d+$/.test(str)) return parseInt(str, 10);
  if (/^-?\d*\.\d+([eE][+-]?\d+)?$/.test(str)) return parseFloat(str);
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1);
  }
  return str;
}

// ------------------------------------------------------------
// Stringify
// ------------------------------------------------------------
export function stringifyYAML(obj, indent = 0) {
  const pad = '  '.repeat(indent);
  const lines = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      lines.push(`${pad}${key}: null`);
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${pad}${key}: []`);
      } else {
        lines.push(`${pad}${key}:`);
        for (const item of value) {
          if (item !== null && typeof item === 'object') {
            const sub = stringifyYAML(item, indent + 2).split('\n');
            lines.push(`${pad}  - ${sub[0].trimStart()}`);
            for (let i = 1; i < sub.length; i++) lines.push(sub[i]);
          } else {
            lines.push(`${pad}  - ${formatScalar(item)}`);
          }
        }
      }
    } else if (typeof value === 'object') {
      const sub = stringifyYAML(value, indent + 1);
      if (sub === '') {
        lines.push(`${pad}${key}: {}`);
      } else {
        lines.push(`${pad}${key}:`);
        lines.push(sub);
      }
    } else {
      lines.push(`${pad}${key}: ${formatScalar(value)}`);
    }
  }

  return lines.join('\n');
}

function formatScalar(value) {
  if (typeof value === 'string') {
    if (/^[\d.+-]/.test(value) || value === 'true' || value === 'false' ||
        value === 'null' || value === '' || /[:#\n]/.test(value)) {
      return JSON.stringify(value);
    }
    return value;
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return isFinite(value) ? String(value) : 'null';
  if (value === null || value === undefined) return 'null';
  return JSON.stringify(value);
}
