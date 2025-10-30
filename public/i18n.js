let currentLang = localStorage.getItem('lang') || 'en';
let translations = {};

async function loadTranslations(lang) {
	try {
		const response = await fetch(`/i18n/${lang}.json`);
		translations = await response.json();
		currentLang = lang;
		localStorage.setItem('lang', lang);
		
		// Update document direction
		document.documentElement.setAttribute('dir', lang === 'fa' ? 'rtl' : 'ltr');
		document.documentElement.setAttribute('lang', lang);
		
		// Trigger translation update event
		document.dispatchEvent(new CustomEvent('langChanged', { detail: { lang, translations } }));
	} catch (error) {
		console.error('Failed to load translations:', error);
	}
}

function t(key) {
	const keys = key.split('.');
	let value = translations;
	for (const k of keys) {
		value = value?.[k];
	}
	return value || key;
}

function translateElements(container = document) {
	const elements = container.querySelectorAll('[data-i18n]');
	elements.forEach(el => {
		const key = el.getAttribute('data-i18n');
		if (window.t && key) {
			el.textContent = window.t(key);
		}
	});
}

// Initialize translations
loadTranslations(currentLang);
