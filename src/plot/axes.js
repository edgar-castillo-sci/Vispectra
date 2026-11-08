export function getNiceTicks(min, max, targetCount = 6) {
  const range = max - min;
  if (range === 0) return { ticks: [min], decimals: 1 };

  const roughStep = range / targetCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const residual = roughStep / magnitude;

  let niceResidual;
  if (residual < 1.5) niceResidual = 1;
  else if (residual < 3) niceResidual = 2;
  else if (residual < 7) niceResidual = 5;
  else niceResidual = 10;

  const step = niceResidual * magnitude;
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;

  const ticks = [];
  for (let val = niceMin; val <= niceMax + step * 0.5; val += step) {
    ticks.push(Number(val.toFixed(10)));
  }

  let decimals = Math.max(0, -Math.floor(Math.log10(step)));
  if (decimals > 6) decimals = 6;

  return { ticks, decimals };
}
