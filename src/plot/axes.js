// ============================================================
// PLOT — AXES GENERATOR
// ============================================================

function getNiceNumber(x) {
  const exp = Math.floor(Math.log10(x));
  const f = x / Math.pow(10, exp);
  let nf;
  if (f < 1.5) nf = 1;
  else if (f < 3) nf = 2;
  else if (f < 7) nf = 5;
  else nf = 10;
  return nf * Math.pow(10, exp);
}

export function generateTicks(min, max, config, isLog = false) {
  if (min === max) return { ticks: [min], minorTicks: [], decimals: 2 };

  let ticks = [];
  let minorTicks = [];
  const range = max - min;

  if (isLog) {
    const startExp = Math.floor(min);
    const endExp = Math.ceil(max);

    for (let i = startExp; i <= endExp; i++) {
      if (i >= min - 0.1 && i <= max + 0.1) ticks.push(i);
    }
    if (ticks.length === 0) ticks = [startExp, endExp];

    if (config.minor > 0) {
      for (let i = startExp; i < endExp; i++) {
        for (let j = 2; j <= 9; j++) {
          const val = i + Math.log10(j);
          if (val > min && val < max) minorTicks.push(val);
        }
      }
    }
    return { ticks, minorTicks, decimals: 2 };
  }

  if (config.mode === 'count') {
    const step = range / (config.count - 1);
    for (let i = 0; i < config.count; i++) ticks.push(min + step * i);
  } else if (config.mode === 'step' || config.mode === 'nice') {
    let step = config.step;
    if (config.mode === 'nice') step = getNiceNumber(step);
    const start = Math.ceil(min / step) * step;
    for (let val = start; val <= max + step * 0.1; val += step) {
      ticks.push(Number(val.toFixed(10)));
    }
  } else {
    const roughStep = range / 6;
    const step = getNiceNumber(roughStep);
    const start = Math.floor(min / step) * step;
    for (let val = start; val <= max + step * 0.1; val += step) {
      if (val >= min - step * 0.1) ticks.push(Number(val.toFixed(10)));
    }
  }

  if (ticks.length > 0) {
    if (ticks[0] > min + range * 0.01) ticks.unshift(min);
    if (ticks[ticks.length - 1] < max - range * 0.01) ticks.push(max);
  } else {
    ticks = [min, max];
  }

  if (config.minor > 0 && ticks.length > 1) {
    const step = ticks[1] - ticks[0];
    const minorStep = step / (config.minor + 1);
    for (let i = 0; i < ticks.length - 1; i++) {
      for (let j = 1; j <= config.minor; j++) {
        minorTicks.push(ticks[i] + minorStep * j);
      }
    }
  }

  let decimals = 0;
  const absMax = Math.max(Math.abs(min), Math.abs(max));
  if (absMax > 0 && (absMax < 0.01 || absMax >= 10000)) {
    decimals = 2;
  } else {
    const step = ticks.length > 1 ? ticks[1] - ticks[0] : range;
    decimals = Math.max(0, -Math.floor(Math.log10(Math.abs(step))) + 1);
  }
  if (decimals > 6) decimals = 6;

  return { ticks, minorTicks, decimals };
}

// ------------------------------------------------------------
// Backward-compat: string version (no superscripts)
// ------------------------------------------------------------
export function formatLabel(val, decimals, format, isLog) {
  const parts = formatLabelParts(val, decimals, format, isLog, false);
  return parts.pre + (parts.sup !== null ? `^${parts.sup}` : '');
}

// ------------------------------------------------------------
// Structured label: { pre, sup }. Renderer creates <tspan> for sup.
// ------------------------------------------------------------
export function formatLabelParts(val, decimals, format, isLog, useSuperExponent = true) {
  // Log scale: 'val' is the exponent (e.g. -2, -1, 0, 1, 2)
  if (format === 'auto' && isLog) {
    const exp = Math.round(val);
    if (!useSuperExponent) {
      if (exp === 0) return { pre: '1', sup: null };
      if (exp === 1) return { pre: '10', sup: null };
      return { pre: `10^${exp}`, sup: null };
    }
    if (exp === 0) return { pre: '1', sup: null };
    if (exp === 1) return { pre: '10', sup: null };
    return { pre: '10', sup: String(exp) };
  }

  // Linear: produce a base string first
  let str;
  if (format === 'fixed') str = val.toFixed(decimals);
  else if (format === 'scientific') str = val.toExponential(2);
  else if (Math.abs(val) > 0 && (Math.abs(val) < 0.01 || Math.abs(val) >= 10000)) {
    str = val.toExponential(2);
  } else {
    str = val.toFixed(decimals);
  }

  // Split scientific notation "1.5e-3" → { pre: "1.5×10", sup: "-3" }
  if (useSuperExponent) {
    const m = str.match(/^(-?\d+(?:\.\d+)?)[eE]([+-]?\d+)$/);
    if (m) {
      return { pre: `${m[1]}×10`, sup: m[2].replace(/^\+/, '') };
    }
  }

  return { pre: str, sup: null };
}
