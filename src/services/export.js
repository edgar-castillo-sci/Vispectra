import { state } from '../plot/state.js';
import { t } from '../i18n.js';
import { applyPipeline } from './pipeline.js';

// ============================================================
// PLOT EXPORT (SVG / PNG / JPEG / PDF)
// ============================================================

export function exportarPlot(svg, format) {
  if (!svg || !svg.innerHTML) return;

  const frame = state.frame || { width: 800, height: 500 };
  const { width, height } = frame;

  // 1. Serializar el SVG
  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(svg);

  // 2. Garantizar xmlns
  if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
    svgString = svgString.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  }

  // 3. Forzar width/height explícitos y eliminar style/width/height viejos
  //    Esto evita que el navegador "estire" el texto al cargarlo como <img>
  svgString = svgString.replace(/<svg([^>]*)>/, (match, attrs) => {
    const clean = attrs
      .replace(/\s+width="[^"]*"/g, '')
      .replace(/\s+height="[^"]*"/g, '')
      .replace(/\s+style="[^"]*"/g, '');
    return `<svg${clean} width="${width}" height="${height}" style="display:block;">`;
  });

  if (format === 'svg') {
    descargarArchivo(svgString, 'image/svg+xml;charset=utf-8', 'svg');
  } else if (format === 'png' || format === 'jpeg') {
    exportarRaster(svgString, format, width, height);
  } else if (format === 'pdf') {
    exportarPDF(svg, width, height);
  }
}

// ------------------------------------------------------------
// PNG / JPEG — Renderiza a canvas a 3x para alta resolución
// ------------------------------------------------------------
function exportarRaster(svgString, format, width, height) {
  const SCALE = 3;
  const img = new Image();
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width * SCALE;
    canvas.height = height * SCALE;
    const ctx = canvas.getContext('2d');

    if (format === 'jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // El SVG tiene width/height explícitos, así que el navegador lo
    // rasteriza nativamente a este tamaño (no hay upscaling)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const link = document.createElement('a');
    link.href = canvas.toDataURL(mime, 0.95);
    link.download = `vispectra_plot_${Date.now()}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  img.onerror = (err) => {
    console.error('SVG → Canvas failed:', err);
    URL.revokeObjectURL(url);
  };

  img.src = url;
}

// ------------------------------------------------------------
// PDF — Usa svg2pdf con dimensiones exactas del frame
// ------------------------------------------------------------
async function exportarPDF(svg, width, height) {
  if (!window.jspdf || !window.svg2pdf) return alert('PDF libs loading...');
  const { jsPDF } = window.jspdf;

  const orientation = width >= height ? 'landscape' : 'portrait';
  const doc = new jsPDF({
    orientation,
    unit: 'px',
    format: [width, height],
    hotfixes: ['px_scaling']
  });

  await doc.svg(svg, { x: 0, y: 0, width, height });
  doc.save(`vispectra_plot_${Date.now()}.pdf`);
}

// ------------------------------------------------------------
// Descarga genérica
// ------------------------------------------------------------
function descargarArchivo(content, mimeType, extension) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vispectra_${extension === 'csv' ? 'data' : 'plot'}_${Date.now()}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================
// CSV EXPORT (sin cambios)
// ============================================================

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
