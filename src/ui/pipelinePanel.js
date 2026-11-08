import { t } from '../i18n.js';

export function agregarPasoPipeline(pipelineContainer, opData, onSelectionChange) {
  const step = document.createElement('div');
  step.className = 'pipeline-step';
  step.innerHTML =
    `<button class="btn-remove" title="Remove">×</button>` +
    `<select class="op-type">` +
    `<option value="none">${t('op_none')}</option>` +
    `<option value="smooth">${t('op_smooth')}</option>` +
    `<option value="derivative">${t('op_derivative')}</option>` +
    `<option value="baseline">${t('op_baseline')}</option>` +
    `<option value="minmax">${t('op_minmax')}</option>` +
    `<option value="max">${t('op_max')}</option>` +
    `</select>` +
    `<div class="op-params" style="display: none; margin-top: 0.5rem; font-size: 0.8rem;"></div>`;

  const select = step.querySelector('.op-type');
  const paramsDiv = step.querySelector('.op-params');
  const btnRemove = step.querySelector('.btn-remove');

  select.addEventListener('change', () => {
    actualizarParametros(select.value, paramsDiv, null, onSelectionChange);
    onSelectionChange();
  });
  btnRemove.addEventListener('click', () => {
    step.remove();
    onSelectionChange();
  });
  pipelineContainer.appendChild(step);

  if (opData) {
    select.value = opData.type;
    actualizarParametros(opData.type, paramsDiv, opData, onSelectionChange);
  }
}

function actualizarParametros(tipo, container, prevData, onSelectionChange) {
  container.innerHTML = '';
  container.style.display = 'block';

  if (tipo === 'smooth') {
    const win = prevData ? prevData.window : 5;
    container.innerHTML =
      `<label>${t('param_window')} <span class="win-val">${win}</span></label>` +
      `<input type="range" class="win-slider" min="3" max="21" step="2" value="${win}" style="width: 100%;">`;
    const slider = container.querySelector('.win-slider');
    const val = container.querySelector('.win-val');
    slider.addEventListener('input', (e) => {
      val.textContent = e.target.value;
      onSelectionChange();
    });
  } else if (tipo === 'baseline') {
    const startIdx = prevData ? prevData.start : 10;
    const endIdx = prevData ? prevData.end : 90;
    container.innerHTML =
      `<label>${t('param_start')} <input type="number" class="base-start" value="${startIdx}" style="width: 60px;"></label>` +
      `<label>${t('param_end')} <input type="number" class="base-end" value="${endIdx}" style="width: 60px;"></label>`;
    container.querySelector('.base-start').addEventListener('input', onSelectionChange);
    container.querySelector('.base-end').addEventListener('input', onSelectionChange);
  } else if (tipo === 'none') {
    container.style.display = 'none';
  }
}

export function getMathPipeline() {
  const steps = [];
  document.querySelectorAll('.pipeline-step').forEach((step) => {
    const type = step.querySelector('.op-type').value;
    if (type === 'none') return;
    const params = { type };
    if (type === 'smooth') {
      params.window = parseInt(step.querySelector('.win-slider').value);
    } else if (type === 'baseline') {
      params.start = parseInt(step.querySelector('.base-start').value);
      params.end = parseInt(step.querySelector('.base-end').value);
    }
    steps.push(params);
  });
  return steps;
}
