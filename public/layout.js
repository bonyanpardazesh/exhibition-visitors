async function loadNavbar() {
	const host = document.getElementById('navbar');
	if (!host) return;
	try {

		const r = await fetch('/partials/navbar.html', { cache: 'no-cache' });
		const html = await r.text();
		host.innerHTML = html;
		// Translate navbar after it's loaded
		if (window.translateElements) {
			window.translateElements(host);
		}
		// attach logout behavior
		const logoutBtn = host.querySelector('#logoutBtn');
		if (logoutBtn) {
			logoutBtn.addEventListener('click', async (e) => {
				e.preventDefault();
				await fetch('/api/logout', { method: 'POST' });
				location.href = '/login.html';
			});
		}
		// show username if available
		try {
			const res = await fetch('/api/me');
			if (res.ok) {
				const me = await res.json();
				// expose current user globally and as a data attribute
				window.currentUser = me || null;
				if (me && me.username) {
					document.documentElement.setAttribute('data-username', me.username);
				} else {
					document.documentElement.removeAttribute('data-username');
				}
				// notify listeners that user info is ready
				document.dispatchEvent(new CustomEvent('auth:me', { detail: me || null }));
				const userEl = host.querySelector('#navbarUser');
				const userNameEl = host.querySelector('#navbarUserName');
				const usersBadge = host.querySelector('#navbarUsersBadge');
				const langSwitchContainer = host.querySelector('#langSwitchContainer');
				const usersTab = host.querySelector('#usersTab');
				if (userEl) {
					if (me && me.username) {
						if (userNameEl) userNameEl.textContent = me.username;
						userEl.style.display = 'inline-flex';
						userEl.title = me.username;
						// Username badge always links to profile
						userEl.href = '/profile.html';
						// Show language switch when user is logged in
						if (langSwitchContainer) langSwitchContainer.style.display = 'flex';
						// Show Users tab for admin users
						if (usersTab && me.role === 'admin') {
							usersTab.style.display = 'inline-flex';
						}
						// Show Users badge for admin users
						if (usersBadge && me.role === 'admin') {
							usersBadge.style.display = 'inline-flex';
							// Translate the badge
							if (window.translateElements) {
								window.translateElements(usersBadge);
							}
						}
					} else {
						userEl.style.display = 'none';
						if (langSwitchContainer) langSwitchContainer.style.display = 'none';
						if (usersTab) usersTab.style.display = 'none';
						if (usersBadge) usersBadge.style.display = 'none';
					}
				}
			}
		} catch {}
		// highlight active tab
		const tabs = host.querySelectorAll('[data-path]');
		tabs.forEach(a => {
			if (location.pathname === a.getAttribute('data-path')) a.classList.add('active');
		});
		
		// Initialize language switch
		initializeLanguageSwitch(host);
	} catch (e) {
		console.error('Failed to load navbar', e);
	}
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

// Listen for language changes
document.addEventListener('langChanged', () => {
	translateElements();
	// Also translate navbar if it exists
	const navbar = document.getElementById('navbar');
	if (navbar && window.translateElements) {
		window.translateElements(navbar);
	}
});

function initializeLanguageSwitch(host) {
	const langSwitch = host.querySelector('#langSwitch');
	const langSwitchLabel = host.querySelector('#langSwitchLabel');
	
	if (!langSwitch || !langSwitchLabel) return;
	
	// Load saved language preference
	const savedLang = localStorage.getItem('lang') || 'en';
	const isPersian = savedLang === 'fa';
	
	// Set initial state
	langSwitch.checked = isPersian;
	langSwitchLabel.textContent = isPersian ? 'فا' : 'EN';
	document.documentElement.setAttribute('dir', isPersian ? 'rtl' : 'ltr');
	document.documentElement.setAttribute('lang', savedLang);
	
	// Handle switch toggle
	langSwitch.addEventListener('change', (e) => {
		const isPersian = e.target.checked;
		const lang = isPersian ? 'fa' : 'en';
		
		// Update UI
		langSwitchLabel.textContent = isPersian ? 'فا' : 'EN';
		document.documentElement.setAttribute('dir', isPersian ? 'rtl' : 'ltr');
		document.documentElement.setAttribute('lang', lang);
		localStorage.setItem('lang', lang);
		
		// Reload page to apply language changes
		location.reload();
	});
}


loadNavbar();


