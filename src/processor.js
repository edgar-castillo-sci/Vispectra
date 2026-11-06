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
    kernel.push(weight);
    kernelSum += weight;
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= kernelSum;

  const result = new Array(data.length);
  for (let i = 0; i < data.length; i++) {
    let sum = 0;
    for (let j = -halfWindow; j <= halfWindow; j++) {
      const index = i + j;
      if (index >= 0 && index < data.length) {
        const val = Number(data[index]);
        if (Number.isFinite(val)) {
          sum += val * kernel[j + halfWindow];
        }
      }
    }
    result[i] = sum;
  }
  return result;
}

export function derivative(xData, yData) {
  const result = new Array(yData.length);
  for (let i = 0; i < yData.length; i++) {
    if (i === 0) {
      const dx = xData[1] - xData[0];
      result[i] = (yData[1] - yData[0]) / dx;
    } else if (i === yData.length - 1) {
      const dx = xData[i] - xData[i-1];
      result[i] = (yData[i] - yData[i-1]) / dx;
    } else {
      const dx = xData[i+1] - xData[i-1];
      result[i] = (yData[i+1] - yData[i-1]) / dx;
    }
  }
  return result;
}

export function normalizeMinMax(data) {
  if (data.length === 0) return [];
  const validData = data.map(Number).filter(Number.isFinite);
  if (validData.length === 0) return data;
  const min = Math.min(...validData);
  const max = Math.max(...validData);
  if (max === min) return data.map(() => 0);
  return data.map(val => Number.isFinite(Number(val)) ? (Number(val) - min) / (max - min) : val);
}

export function normalizeMax(data) {
  if (data.length === 0) return [];
  const validData = data.map(Number).filter(Number.isFinite);
  if (validData.length === 0) return data;
  const max = Math.max(...validData);
  if (max === 0) return [...data];
  return data.map(val => Number.isFinite(Number(val)) ? Number(val) / max : val);
}
