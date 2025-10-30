const qs = new URLSearchParams(location.search);
const visitorId = qs.get('id');

// Validation helpers
function validateName(value) {
	const trimmed = value.trim();
	return trimmed.length >= 2 && trimmed.length <= 100;
}

function validateEmail(value) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validatePhone(value) {
	const digits = String(value).replace(/[^\d]/g, '');
	return digits.length >= 7 && digits.length <= 15;
}

function validateWebsite(value) {
	try {
		new URL(value.startsWith('http') ? value : 'https://' + value);
		return true;
	} catch {
		return false;
	}
}

function showValidation(input, isValid, message) {
	input.classList.remove('input-valid', 'input-invalid');
	if (isValid) {
		input.classList.add('input-valid');
	} else if (input.value.trim()) {
		input.classList.add('input-invalid');
	}
	
	let msgEl = input.parentNode.querySelector('.validation-message');
	if (!msgEl) {
		msgEl = document.createElement('div');
		msgEl.className = 'validation-message';
		input.parentNode.appendChild(msgEl);
	}
	
	if (message) {
		msgEl.textContent = message;
		msgEl.className = `validation-message ${isValid ? 'validation-success' : 'validation-error'}`;
	} else {
		msgEl.textContent = '';
		msgEl.className = 'validation-message';
	}
}

const dom = {
	form: document.getElementById('visitorForm'),
	id: document.getElementById('visitorId'),
	firstName: document.getElementById('firstName'),
	lastName: document.getElementById('lastName'),
	academicDegree: document.getElementById('academicDegree'),
	jobPosition: document.getElementById('jobPosition'),
	note: document.getElementById('note'),
	contacts: document.getElementById('contacts'),
	addContactBtn: document.getElementById('addContactBtn'),
	photoInput: document.getElementById('photoInput'),
	photoPreview: document.getElementById('photoPreview'),
	vrStart: document.getElementById('vrStart'),
	vrStop: document.getElementById('vrStop'),
	vrPlay: document.getElementById('vrPlay'),
	//vrSave: document.getElementById('vrSave'),
	vrAudio: document.getElementById('vrAudio'),
	vrStatus: document.getElementById('vrStatus'),
	// Progress elements
	vrProgress: document.getElementById('vrProgress'),
	vrProgressWrap: document.getElementById('vrProgressWrap'),
	vrTime: document.getElementById('vrTime'),
	voiceList: document.getElementById('voiceList')
};


// Add real-time validation to name fields
dom.firstName.addEventListener('input', (e) => {
	const isValid = validateName(e.target.value);
	showValidation(e.target, isValid, isValid ? '✓ Valid name' : 'Name must be 2-100 characters');
});

dom.lastName.addEventListener('input', (e) => {
	const isValid = validateName(e.target.value);
	showValidation(e.target, isValid, isValid ? '✓ Valid name' : 'Name must be 2-100 characters');
});

function contactRow(data = { type: 'email', value: '', label: '' }) {
	const div = document.createElement('div');
	div.className = 'contact-row';
	div.innerHTML = `
		<select class="c-type">
			<option value="email" ${data.type==='email'?'selected':''}>Email</option>
			<option value="phone" ${data.type==='phone'?'selected':''}>Phone</option>
			<option value="address" ${data.type==='address'?'selected':''}>Address</option>
			<option value="website" ${data.type==='website'?'selected':''}>Website</option>
		</select>
		<input class="c-value" placeholder="Value" value="${data.value||''}" />
		<input class="c-label" placeholder="Label (optional)" value="${data.label||''}" />
		<button type="button" class="btn btn-remove remove"><span class="btn-icon">❌</span></button>
	`;
	
	// Add real-time validation to contact value input
	const valueInput = div.querySelector('.c-value');
	const typeSelect = div.querySelector('.c-type');
	
	function validateContact() {
		const type = typeSelect.value;
		const value = valueInput.value.trim();
		
		if (!value) {
			showValidation(valueInput, true, '');
			return;
		}
		
		let isValid = false;
		let message = '';
		
		switch (type) {
			case 'email':
				isValid = validateEmail(value);
				message = isValid ? '✓ Valid email' : 'Invalid email format';
				break;
			case 'phone':
				isValid = validatePhone(value);
				message = isValid ? '✓ Valid phone' : 'Phone must be 7-15 digits';
				break;
			case 'website':
				isValid = validateWebsite(value);
				message = isValid ? '✓ Valid website' : 'Invalid website URL';
				break;
			case 'address':
				isValid = value.length >= 5 && value.length <= 255;
				message = isValid ? '✓ Valid address' : 'Address must be 5-255 characters';
				break;
		}
		
		showValidation(valueInput, isValid, message);
	}
	
	valueInput.addEventListener('input', validateContact);
	typeSelect.addEventListener('change', validateContact);
	
	div.querySelector('.remove').onclick = () => div.remove();
	return div;
}

function getContacts() {
	return Array.from(dom.contacts.querySelectorAll('.contact-row')).map(r => ({
		type: r.querySelector('.c-type').value,
		value: r.querySelector('.c-value').value.trim(),
		label: r.querySelector('.c-label').value.trim() || null,
	})).filter(c => c.value);
}

async function loadVisitor(id) {
	const r = await fetch(`/api/visitors/${id}`);
	if (!r.ok) return;
	const v = await r.json();
	dom.id.value = v.id;
	dom.firstName.value = v.first_name;
	dom.lastName.value = v.last_name;
	dom.academicDegree.value = v.academic_degree || '';
	dom.jobPosition.value = v.job_position || '';
	dom.note.value = v.note || '';
	dom.contacts.innerHTML = '';
	(v.contacts||[]).forEach(c => {
		const row = contactRow(c);
		dom.contacts.appendChild(row);
		// Translate the contact row
		if (window.translateElements) {
			window.translateElements(row);
		}
	});
	dom.photoPreview.innerHTML = (v.photos||[]).map(p=>`
        <div class="photo-item">
            <img src="${p.url}" alt="${p.originalName||''}" />
            <button title="Remove" aria-label="Remove photo" data-id="${p.id}" class="del-photo" type="button">×</button>
        </div>
    `).join('');
    Array.from(dom.photoPreview.querySelectorAll('.del-photo')).forEach(btn => {
        btn.onclick = async () => {
            btn.disabled = true;
            const r = await fetch(`/api/photos/${btn.dataset.id}`, { method: 'DELETE' });
            if (!r.ok) { alert('Failed to delete photo'); btn.disabled = false; return; }
            await loadVisitor(id);
        };
    });

	// Render existing voices
	dom.voiceList.innerHTML = (v.voices||[]).map(s=>`
		<div class="voice-item" style="display:flex;align-items:center;gap:8px;margin:4px 0;">
			<audio controls src="${s.url}"></audio>
			<button class="btn secondary del-voice" data-id="${s.id}" type="button" title="Remove" aria-label="Remove">×</button>
		</div>
	`).join('');
	Array.from(dom.voiceList.querySelectorAll('.del-voice')).forEach(btn => {
		btn.onclick = async () => {
			btn.disabled = true;
			const r = await fetch(`/api/voices/${btn.dataset.id}`, { method: 'DELETE' });
			if (!r.ok) { alert('Failed to delete voice'); btn.disabled = false; return; }
			await loadVisitor(id);
		};
	});
}

dom.addContactBtn.onclick = () => {
	const row = contactRow();
	dom.contacts.appendChild(row);
	// Translate the new contact row
	if (window.translateElements) {
		window.translateElements(row);
	}
};

dom.form.onsubmit = async (e) => {
	e.preventDefault();
	const payload = {
		first_name: dom.firstName.value.trim(),
		last_name: dom.lastName.value.trim(),
		academic_degree: dom.academicDegree.value.trim() || null,
		job_position: dom.jobPosition.value.trim() || null,
		note: dom.note.value.trim() || null,
		contacts: getContacts()
	};
	// basic client-side checks
	const errs = [];
	if (!payload.first_name) errs.push('First name is required');
	if (!payload.last_name) errs.push('Last name is required');
	for (const c of payload.contacts) {
		if (c.type === 'email' && !/^([^\s@]+)@([^\s@]+)\.[^\s@]+$/.test(c.value)) errs.push(`Invalid email: ${c.value}`);
		if (c.type === 'phone') {
			const digits = String(c.value).replace(/09(1[0-9]|3[1-9]|2[1-9])-?[0-9]{3}-?[0-9]{4}/g,'');
			if (digits.length < 10 || digits.length > 14) errs.push(`Invalid phone: ${c.value}`);
		}
		if (c.type === 'website') {
			try { new URL(c.value.startsWith('http')? c.value : 'https://' + c.value); } catch { errs.push(`Invalid website: ${c.value}`); }
		}
	}
	if (errs.length) { alert(errs.join('\n')); return; }
	let saved;
	if (dom.id.value) {
		saved = await fetch(`/api/visitors/${dom.id.value}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r=>r.json());
	} else {
		saved = await fetch(`/api/visitors`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r=>r.json());
	}
	if (dom.photoInput.files.length > 0) {
		const fd = new FormData();
		for (const f of dom.photoInput.files) fd.append('photos', f);
		await fetch(`/api/visitors/${saved.id}/photos`, { method: 'POST', body: fd });
	}
	// Upload queued or newly recorded voice after creating/updating visitor
	if (vrBlob && (vrQueued || !dom.id.value)) {
		try {
			const fd2 = new FormData();
			const file2 = new File([vrBlob], `voice-${Date.now()}.webm`, { type: vrBlob.type || 'audio/webm' });
			fd2.append('voice', file2);
			if (vrDurationMs) fd2.append('durationMs', String(vrDurationMs));
			await fetch(`/api/visitors/${saved.id}/voice`, { method: 'POST', body: fd2 });
		} catch (e) {
			console.error('Voice upload after save failed', e);
		}
	}
	location.href = '/visitors.html';
};

async function checkAuth() {
	const r = await fetch('/api/visitors');
	if (r.status === 401) { location.href = '/login.html'; return false; }
	return true;
}

checkAuth().then(() => { if (visitorId) loadVisitor(visitorId); });

// Voice recorder logic
let vrRecorder = null;
let vrChunks = [];
let vrBlob = null;
let vrDurationMs = null;
let vrQueued = false;
let vrTick = null;
let vrStartedAt = null;
const vrMaxMs = 120000; // 2 minutes visual scale

function updateVrButtons(state) {
	if (state === 'idle') {
		dom.vrStart.disabled = false;
		dom.vrStop.disabled = true;
        dom.vrPlay.disabled = !vrBlob;
       // dom.vrSave.disabled = !vrBlob; // allow queueing before create
	} else if (state === 'recording') {
		dom.vrStart.disabled = true;
		dom.vrStop.disabled = false;
		dom.vrPlay.disabled = true;
		//dom.vrSave.disabled = true;
	} else if (state === 'stopped') {
		dom.vrStart.disabled = false;
		dom.vrStop.disabled = true;
        dom.vrPlay.disabled = !vrBlob;
        //dom.vrSave.disabled = !vrBlob; // allow queueing before create
	}
}

function resetVrProgress() {
	if (dom.vrProgress) dom.vrProgress.style.width = '0%';
	if (dom.vrTime) dom.vrTime.textContent = '00:00';
	if (vrTick) { clearInterval(vrTick); vrTick = null; }
}

function startVrProgress() {
	resetVrProgress();
	vrStartedAt = Date.now();
	vrTick = setInterval(() => {
		const elapsed = Date.now() - vrStartedAt;
		const m = Math.floor(elapsed / 60000);
		const s = Math.floor((elapsed % 60000) / 1000);
		if (dom.vrTime) dom.vrTime.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
		const pct = Math.min(100, Math.round((elapsed / vrMaxMs) * 100));
		if (dom.vrProgress) dom.vrProgress.style.width = pct + '%';
	}, 100);
}

dom.vrStart.addEventListener('click', async () => {
	try {
		dom.vrStatus.textContent = '';
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		vrChunks = [];
		vrBlob = null;
		vrDurationMs = null;
	vrRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
	startVrProgress();
		vrRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) vrChunks.push(e.data); };
		vrRecorder.onstop = () => {
			vrBlob = new Blob(vrChunks, { type: 'audio/webm' });
		vrDurationMs = Date.now() - vrStartedAt;
		resetVrProgress();
			//dom.vrAudio.src = URL.createObjectURL(vrBlob);
			//dom.vrAudio.style.display = '';
			updateVrButtons('stopped');
		// Auto-upload in edit mode (when visitor already exists)
		if (dom.id.value) {
			(async () => {
				try {
					dom.vrStatus.textContent = 'Uploading...';
					const fd = new FormData();
					const file = new File([vrBlob], `voice-${Date.now()}.webm`, { type: vrBlob.type || 'audio/webm' });
					fd.append('voice', file);
					if (vrDurationMs) fd.append('durationMs', String(vrDurationMs));
					const r = await fetch(`/api/visitors/${dom.id.value}/voice`, { method: 'POST', body: fd });
					if (!r.ok) throw new Error('Upload failed');
					dom.vrStatus.textContent = 'Saved';
					await loadVisitor(dom.id.value);
				} catch (e) {
					console.error(e);
					dom.vrStatus.textContent = 'Failed to save';
				}
			})();
		}
		};
		vrRecorder.start();
		updateVrButtons('recording');
	} catch (err) {
		console.log(err);
		alert('Microphone access denied or unsupported.');
	}
});

dom.vrStop.addEventListener('click', () => {
	if (vrRecorder && vrRecorder.state === 'recording') {
		vrRecorder.stop();
		// stop tracks to release mic
		try { vrRecorder.stream.getTracks().forEach(t => t.stop()); } catch {}
	}
});

dom.vrPlay.addEventListener('click', () => {
	if (dom.vrAudio.src) dom.vrAudio.play();
});

const vrSaveEl = document.getElementById('vrSave');
if (vrSaveEl) vrSaveEl.addEventListener('click', async () => {
    if (!vrBlob) return;
    try {
        if (!dom.id.value) {
            // queue until visitor is created
            vrQueued = true;
            dom.vrStatus.textContent = 'Will upload after saving the visitor.';
            return;
        }
        dom.vrStatus.textContent = 'Uploading...';
        const fd = new FormData();
        const file = new File([vrBlob], `voice-${Date.now()}.webm`, { type: vrBlob.type || 'audio/webm' });
        fd.append('voice', file);
        if (vrDurationMs) fd.append('durationMs', String(vrDurationMs));
        const r = await fetch(`/api/visitors/${dom.id.value}/voice`, { method: 'POST', body: fd });
        if (!r.ok) throw new Error('Upload failed');
        dom.vrStatus.textContent = 'Saved';
        await loadVisitor(dom.id.value);
    } catch (e) {
        console.error(e);
        dom.vrStatus.textContent = 'Failed to save';
    }
});

updateVrButtons('idle');


