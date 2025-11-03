const loader = document.getElementById('loader');
const usersTable = document.getElementById('usersTable');
const usersList = document.getElementById('usersList');
const errorMessage = document.getElementById('errorMessage');
const roleModal = document.getElementById('roleModal');
const passwordModal = document.getElementById('passwordModal');
const addUserModal = document.getElementById('addUserModal');

// Check if user is admin
async function checkAdminAccess() {
	try {
		const res = await fetch('/api/me');
		if (res.ok) {
			const user = await res.json();
			if (!user || user.role !== 'admin') {
				location.href = '/';
				return false;
			}
			return true;
		} else {
			location.href = '/login.html';
			return false;
		}
	} catch (e) {
		location.href = '/login.html';
		return false;
	}
}

// Load users list
async function loadUsers() {
	try {
		const res = await fetch('/api/users');
		if (res.status === 401 || res.status === 403) {
			location.href = '/';
			return;
		}
		if (!res.ok) {
			throw new Error('Failed to load users');
		}
		const users = await res.json();
		renderUsers(users);
		loader.style.display = 'none';
		usersTable.style.display = 'block';
	} catch (e) {
		console.error('Failed to load users', e);
		errorMessage.style.display = 'block';
		if (window.t) {
			errorMessage.textContent = window.t('users.loadError') || 'Failed to load users';
		} else {
			errorMessage.textContent = 'Failed to load users';
		}
		loader.style.display = 'none';
	}
}

// Render users table
function renderUsers(users) {
	if (users.length === 0) {
		usersList.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: var(--space-8);" data-i18n="users.noUsers">No users found</td></tr>`;
		return;
	}

	usersList.innerHTML = users.map(user => {
		const createdDate = new Date(user.created_at).toLocaleDateString();
		const roleBadge = user.role === 'admin' 
			? `<span class="badge" style="background: var(--color-primary-soft); color: var(--color-primary);">${window.t ? window.t('users.roleAdmin') : 'Admin'}</span>`
			: `<span class="badge" style="background: var(--color-gray-200); color: var(--text-secondary);">${window.t ? window.t('users.roleUser') : 'User'}</span>`;
		const visitorCount = user.visitor_count || 0;
		const visitorCountBadge = `<span class="badge" style="background: var(--color-gray-100); color: var(--text-secondary); font-size: var(--font-size-xs); padding: var(--space-1) var(--space-2);">👥 ${visitorCount}</span>`;
		
		return `
			<tr>
				<td>
					<div style="display: flex; align-items: center; gap: var(--space-2);">
						${escapeHtml(user.username)}
						${visitorCountBadge}
					</div>
				</td>
				<td>${roleBadge}</td>
				<td>${createdDate}</td>
				<td>
					<div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
						<button class="btn btn-secondary" onclick="openRoleModal(${user.id}, '${escapeHtml(user.role)}')" style="font-size: var(--font-size-xs); padding: var(--space-2) var(--space-3);">
							<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink: 0;">
								<path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
							</svg>
							<span data-i18n="users.changeRole">Change Role</span>
						</button>
						<button class="btn btn-secondary" onclick="openPasswordModal(${user.id})" style="font-size: var(--font-size-xs); padding: var(--space-2) var(--space-3);">
							<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink: 0;">
								<path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
							</svg>
							<span data-i18n="users.setPassword">Set Password</span>
						</button>
					</div>
				</td>
			</tr>
		`;
	}).join('');
	
	// Translate elements
	if (window.translateElements) {
		window.translateElements(usersList);
	}
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

// Open role change modal
window.openRoleModal = function(userId, currentRole) {
	document.getElementById('roleUserId').value = userId;
	document.getElementById('roleSelect').value = currentRole;
	roleModal.style.display = 'flex';
	if (window.translateElements) {
		window.translateElements(roleModal);
	}
};

// Close role modal
document.getElementById('closeRoleModal').addEventListener('click', () => {
	roleModal.style.display = 'none';
});

document.getElementById('cancelRoleModal').addEventListener('click', () => {
	roleModal.style.display = 'none';
});

// Handle role form submission
document.getElementById('roleForm').addEventListener('submit', async (e) => {
	e.preventDefault();
	const userId = Number(document.getElementById('roleUserId').value);
	const role = document.getElementById('roleSelect').value;
	
	try {
		const res = await fetch(`/api/users/${userId}/role`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ role })
		});
		
		if (!res.ok) {
			const data = await res.json();
			alert(data.error || 'Failed to update role');
			return;
		}
		
		roleModal.style.display = 'none';
		await loadUsers();
	} catch (e) {
		console.error('Failed to update role', e);
		alert('Failed to update role');
	}
});

// Open password modal
window.openPasswordModal = function(userId) {
	document.getElementById('passwordUserId').value = userId;
	document.getElementById('passwordForm').reset();
	document.getElementById('passwordError').style.display = 'none';
	document.getElementById('passwordSuccess').style.display = 'none';
	passwordModal.style.display = 'flex';
	if (window.translateElements) {
		window.translateElements(passwordModal);
	}
};

// Close password modal
document.getElementById('closePasswordModal').addEventListener('click', () => {
	passwordModal.style.display = 'none';
});

document.getElementById('cancelPasswordModal').addEventListener('click', () => {
	passwordModal.style.display = 'none';
});

// Handle password form submission
document.getElementById('passwordForm').addEventListener('submit', async (e) => {
	e.preventDefault();
	const userId = Number(document.getElementById('passwordUserId').value);
	const password = document.getElementById('newPasswordInput').value;
	const confirmPassword = document.getElementById('confirmPasswordInput').value;
	const passwordError = document.getElementById('passwordError');
	const passwordSuccess = document.getElementById('passwordSuccess');
	
	// Hide previous messages
	passwordError.style.display = 'none';
	passwordSuccess.style.display = 'none';
	
	// Validation
	if (password.length < 6) {
		passwordError.style.display = 'block';
		if (window.t) {
			passwordError.textContent = window.t('users.passwordTooShort');
		} else {
			passwordError.textContent = 'Password must be at least 6 characters long';
		}
		return;
	}
	
	if (password !== confirmPassword) {
		passwordError.style.display = 'block';
		if (window.t) {
			passwordError.textContent = window.t('users.passwordsDoNotMatch');
		} else {
			passwordError.textContent = 'Passwords do not match';
		}
		return;
	}
	
	try {
		const res = await fetch(`/api/users/${userId}/password`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ password })
		});
		
		let data;
		try {
			data = await res.json();
		} catch (jsonError) {
			passwordError.style.display = 'block';
			if (window.t) {
				passwordError.textContent = window.t('users.passwordSetFailed');
			} else {
				passwordError.textContent = 'Failed to set password';
			}
			return;
		}
		
		if (!res.ok) {
			passwordError.style.display = 'block';
			passwordError.textContent = data.error || 'Failed to set password';
			return;
		}
		
		// Success
		passwordSuccess.style.display = 'block';
		if (window.t) {
			passwordSuccess.textContent = window.t('users.passwordSetSuccess');
		} else {
			passwordSuccess.textContent = 'Password set successfully';
		}
		
		// Clear form
		document.getElementById('passwordForm').reset();
		
		// Close modal after 2 seconds
		setTimeout(() => {
			passwordModal.style.display = 'none';
		}, 2000);
		
	} catch (e) {
		console.error('Failed to set password', e);
		passwordError.style.display = 'block';
		if (window.t) {
			passwordError.textContent = window.t('users.passwordSetFailed');
		} else {
			passwordError.textContent = 'Failed to set password';
		}
	}
});

// Open add user modal
document.getElementById('addUserBtn').addEventListener('click', () => {
	document.getElementById('addUserForm').reset();
	document.getElementById('addUserError').style.display = 'none';
	document.getElementById('addUserSuccess').style.display = 'none';
	document.getElementById('addUserRole').value = 'user';
	addUserModal.style.display = 'flex';
	if (window.translateElements) {
		window.translateElements(addUserModal);
	}
});

// Close add user modal
document.getElementById('closeAddUserModal').addEventListener('click', () => {
	addUserModal.style.display = 'none';
});

document.getElementById('cancelAddUserModal').addEventListener('click', () => {
	addUserModal.style.display = 'none';
});

// Handle add user form submission
document.getElementById('addUserForm').addEventListener('submit', async (e) => {
	e.preventDefault();
	const username = document.getElementById('addUserUsername').value.trim();
	const password = document.getElementById('addUserPassword').value;
	const confirmPassword = document.getElementById('addUserConfirmPassword').value;
	const role = document.getElementById('addUserRole').value;
	const addUserError = document.getElementById('addUserError');
	const addUserSuccess = document.getElementById('addUserSuccess');
	
	// Hide previous messages
	addUserError.style.display = 'none';
	addUserSuccess.style.display = 'none';
	
	// Validation
	if (!username) {
		addUserError.style.display = 'block';
		if (window.t) {
			addUserError.textContent = window.t('users.usernameRequired') || 'Username is required';
		} else {
			addUserError.textContent = 'Username is required';
		}
		return;
	}
	
	if (password.length < 6) {
		addUserError.style.display = 'block';
		if (window.t) {
			addUserError.textContent = window.t('users.passwordTooShort');
		} else {
			addUserError.textContent = 'Password must be at least 6 characters long';
		}
		return;
	}
	
	if (password !== confirmPassword) {
		addUserError.style.display = 'block';
		if (window.t) {
			addUserError.textContent = window.t('users.passwordsDoNotMatch');
		} else {
			addUserError.textContent = 'Passwords do not match';
		}
		return;
	}
	
	try {
		const res = await fetch('/api/users', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password, role })
		});
		
		let data;
		try {
			data = await res.json();
		} catch (jsonError) {
			addUserError.style.display = 'block';
			if (window.t) {
				addUserError.textContent = window.t('users.userCreateFailed');
			} else {
				addUserError.textContent = 'Failed to create user';
			}
			return;
		}
		
		if (!res.ok) {
			addUserError.style.display = 'block';
			addUserError.textContent = data.error || 'Failed to create user';
			return;
		}
		
		// Success
		addUserSuccess.style.display = 'block';
		if (window.t) {
			addUserSuccess.textContent = window.t('users.userCreatedSuccessfully');
		} else {
			addUserSuccess.textContent = 'User created successfully';
		}
		
		// Clear form
		document.getElementById('addUserForm').reset();
		
		// Reload users list
		await loadUsers();
		
		// Close modal after 2 seconds
		setTimeout(() => {
			addUserModal.style.display = 'none';
		}, 2000);
		
	} catch (e) {
		console.error('Failed to create user', e);
		addUserError.style.display = 'block';
		if (window.t) {
			addUserError.textContent = window.t('users.userCreateFailed');
		} else {
			addUserError.textContent = 'Failed to create user';
		}
	}
});

// Close modals when clicking outside
roleModal.addEventListener('click', (e) => {
	if (e.target === roleModal) {
		roleModal.style.display = 'none';
	}
});

passwordModal.addEventListener('click', (e) => {
	if (e.target === passwordModal) {
		passwordModal.style.display = 'none';
	}
});

addUserModal.addEventListener('click', (e) => {
	if (e.target === addUserModal) {
		addUserModal.style.display = 'none';
	}
});

// Initialize
async function initialize() {
	const isAdmin = await checkAdminAccess();
	if (isAdmin) {
		await loadUsers();
	}
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initialize);
} else {
	initialize();
}

