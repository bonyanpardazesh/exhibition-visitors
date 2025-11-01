const form = document.getElementById('loginForm');
const username = document.getElementById('username');
const password = document.getElementById('password');
const error = document.getElementById('error');

form.onsubmit = async (e) => {
	e.preventDefault();
	const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username.value.trim(), password: password.value }) });
	if (!r.ok) {
		error.style.display = 'block';
		// Use translation if available, otherwise fallback to English
		if (window.t) {
			error.textContent = window.t('login.invalidCredentials');
		} else {
			error.textContent = 'Invalid username or password';
		}
		return;
	}
	location.href = '/';
};

// Initialize language switch on login page
function initializeLoginLanguageSwitch() {
	const langSwitch = document.getElementById('langSwitch');
	const switchLabel = document.getElementById('switchLabel');
	
	if (!langSwitch || !switchLabel) return;
	
	// Load saved language preference
	const savedLang = localStorage.getItem('lang') || 'en';
	const isPersian = savedLang === 'fa';
	
	// Set initial state
	langSwitch.checked = isPersian;
	switchLabel.textContent = isPersian ? 'فا' : 'EN';
	document.documentElement.setAttribute('dir', isPersian ? 'rtl' : 'ltr');
	document.documentElement.setAttribute('lang', savedLang);
	
	// Handle switch toggle
	langSwitch.addEventListener('change', (e) => {
		const isPersian = e.target.checked;
		const lang = isPersian ? 'fa' : 'en';
		
		// Update UI
		switchLabel.textContent = isPersian ? 'فا' : 'EN';
		document.documentElement.setAttribute('dir', isPersian ? 'rtl' : 'ltr');
		document.documentElement.setAttribute('lang', lang);
		localStorage.setItem('lang', lang);
		
		// Reload page to apply language changes
		location.reload();
	});
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initializeLoginLanguageSwitch);
} else {
	initializeLoginLanguageSwitch();
}


