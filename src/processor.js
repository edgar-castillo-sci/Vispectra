// ============================================================
// PROCESSOR — Mathematical Operations (Phase 10)
// ============================================================
// Todas las funciones son puras y preservan los null.
// Un null significa "sin dato", y no se debe tratar como 0.
// ============================================================

export function smoothGaussian(data, window = 5) {
  if (window < 3) return [...data];
  const sigma = window / 3.0;
  const halfWindow = Math.floor(window / 2);
  const kernel = [];
  let kernelSum = 0;

  for (let i = -halfWindow; i <= halfWindow; i++) {
    const weight = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel.push(weight);
    kernelSum += weight;
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= kernelSum;

  const result = new Array(data.length);
  for (let i = 0; i < data.length; i++) {
    // Si el punto central es null, el resultado es null
    if (data[i] === null || data[i] === undefined) {
      result[i] = null;
      continue;
    }

    let sum = 0;
    let weightSum = 0; // Para no diluir el valor si hay huecos cerca

    for (let j = -halfWindow; j <= halfWindow; j++) {
      const index = i + j;
      if (index >= 0 && index < data.length) {
        const val = data[index];
        if (val !== null && val !== undefined) {
          const weight = kernel[j + halfWindow];
          sum += val * weight;
          weightSum += weight;
        }
      }
    }

    // Si no hubo vecinos válidos, el resultado es null
    result[i] = weightSum > 0 ? (sum / weightSum) : null;
  }
  return result;
}

export function derivative(xData, yData) {
  const result = new Array(yData.length);

  for (let i = 0; i < yData.length; i++) {
    const y = yData[i];
    const x = xData[i];

    if (y === null || y === undefined || x === null || x === undefined) {
      result[i] = null;
      continue;
    }

    if (i === 0) {
      const yNext = yData[1];
      const xNext = xData[1];
      if (yNext === null || yNext === undefined) { result[i] = null; continue; }
      result[i] = (yNext - y) / (xNext - x);
    }
    else if (i === yData.length - 1) {
      const yPrev = yData[i-1];
      const xPrev = xData[i-1];
      if (yPrev === null || yPrev === undefined) { result[i] = null; continue; }
      result[i] = (y - yPrev) / (x - xPrev);
    }
    else {
      const yPrev = yData[i-1];
      const yNext = yData[i+1];
      const xPrev = xData[i-1];
      const xNext = xData[i+1];
      if (yPrev === null || yPrev === undefined || yNext === null || yNext === undefined) {
        result[i] = null;
        continue;
      }
      result[i] = (yNext - yPrev) / (xNext - xPrev);
    }
  }
  return result;
}

export function correctBaseline(xData, yData, startIndex, endIndex) {
  if (startIndex >= endIndex || startIndex < 0 || endIndex >= yData.length) return [...yData];

  const x1 = xData[startIndex], y1 = yData[startIndex];
  const x2 = xData[endIndex], y2 = yData[endIndex];

  // Si los puntos de anclaje son inválidos, no podemos corregir
  if (y1 === null || y1 === undefined || y2 === null || y2 === undefined || x1 === null || x2 === null) {
    return [...yData];
  }

  const m = (y2 - y1) / (x2 - x1);
  const b = y1 - m * x1;

  return yData.map((y, i) => {
    if (y === null || y === undefined) return null;
    if (xData[i] === null || xData[i] === undefined) return null;
    const baselineY = m * xData[i] + b;
    return y - baselineY;
  });
}

export function normalizeMinMax(data) {
  const valid = data.filter(v => v !== null && v !== undefined).map(Number).filter(Number.isFinite);
  if (valid.length === 0) return [...data];

  const min = Math.min(...valid), max = Math.max(...valid);
  if (max === min) return data.map(v => v === null || v === undefined ? null : 0);

  return data.map(val => {
    if (val === null || val === undefined) return null;
    const num = Number(val);
    return Number.isFinite(num) ? (num - min) / (max - min) : null;
  });
}

export function normalizeMax(data) {
  const valid = data.filter(v => v !== null && v !== undefined).map(Number).filter(Number.isFinite);
  if (valid.length === 0) return [...data];

  const max = Math.max(...valid);
  if (max === 0) return [...data];

  return data.map(val => {
    if (val === null || val === undefined) return null;
    const num = Number(val);
    return Number.isFinite(num) ? num / max : null;
  });
}
