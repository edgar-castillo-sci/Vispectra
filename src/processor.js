// ============================================================
// PROCESSOR — Mathematical Operations (Phase 10)
// ============================================================

export function smoothGaussian(data, window = 5) {
  if (window < 3) return [...data];
  const sigma = window / 3.0;
  const halfWindow = Math.floor(window / 2);
  const kernel = [];
  let kernelSum = 0;
  for (let i = -halfWindow; i <= halfWindow; i++) {
    const weight = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel.push(weight); kernelSum += weight;
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= kernelSum;

  const result = new Array(data.length);
  for (let i = 0; i < data.length; i++) {
    let sum = 0;
    for (let j = -halfWindow; j <= halfWindow; j++) {
      const index = i + j;
      if (index >= 0 && index < data.length) {
        const val = Number(data[index]);
        if (Number.isFinite(val)) sum += val * kernel[j + halfWindow];
      }
    }
    result[i] = sum;
  }
  return result;
}

export function derivative(xData, yData) {
  const result = new Array(yData.length);
  for (let i = 0; i < yData.length; i++) {
    if (i === 0) result[i] = (yData[1] - yData[0]) / (xData[1] - xData[0]);
    else if (i === yData.length - 1) result[i] = (yData[i] - yData[i-1]) / (xData[i] - xData[i-1]);
    else result[i] = (yData[i+1] - yData[i-1]) / (xData[i+1] - xData[i-1]);
  }
  return result;
}

export function correctBaseline(xData, yData, startIndex, endIndex) {
  if (startIndex >= endIndex || startIndex < 0 || endIndex >= yData.length) return [...yData];

  const x1 = xData[startIndex], y1 = yData[startIndex];
  const x2 = xData[endIndex], y2 = yData[endIndex];

  // Pendiente (m) y ordenada al origen (b)
  const m = (y2 - y1) / (x2 - x1);
  const b = y1 - m * x1;

  // Restar la línea recta a cada punto
  return yData.map((y, i) => {
    const baselineY = m * xData[i] + b;
    return y - baselineY;
  });
}

export function normalizeMinMax(data) {
  const valid = data.map(Number).filter(Number.isFinite);
  if (valid.length === 0) return data;
  const min = Math.min(...valid), max = Math.max(...valid);
  if (max === min) return data.map(() => 0);
  return data.map(val => Number.isFinite(Number(val)) ? (Number(val) - min) / (max - min) : val);
}

export function normalizeMax(data) {
  const valid = data.map(Number).filter(Number.isFinite);
  if (valid.length === 0) return data;
  const max = Math.max(...valid);
  if (max === 0) return [...data];
  return data.map(val => Number.isFinite(Number(val)) ? Number(val) / max : val);
}
