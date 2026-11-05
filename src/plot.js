export function drawPlot(columns, xIndex = 0, yIndices = [1]) {
  const canvas = document.getElementById('spectrumCanvas');
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!columns || !columns[xIndex] || columns[xIndex].length === 0) return;
  if (!yIndices || yIndices.length === 0) return;

  const xData = columns[xIndex];
  const ySeries = yIndices.map(i => columns[i]).filter(col => col !== undefined);

  if (ySeries.length === 0) return;

  const minX = Math.min(...xData);
  const maxX = Math.max(...xData);

  let minY = Infinity;
  let maxY = -Infinity;
  for (const series of ySeries) {
    for (const val of series) {
      if (val < minY) minY = val;
      if (val > maxY) maxY = val;
    }
  }

  const margin = 50;
  const plotWidth = canvas.width - (margin * 2);
  const plotHeight = canvas.height - (margin * 2);

  const mapX = (x) => margin + ((x - minX) / (maxX - minX)) * plotWidth;
  const mapY = (y) => canvas.height - margin - ((y - minY) / (maxY - minY)) * plotHeight;

  const colors = ['#0066cc', '#cc0000', '#009933', '#ff9900', '#6600cc'];

  ySeries.forEach((yData, index) => {
    ctx.beginPath();
    ctx.strokeStyle = colors[index % colors.length];
    ctx.lineWidth = 1.5;

    for (let i = 0; i < xData.length; i++) {
      const px = mapX(xData[i]);
      const py = mapY(yData[i]);

      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  });

  // Ejes y etiquetas
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin, margin);
  ctx.lineTo(margin, canvas.height - margin);
  ctx.lineTo(canvas.width - margin, canvas.height - margin);
  ctx.stroke();

  ctx.fillStyle = '#333';
  ctx.font = '12px sans-serif';
  ctx.fillText(`X: ${minX.toFixed(1)}`, margin, canvas.height - margin + 20);
  ctx.fillText(`${maxX.toFixed(1)}`, canvas.width - margin - 30, canvas.height - margin + 20);
  ctx.fillText(`Y: ${maxY.toFixed(2)}`, 5, margin + 5);
  ctx.fillText(`${minY.toFixed(2)}`, 5, canvas.height - margin);
}
