// ============================================================
// UI — COLUMNS MODAL
// ============================================================
// Asks the user whether to collapse identical columns.
// Returns true (collapse) or false (keep all).
// All strings come from i18n via t(); placeholders {total}, {dups},
// {unique} are interpolated at runtime.
// ============================================================

import { t } from '../i18n.js';

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
    title.textContent = t('cols_modal_title');
    title.style.cssText = 'margin:0 0 0.75rem 0;font-size:1.1rem;';
    panel.appendChild(title);

    const intro = document.createElement('p');
    intro.innerHTML = t('cols_modal_intro')
      .replace('{total}', String(totalCount))
      .replace('{dups}', String(duplicatesCount))
      .replace('{unique}', String(uniqueCount));
    intro.style.cssText = 'margin:0 0 1rem 0;font-size:0.9rem;color:#444;line-height:1.4;';
    panel.appendChild(intro);

    const footer = document.createElement('div');
    footer.style.cssText = 'display:flex;justify-content:flex-end;gap:0.5rem;margin-top:1.5rem;';

    const keepBtn = document.createElement('button');
    keepBtn.textContent = t('cols_modal_keep');
    keepBtn.style.cssText =
      'padding:0.5rem 1rem;border:1px solid #ccc;background:#f8f8f8;color:#333;' +
      'border-radius:4px;cursor:pointer;font-size:0.9rem;';
    keepBtn.onclick = () => {
      document.body.removeChild(overlay);
      resolve(false);
    };

    const collapseBtn = document.createElement('button');
    collapseBtn.textContent = t('cols_modal_collapse');
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
