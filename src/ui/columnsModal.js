// ============================================================
// UI — COLUMNS MODAL
// ============================================================
// Pregunta al usuario si desea colapsar columnas idénticas.
// Devuelve true (colapsar) o false (mantener todas).
// ============================================================

export function openColumnsModal(duplicatesCount, uniqueCount, totalCount) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'disambiguation-overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.5);' +
      'display:flex;align-items:center;justify-content:center;' +
      'z-index:1000;font-family:sans-serif;';

    const panel = document.createElement('div');
    panel.style.cssText =
      'background:#fff;color:#111;padding:1.5rem;border-radius:8px;' +
      'max-width:600px;width:90%;box-shadow:0 10px 40px rgba(0,0,0,0.3);';

    const title = document.createElement('h2');
    title.textContent = 'Duplicate columns detected';
    title.style.cssText = 'margin:0 0 0.75rem 0;font-size:1.1rem;';
    panel.appendChild(title);

    const intro = document.createElement('p');
    intro.innerHTML =
      `This file produced <b>${totalCount} columns</b>, but <b>${duplicatesCount} of them</b> are <b>exactly identical</b> to others.<br><br>` +
      `This usually happens in wide-format files where the X-axis is repeated for every Y-value.<br><br>` +
      `Would you like to collapse the duplicates (reducing to <b>${uniqueCount} columns</b>) and <b>auto-select all Y-values</b> for plotting?`;
    intro.style.cssText = 'margin:0 0 1rem 0;font-size:0.9rem;color:#444;line-height:1.4;';
    panel.appendChild(intro);

    const footer = document.createElement('div');
    footer.style.cssText = 'display:flex;justify-content:flex-end;gap:0.5rem;margin-top:1.5rem;';

    const keepBtn = document.createElement('button');
    keepBtn.textContent = 'Keep all columns';
    keepBtn.style.cssText =
      'padding:0.5rem 1rem;border:1px solid #ccc;background:#f8f8f8;' +
      'border-radius:4px;cursor:pointer;font-size:0.9rem;';
    keepBtn.onclick = () => {
      document.body.removeChild(overlay);
      resolve(false);
    };

    const collapseBtn = document.createElement('button');
    collapseBtn.textContent = 'Collapse & Select Y';
    collapseBtn.style.cssText =
      'padding:0.5rem 1rem;border:none;background:#0a7;color:#fff;' +
      'border-radius:4px;cursor:pointer;font-weight:600;font-size:0.9rem;';
    collapseBtn.onclick = () => {
      document.body.removeChild(overlay);
      resolve(true);
    };

    footer.appendChild(keepBtn);
    footer.appendChild(collapseBtn);
    panel.appendChild(footer);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
  });
}
