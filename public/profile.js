let currentUser = null;

// Load user information
async function loadUserInfo() {
	try {
		const res = await fetch('/api/me');
		if (res.ok) {
			const user = await res.json();
			if (user && user.username) {
				currentUser = user;
				const usernameEl = document.getElementById('profileUsername');
				if (usernameEl) {
					usernameEl.textContent = user.username;
				}
				
			} else {
				// Not logged in, redirect to login
				location.href = '/login.html';
			}
		} else {
			location.href = '/login.html';
		}
	} catch (e) {
		console.error('Failed to load user info', e);
		location.href = '/login.html';
	}
}
// Initialize password change form handler
function initializePasswordChange() {
	const changePasswordForm = document.getElementById('changePasswordForm');
	const errorMessage = document.getElementById('errorMessage');
	const successMessage = document.getElementById('successMessage');
	
	if (!changePasswordForm || !errorMessage || !successMessage) {
		console.error('Profile form elements not found');
		return;
	}
	
	changePasswordForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		
		// Hide previous messages
		errorMessage.style.display = 'none';
		successMessage.style.display = 'none';
		
		const currentPassword = document.getElementById('currentPassword').value;
		const newPassword = document.getElementById('newPassword').value;
		const confirmPassword = document.getElementById('confirmPassword').value;
		
		// Validation
		if (!currentPassword || !newPassword || !confirmPassword) {
			errorMessage.style.display = 'block';
			if (window.t) {
				errorMessage.textContent = window.t('profile.allFieldsRequired');
			} else {
				errorMessage.textContent = 'All fields are required';
			}
			return;
		}
		
		if (newPassword !== confirmPassword) {
			errorMessage.style.display = 'block';
			if (window.t) {
				errorMessage.textContent = window.t('profile.passwordsDoNotMatch');
			} else {
				errorMessage.textContent = 'New passwords do not match';
			}
			return;
		}
		
		if (newPassword.length < 6) {
			errorMessage.style.display = 'block';
			if (window.t) {
				errorMessage.textContent = window.t('profile.passwordTooShort');
			} else {
				errorMessage.textContent = 'Password must be at least 6 characters long';
			}
			return;
		}
		
		// Send request
		try {
			const res = await fetch('/api/change-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					currentPassword,
					newPassword
				})
			});
			
			let data;
			try {
				data = await res.json();
			} catch (jsonError) {
				// Response is not JSON
				errorMessage.style.display = 'block';
				if (window.t) {
					errorMessage.textContent = window.t('profile.passwordChangeFailed');
				} else {
					errorMessage.textContent = 'Failed to change password';
				}
				return;
			}
			
			if (!res.ok) {
				errorMessage.style.display = 'block';
				if (window.t) {
					errorMessage.textContent = window.t(data.errorKey || 'profile.passwordChangeFailed') || data.error || 'Failed to change password';
				} else {
					errorMessage.textContent = data.error || 'Failed to change password';
				}
				return;
			}
			
			// Success
			successMessage.style.display = 'block';
			if (window.t) {
				successMessage.textContent = window.t('profile.passwordChangedSuccessfully');
			} else {
				successMessage.textContent = 'Password changed successfully';
			}
			
			// Clear form
			changePasswordForm.reset();
			
			// Hide success message after 3 seconds
			setTimeout(() => {
				successMessage.style.display = 'none';
			}, 3000);
			
		} catch (e) {
			console.error('Failed to change password', e);
			errorMessage.style.display = 'block';
			if (window.t) {
				errorMessage.textContent = window.t('profile.passwordChangeFailed');
			} else {
				errorMessage.textContent = 'Failed to change password';
			}
		}
	});
}


// Initialize when DOM is ready
function initialize() {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => {
			loadUserInfo();
			initializePasswordChange();
		});
	} else {
		loadUserInfo();
		initializePasswordChange();
	}
}

initialize();

