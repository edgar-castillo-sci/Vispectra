// ============================================================
// src/ui/aboutPanel.js
// ============================================================
// Header badges (ORCID, GitHub, Zenodo, AGPL) + "Cite" modal.
// Values come from src/citation.js (single source of truth,
// enforced by tests/citation.test.js).
// SVGs are inline to avoid external requests (zero telemetry).
// ============================================================

import { CITATION } from '../citation.js';
import { t } from '../i18n.js';

const SVG_BADGES = {
  orcid: `<svg viewBox="0 0 24 24" width="20" height="20" fill="#A6CE39" aria-hidden="true"><path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zM7.369 4.378c.525 0 .947.431.947.947s-.422.947-.947.947a.95.95 0 0 1-.947-.947c0-.525.422-.947.947-.947zm-.722 3.038h1.444v10.041H6.647V7.416zm3.562 0h3.9c3.712 0 5.344 2.653 5.344 5.025 0 2.578-2.016 5.025-5.325 5.025h-3.919V7.416zm1.444 1.303v7.444h2.297c3.272 0 4.022-2.484 4.022-3.722 0-2.016-1.284-3.722-4.097-3.722h-2.222z"/></svg>`,
  github: `<svg viewBox="0 0 24 24" width="20" height="20" fill="#181717" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`,
  zenodo: `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#1682D4"/><path d="M7 7h10l-10 10h10" stroke="#fff" stroke-width="2" stroke-linejoin="round" fill="none"/></svg>`,
  license: `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#555"/><text x="12" y="15" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="bold" font-size="6">AGPL</text></svg>`,
};

export function initAboutPanel() {
  const target = findHeaderTarget();
  const wrap = document.createElement('div');
  wrap.id = 'citationHeader';
  wrap.className = 'citation-header';

  // Badges primero
  wrap.appendChild(buildBadgesRow());

  // Mover el langSelector al wrap (lo saca de donde estaba y lo integra)
  const langSelector = document.getElementById('langSelector');
  if (langSelector) {
    langSelector.classList.add('lang-selector');
    wrap.appendChild(langSelector);
  }

  // Botón Cite al final
  wrap.appendChild(buildCiteButton());

  if (target) {
    target.appendChild(wrap);
  } else {
    wrap.style.cssText = 'position:fixed;top:12px;right:12px;z-index:1000;display:flex;gap:8px;align-items:center;';
    document.body.appendChild(wrap);
  }

  const dialog = buildModal();
  document.body.appendChild(dialog);

  document.getElementById('btnCite').addEventListener('click', () => openModal(dialog));
}

function findHeaderTarget() {
  const langSelector = document.getElementById('langSelector');
  if (langSelector && langSelector.parentElement) return langSelector.parentElement;
  return document.querySelector('header');
}

function buildBadgesRow() {
  const row = document.createElement('div');
  row.className = 'citation-badges';
  const items = [
    { key: 'orcid', href: `https://orcid.org/${CITATION.orcid}`, title: `ORCID: ${CITATION.orcid}` },
    { key: 'github', href: `https://github.com/${CITATION.github}`, title: `GitHub: ${CITATION.github}` },
    { key: 'zenodo', href: `https://doi.org/${CITATION.zenodoVersion}`, title: `DOI: ${CITATION.zenodoVersion}` },
    { key: 'license', href: 'https://www.gnu.org/licenses/agpl-3.0', title: CITATION.license },
  ];
  for (const { key, href, title } of items) {
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.title = title;
    a.className = `citation-badge citation-badge-${key}`;
    a.innerHTML = SVG_BADGES[key];
    row.appendChild(a);
  }
  return row;
}

function buildCiteButton() {
  const btn = document.createElement('button');
  btn.id = 'btnCite';
  btn.className = 'btn-cite';
  btn.type = 'button';
  btn.innerHTML = `<span aria-hidden="true">ⓘ</span> <span>${t('cite')}</span>`;
  btn.setAttribute('aria-label', t('cite_aria'));
  return btn;
}

function openModal(dialog) {
  dialog.querySelector('#citationModalBody').innerHTML = renderModalBody();
  wireCopyButtons(dialog);
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function closeDialog(dialog) {
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}

function buildModal() {
  const dialog = document.createElement('dialog');
  dialog.id = 'citationModal';
  dialog.className = 'citation-modal';
  dialog.innerHTML = `
    <div class="citation-modal-inner">
      <header class="citation-modal-header">
        <h2>${t('cite_modal_title')}</h2>
        <button type="button" class="citation-modal-close" aria-label="${t('close')}" data-action="close">×</button>
      </header>
      <div id="citationModalBody" class="citation-modal-body"></div>
    </div>
  `;
  dialog.querySelector('[data-action="close"]').addEventListener('click', () => closeDialog(dialog));
  dialog.addEventListener('click', (e) => { if (e.target === dialog) closeDialog(dialog); });
  return dialog;
}

function renderModalBody() {
  const apa = `Castillo, E. (${CITATION.year}). Vispectra: A compiler for spectroscopic file formats (Version ${CITATION.version}) [Computer software]. Zenodo. https://doi.org/${CITATION.zenodoVersion}`;
  const bibtex = `@software{castillo_vispectra_${CITATION.version.replace(/[^a-z0-9]/gi, '_')},
  author    = {Castillo, Edgar},
  title     = {{Vispectra: A compiler for spectroscopic file formats}},
  year      = {${CITATION.year}},
  version   = {${CITATION.version}},
  doi       = {${CITATION.zenodoVersion}},
  url       = {https://github.com/${CITATION.github}},
  publisher = {Zenodo}
}`;

  return `
    <div class="citation-modal-row">
      <span class="citation-modal-label">${t('cite_version')}</span>
      <span class="citation-modal-value">${CITATION.version}</span>
    </div>
    <div class="citation-modal-row">
      <span class="citation-modal-label">${t('cite_doi_version')}</span>
      <a class="citation-modal-value citation-modal-link" href="https://doi.org/${CITATION.zenodoVersion}" target="_blank" rel="noopener noreferrer">${CITATION.zenodoVersion}</a>
      <button type="button" class="citation-copy-btn" data-copy="${CITATION.zenodoVersion}">${t('copy')}</button>
    </div>
    <div class="citation-modal-row">
      <span class="citation-modal-label">${t('cite_doi_conceptual')}</span>
      <a class="citation-modal-value citation-modal-link" href="https://doi.org/${CITATION.zenodoConceptual}" target="_blank" rel="noopener noreferrer">${CITATION.zenodoConceptual}</a>
      <button type="button" class="citation-copy-btn" data-copy="${CITATION.zenodoConceptual}">${t('copy')}</button>
    </div>
    <div class="citation-modal-section">
      <div class="citation-modal-section-header">
        <h3>APA</h3>
        <button type="button" class="citation-copy-btn" data-copy="${escapeAttr(apa)}">${t('copy')}</button>
      </div>
      <pre class="citation-code">${escapeHtml(apa)}</pre>
    </div>
    <div class="citation-modal-section">
      <div class="citation-modal-section-header">
        <h3>BibTeX</h3>
        <button type="button" class="citation-copy-btn" data-copy="${escapeAttr(bibtex)}">${t('copy')}</button>
      </div>
      <pre class="citation-code">${escapeHtml(bibtex)}</pre>
    </div>
    <div class="citation-modal-footer">
      <a href="https://doi.org/${CITATION.zenodoVersion}" target="_blank" rel="noopener noreferrer">${t('cite_full_record')} →</a>
    </div>
  `;
}

function wireCopyButtons(root) {
  root.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = btn.getAttribute('data-copy');
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      const original = btn.textContent;
      btn.textContent = t('copied');
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('copied');
      }, 1500);
    });
  });
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
