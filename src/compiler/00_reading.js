// ============================================================
// PHASE 00 — READING
// ============================================================
// Function: readFile(file)
//
// Input: File object.
// Output: { text: string, diagnostics: [diag] }
//   - text: normalized content, no BOM, \n line breaks.
//   - diagnostics: BOM_DETECTED (info) if a BOM was detected.
//
// Does: reads and normalizes.
// Does NOT: split into lines, filter, interpret.
// ============================================================

const BOM_UTF8 = '\uFEFF';

export async function readFile(file) {
  const text = await file.text();
  return normalizeText(text);
}

function normalizeText(text) {
  const diagnostics = [];
  let normalizedText = text;

  if (normalizedText.startsWith(BOM_UTF8)) {
    normalizedText = normalizedText.slice(BOM_UTF8.length);
    diagnostics.push({
      severity: 'info',
      code: 'BOM_DETECTED',
      params: {},
    });
  }

  normalizedText = normalizedText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  return { text: normalizedText, diagnostics };
}
