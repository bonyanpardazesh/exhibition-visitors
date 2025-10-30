function attachLogout() {
	const btn = document.getElementById('logoutBtn');
	if (!btn) return;
	btn.addEventListener('click', async (e) => {
		e.preventDefault();
		await fetch('/api/logout', { method: 'POST' });
		location.href = '/login.html';
	});
}

attachLogout();


