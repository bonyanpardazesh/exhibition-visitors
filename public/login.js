const form = document.getElementById('loginForm');
const username = document.getElementById('username');
const password = document.getElementById('password');
const error = document.getElementById('error');

form.onsubmit = async (e) => {
	e.preventDefault();
	const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username.value.trim(), password: password.value }) });
	if (!r.ok) {
		error.style.display = 'block';
		error.textContent = 'Invalid username or password';
		return;
	}
	location.href = '/';
};


