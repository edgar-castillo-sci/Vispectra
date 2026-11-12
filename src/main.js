// ============================================================
// VISPECTRA — MAIN ORCHESTRATOR (v5.7)
// ============================================================

import { readFile } from './compiler/00_reading.js';
import { sample } from './compiler/01_sampling.js';
import { detectTrailingCommaPolicy } from './compiler/01b_trailing_comma.js';
import { lex } from './compiler/02_lexer.js';
import { buildIR } from './compiler/03_ir.js';
import { buildCanon } from './compiler/04_canon.js';
import { detectAmbiguities } from './compiler/04b_disambiguation.js';
import { buildBlockCanon } from './compiler/04c_block_canon.js';
import { fixCanon } from './compiler/05_fixation.js';
import { parseLine } from './compiler/06_parser.js';
import { verify } from './compiler/07_semantics.js';
import { createColumns, inject } from './compiler/08_codegen.js';
import { createLog } from './compiler/09_diagnostics.js';

const DEFAULT_MAX_FAILURE_RATIO = 0.20;

export async function compile(file, options = {}) {
  const {
    resolutions: userResolutions = undefined,
    maxFailureRatio = DEFAULT_MAX_FAILURE_RATIO,
  } = options;

  const log = createLog();
  const diagnostics = [];

  const collect = (diags, context = {}) => {
    for (const d of diags) {
      const merged = { ...d, params: { ...context, ...d.params } };
      log.add(merged);
      diagnostics.push(merged);
    }
  };

  // --- Phase 00 ---
  const { text, diagnostics: d00 } = await readFile(file);
  collect(d00, { phase: '00_reading', fileName: file.name });

  // --- Phase 01 ---
  const { lines: rawLines, centralBlock, sample: sampleIndices, diagnostics: d01 } = sample(text);
  collect(d01, { phase: '01_sampling', fileName: file.name });

  // --- Phase 01b: Trailing comma policy ---
  const { lines, policy: trailingPolicy, diagnostics: d01b } = detectTrailingCommaPolicy(rawLines, centralBlock);
  collect(d01b, { phase: '01b_trailing_comma', fileName: file.name });

  // --- Phases 02 + 03 ---
  const structures = sampleIndices.map((idx) => ({
    index: idx,
    structure: lex(lines[idx].content).structure,
  }));
  const ir = buildIR(structures);
  collect(ir.diagnostics, { phase: '03_ir', fileName: file.name });

  // --- Phase 04 ---
  const { canonLiteral, body, blocks, diagnostics: d04 } = buildCanon(ir, lines, centralBlock);
  collect(d04, { phase: '04_canon', fileName: file.name });

  if (body.end <= body.start) {
    return finalize({
      status: 'failed', columns: null, segments: [],
      ambiguities: null, body, canonLiteral, numColumns: null,
      failedRows: 0, totalRows: 0, log, diagnostics,
    });
  }

  // --- Phase 04b ---
  const {
    blocks: enrichedBlocks,
    hasAmbiguity,
    diagnostics: d04b,
  } = detectAmbiguities(blocks, lines);
  collect(d04b, { phase: '04b_disambiguation', fileName: file.name });

  // --- Resolve ambiguities ---
  let chosen = selectResolutions(enrichedBlocks, userResolutions, hasAmbiguity);

  if (chosen === 'NEEDS_DECISION') {
    const ambiguities = buildAmbiguitiesReport(enrichedBlocks, lines);

    if (ambiguities.blocks.length === 0) {
      chosen = new Map();
      for (const b of enrichedBlocks) chosen.set(b.pattern, defaultResolutionFor(b));
    } else {
      return finalize({
        status: 'needs_disambiguation', columns: null, segments: [],
        ambiguities,
        body, canonLiteral, numColumns: null,
        failedRows: 0, totalRows: body.end - body.start, log, diagnostics,
      });
    }
  }

  // --- Phases 04c + 05 (per block) ---
  const plans = [];
  let maxNumColumns = 0;

  for (const block of enrichedBlocks) {
    const resolution = chosen.get(block.pattern);
    const blockCanon = buildBlockCanon(block, lines, resolution);
    if (!blockCanon.canon) continue;
    const fixed = fixCanon(blockCanon, resolution, block.pattern);
    if (!fixed.plan) continue;
    if (fixed.plan.numColumns > maxNumColumns) maxNumColumns = fixed.plan.numColumns;
  }

  if (maxNumColumns === 0) {
    return finalize({
      status: 'failed', columns: null, segments: [],
      ambiguities: null, body, canonLiteral, numColumns: 0,
      failedRows: 0, totalRows: body.end - body.start, log, diagnostics,
    });
  }

  const numColumns = maxNumColumns;

  // R109: dominant block = most rows, tiebreak by column count.
  // Needed so a wide-but-short header does not steal dominance from the
  // real data block, and so equal-row-count blocks still pick the wider.
  let biggestBlock = null;
  let biggestBlockCols = 0;
  for (const block of enrichedBlocks) {
    const resolution = chosen.get(block.pattern);
    const blockCanon = buildBlockCanon(block, lines, resolution);
    if (!blockCanon.canon) continue;
    const fixed = fixCanon(blockCanon, resolution, block.pattern);
    if (!fixed.plan) continue;
    const cols = fixed.plan.numColumns;
    const rows = block.instances.length;
    if (!biggestBlock) {
      biggestBlock = block;
      biggestBlockCols = cols;
      continue;
    }
    const currentRows = biggestBlock.instances.length;
    if (rows > currentRows || (rows === currentRows && cols > biggestBlockCols)) {
      biggestBlock = block;
      biggestBlockCols = cols;
    }
  }

  const ignoreSmallerBlocks = (biggestBlockCols === maxNumColumns);

  for (const block of enrichedBlocks) {
    const resolution = chosen.get(block.pattern);
    const blockCanon = buildBlockCanon(block, lines, resolution);
    collect(blockCanon.diagnostics, { phase: '04c_block_canon', fileName: file.name, pattern: block.pattern });
    if (!blockCanon.canon) continue;
    const fixed = fixCanon(blockCanon, resolution, block.pattern);
    collect(fixed.diagnostics, { phase: '05_fixation', fileName: file.name, pattern: block.pattern });
    if (!fixed.plan) continue;
    if (ignoreSmallerBlocks && fixed.plan.numColumns < maxNumColumns) continue;
    plans.push({ block, plan: fixed.plan, resolution, canon: blockCanon.canon });
  }

  // --- Phases 06 + 07 + 08 ---
  const columns = createColumns(numColumns);
  const lineToPlan = new Map();
  for (const p of plans) {
    for (const idx of p.block.instances) lineToPlan.set(idx, p);
  }

  const segments = [];
  let currentSegment = null;
  let failedRows = 0;
  const totalRows = body.end - body.start;

  for (let i = body.start; i < body.end; i++) {
    const p = lineToPlan.get(i);
    if (!p) { pushNullRow(columns); continue; }

    const parsed = parseLine(lines[i], p.plan);
    collect(parsed.diagnostics, { phase: '06_parser', fileName: file.name, index: i });

    if (!parsed.ok) {
      failedRows++;
      pushNullRow(columns);
      collect([{ severity: 'info', code: 'ROW_SKIPPED', params: { index: i, reason: parsed.diagnostics[0]?.code ?? 'PARSE_FAILED' } }], { phase: 'main', fileName: file.name });
      continue;
    }

    const verified = verify(parsed, p.plan);
    collect(verified.diagnostics, { phase: '07_semantics', fileName: file.name, index: i });

    if (!verified.ok) {
      failedRows++;
      pushNullRow(columns);
      collect([{ severity: 'info', code: 'ROW_SKIPPED', params: { index: i, reason: verified.diagnostics[0]?.code ?? 'VERIFY_FAILED' } }], { phase: 'main', fileName: file.name });
      continue;
    }

    const finalValues = [...verified.values];
    while (finalValues.length < numColumns) finalValues.push(null);
    inject(finalValues, columns);

    if (!currentSegment || currentSegment.pattern !== p.block.pattern) {
      if (currentSegment) segments.push(currentSegment);
      currentSegment = {
        startRow: i, endRow: i + 1,
        pattern: p.block.pattern,
        resolution: [...p.resolution.commas],
        canon: p.canon, isException: false,
      };
    } else {
      currentSegment.endRow = i + 1;
    }
  }
  if (currentSegment) segments.push(currentSegment);
  markExceptions(segments);

  const failureRatio = totalRows > 0 ? failedRows / totalRows : 0;
  let status;
  if (failureRatio === 0) status = 'ok';
  else if (failureRatio <= maxFailureRatio) status = 'partial';
  else status = 'failed';

  return finalize({
    status,
    columns: status === 'failed' ? null : columns,
    segments,
    ambiguities: null,
    body, canonLiteral, numColumns,
    failedRows, totalRows, failureRatio,
    log, diagnostics,
  });
}

function finalize(partial) {
  return {
    status: partial.status,
    columns: partial.columns,
    segments: partial.segments ?? [],
    ambiguities: partial.ambiguities ?? null,
    body: partial.body,
    canonLiteral: partial.canonLiteral ?? '',
    numColumns: partial.numColumns ?? null,
    failedRows: partial.failedRows ?? 0,
    totalRows: partial.totalRows ?? 0,
    failureRatio: partial.failureRatio ?? 0,
    log: partial.log,
    diagnostics: partial.diagnostics,
  };
}

function pushNullRow(columns) {
  for (const col of columns) col.push(null);
}

function markExceptions(segments) {
  if (segments.length === 0) return;
  const dominant = segments.reduce((a, b) => b.endRow - b.startRow > a.endRow - a.startRow ? b : a);
  for (const seg of segments) seg.isException = seg !== dominant;
}

function countCommasInPattern(pattern) {
  let n = 0;
  for (const ch of pattern) if (ch === ',') n++;
  return n;
}

function defaultResolutionFor(block) {
  if (block.resolutions.length > 0) {
    const def = block.resolutions.find(r => r.isDefault);
    return def ?? block.resolutions[0];
  }
  return { commas: Array(countCommasInPattern(block.pattern)).fill('sep') };
}

function selectResolutions(blocks, input, hasAmbiguity) {
  if (input === 'auto') {
    const map = new Map();
    for (const b of blocks) map.set(b.pattern, defaultResolutionFor(b));
    return map;
  }

  if (input && typeof input === 'object') {
    const map = new Map();
    for (const b of blocks) {
      const userRes = input[b.pattern];
      if (userRes) {
        const match = b.resolutions.find(r => r.id === userRes || (Array.isArray(userRes) && JSON.stringify(r.commas) === JSON.stringify(userRes)));
        map.set(b.pattern, match ?? { commas: userRes });
      } else {
        map.set(b.pattern, defaultResolutionFor(b));
      }
    }
    return map;
  }

  if (hasAmbiguity) return 'NEEDS_DECISION';

  const map = new Map();
  for (const b of blocks) map.set(b.pattern, defaultResolutionFor(b));
  return map;
}

function buildAmbiguitiesReport(blocks, lines) {
  const totalRows = blocks.reduce((sum, b) => sum + b.instances.length, 0);
  const ambiguous = blocks.filter(b => b.isAmbiguous && b.resolutions.length > 0 && (b.instances.length / totalRows) > 0.05);

  return {
    blocks: ambiguous.map(b => {
      const exampleIndex = b.instances[0];
      const exampleText = lines && lines[exampleIndex] ? lines[exampleIndex].content : '';
      return { pattern: b.pattern, instances: b.instances.length, resolutions: b.resolutions, example: exampleText };
    }),
  };
}

// ------------------------------------------------------------
// Bootstrap
// ------------------------------------------------------------

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  const { initUI } = await import('./ui.js');
  const { drawPlot } = await import('./plot/index.js');
  const { translateDOM } = await import('./i18n.js');

  try { translateDOM(); } catch (err) { console.warn('i18n: translateDOM failed (non-fatal):', err); }

  try {
    initUI(
      async (archivo, options = {}) => await compile(archivo, options),
      (processedColumns, xIndex, yIndices) => {
        try { drawPlot(processedColumns, xIndex, yIndices); }
        catch (error) { console.error('Plot failed:', error); }
      }
    );
  } catch (err) {
    console.warn('UI bootstrap failed (non-fatal, compile() still works):', err);
  }
}
