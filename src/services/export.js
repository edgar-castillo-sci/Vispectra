import { t } from '../i18n.js';
import { applyPipeline } from './pipeline.js';

export function exportarCSV(columnasGlobales, xIndex, yIndices, pipeline, procesar) {
  if (!columnasGlobales) return;
  if (yIndices.length === 0) return alert(t('alert_select_y'));

  let finalColumns = columnasGlobales;
  if (procesar) {
    finalColumns = applyPipeline(columnasGlobales, xIndex, yIndices, pipeline);
  }

  const xData = finalColumns[xIndex];
  const ySeries = yIndices.map((i) => finalColumns[i]);

  let csvContent = '';
  const headers = [`${t('col_prefix')}_${xIndex}`];
  yIndices.forEach((idx) => headers.push(`${t('col_prefix')}_${idx}`));
  csvContent += headers.join(',') + '\n';

  for (let i = 0; i < xData.length; i++) {
    const row = [xData[i]];
    ySeries.forEach((yData) => row.push(yData[i] !== null && yData[i] !== undefined ? yData[i] : ''));
    csvContent += row.join(',') + '\n';
  }
  descargarArchivo(csvContent, 'text/csv;charset=utf-8;', 'csv');
}

export function exportarPlot(svg, format) {
  if (!svg || !svg.innerHTML) return;
  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(svg);
  if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
    svgString = svgString.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  }

  if (format === 'svg') descargarArchivo(svgString, 'image/svg+xml', 'svg');
  else if (format === 'png' || format === 'jpeg') exportarRaster(svgString, format);
  else if (format === 'pdf') exportarPDF(svg);
}

function descargarArchivo(content, mimeType, extension) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vispectra_${extension === 'csv' ? 'data' : 'plot'}_${Date.now()}.${extension}`;
  document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
}

function exportarRaster(svgString, format) {
  const img = new Image();
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  img.onload = () => {
    const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 1000;
    const ctx = canvas.getContext('2d');
    if (format === 'jpeg') { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const link = document.createElement('a'); link.href = canvas.toDataURL(mime, 0.95);
    link.download = `vispectra_plot_${Date.now()}.${format}`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  };
  img.src = url;
}

async function exportarPDF(svg) {
  if (!window.jspdf || !window.svg2pdf) return alert('PDF libs loading...');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('landscape', 'px', [800, 500]);
  await doc.svg(svg, { x: 0, y: 0, width: 800, height: 500 });
  doc.save(`vispectra_plot_${Date.now()}.pdf`);
}
