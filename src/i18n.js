import en from '../locales/en.js';
import es from '../locales/es.js';

const locales = { en, es };
let currentLang = 'en'; // Inglés por defecto

export function setLanguage(lang) {
  if (locales[lang]) {
    currentLang = lang;
    translateDOM();
  }
}

export function getLanguage() {
  return currentLang;
}

export function t(key) {
  return locales[currentLang][key] || key;
}

export function translateDOM() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = t(key);
    if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
      el.placeholder = translation;
    } else {
      el.textContent = translation;
    }
  });
}
