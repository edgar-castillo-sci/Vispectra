// ============================================================
// UI — DISAMBIGUATION MODAL (v5.2)
// ============================================================
// Opens a modal asking the user to pick a resolution per ambiguous
// block. Returns a resolutions map compatible with
// main.js's compile(file, { resolutions }).
// ============================================================

export function openDisambiguationModal(ambiguities) {
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
      'max-width:800px;width:90%;max-height:85vh;overflow-y:auto;' +
      'box-shadow:0 10px 40px rgba(0,0,0,0.3);';

    const title = document.createElement('h2');
    title.textContent = 'Comma disambiguation required';
    title.style.cssText = 'margin:0 0 0.75rem 0;font-size:1.1rem;';
    panel.appendChild(title);

    const intro = document.createElement('p');
    intro.textContent =
      'This file has ambiguous comma sequences. Each block below can be ' +
      'read in more than one way. Pick one interpretation per block.';
    intro.style.cssText = 'margin:0 0 1rem 0;font-size:0.9rem;color:#444;';
    panel.appendChild(intro);

    const selects = {};

    for (const block of ambiguities.blocks) {
      const section = document.createElement('div');
      section.style.cssText =
        'border:1px solid #ddd;border-radius:6px;padding:0.75rem;' +
        'margin-bottom:0.75rem; background:#fafafa;';

      // Header: Pattern and row count
      const header = document.createElement('div');
      header.style.cssText =
        'font-weight:600;margin-bottom:0.4rem;font-size:0.9rem; color:#333;';

      const shortPattern = block.pattern.length > 30
        ? block.pattern.substring(0, 30) + '...'
        : block.pattern;

      header.textContent = `Pattern: ${shortPattern} (${block.instances} rows)`;
      section.appendChild(header);

      // Example preview (scrollable)
      if (block.example) {
        const exContainer = document.createElement('div');
        exContainer.style.cssText =
          'font-size:0.75rem;color:#555;margin-bottom:0.6rem;' +
          'font-family:monospace;background:#fff;border:1px solid #eee;' +
          'padding:4px 6px;border-radius:4px;overflow-x:auto;white-space:nowrap;';

        // Acortar el ejemplo si es demasiado largo
        const shortExample = block.example.length > 150
          ? block.example.substring(0, 150) + '...'
          : block.example;

        exContainer.textContent = `Example: ${shortExample}`;
        exContainer.title = block.example; // Tooltip para ver completo
        section.appendChild(exContainer);
      }

      // Selector
      const select = document.createElement('select');
      select.style.cssText =
        'width:100%;padding:0.4rem;font-size:0.9rem;border:1px solid #ccc;border-radius:4px;';
      selects[block.pattern] = select;

      for (const res of block.resolutions) {
        const opt = document.createElement('option');
        opt.value = res.id;

        // Mostrar una representación visual acortada de la resolución
        const parts = res.commas
          .map((c) => (c === 'dec' ? 'D' : 'S'))
          .slice(0, 10)
          .join('') + (res.commas.length > 10 ? '...' : '');

        const colCount = res.columns === -1 ? '?' : res.columns;

        opt.textContent =
          `${parts} → ${colCount} column(s)` +
          (res.isDefault ? ' (recommended)' : '');

        if (res.isDefault) opt.selected = true;
        select.appendChild(opt);
      }

      section.appendChild(select);
      panel.appendChild(section);
    }

    const footer = document.createElement('div');
    footer.style.cssText =
      'display:flex;justify-content:flex-end;gap:0.5rem;margin-top:1.5rem;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText =
      'padding:0.5rem 1rem;border:1px solid #ccc;background:#f8f8f8;' +
      'border-radius:4px;cursor:pointer;font-size:0.9rem;';
    cancelBtn.onclick = () => {
      document.body.removeChild(overlay);
      resolve(null);
    };

    const applyBtn = document.createElement('button');
    applyBtn.textContent = 'Apply';
    applyBtn.style.cssText =
      'padding:0.5rem 1rem;border:none;background:#0a7;color:#fff;' +
      'border-radius:4px;cursor:pointer;font-weight:600;font-size:0.9rem;';
    applyBtn.onclick = () => {
      const resolutions = {};
      for (const [pattern, select] of Object.entries(selects)) {
        const block = ambiguities.blocks.find((b) => b.pattern === pattern);
        const res = block.resolutions.find((r) => r.id === select.value);
        if (res) resolutions[pattern] = res.commas;
      }
      document.body.removeChild(overlay);
      resolve(resolutions);
    };

    footer.appendChild(cancelBtn);
    footer.appendChild(applyBtn);
    panel.appendChild(footer);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
  });
}
