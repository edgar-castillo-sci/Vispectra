export function smoothMovingAverage(data, window = 5) {
  if (window < 3) return [...data];
  const halfWindow = Math.floor(window / 2);
  const result = new Array(data.length);

  for (let i = 0; i < data.length; i++) {
    let sum = 0;
    let count = 0;

    for (let j = -halfWindow; j <= halfWindow; j++) {
      const index = i + j;
      if (index >= 0 && index < data.length) {
        const val = Number(data[index]); // Forzar a número
        if (Number.isFinite(val)) {
          sum += val;
          count++;
        }
      }
    }
    result[i] = count > 0 ? sum / count : data[i];
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
