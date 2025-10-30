const api = {
	async listVisitors() {
		const r = await fetch('/api/visitors');
		return r.json();
	},
	async getVisitor(id) {
		const r = await fetch(`/api/visitors/${id}`);
		if (!r.ok) throw new Error('Failed');
		return r.json();
	},
	async createVisitor(payload) {
		const r = await fetch('/api/visitors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
		if (!r.ok) throw new Error('Failed');
		return r.json();
	},
	async updateVisitor(id, payload) {
		const r = await fetch(`/api/visitors/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
		if (!r.ok) throw new Error('Failed');
		return r.json();
	},
	async deleteVisitor(id) {
		await fetch(`/api/visitors/${id}`, { method: 'DELETE' });
	},
	async uploadPhotos(id, files) {
		const fd = new FormData();
		for (const f of files) fd.append('photos', f);
		const r = await fetch(`/api/visitors/${id}/photos`, { method: 'POST', body: fd });
		if (!r.ok) throw new Error('Upload failed');
		return r.json();
	},
	async deletePhoto(photoId) {
		await fetch(`/api/photos/${photoId}`, { method: 'DELETE' });
	}
};

const dom = {
	list: document.getElementById('visitorsList'),
	form: document.getElementById('visitorForm'),
	visitorId: document.getElementById('visitorId'),
	firstName: document.getElementById('firstName'),
	lastName: document.getElementById('lastName'),
	note: document.getElementById('note'),
	contacts: document.getElementById('contacts'),
	addContactBtn: document.getElementById('addContactBtn'),
	photoInput: document.getElementById('photoInput'),
	photoPreview: document.getElementById('photoPreview'),
	resetBtn: document.getElementById('resetBtn')
};

function renderContactRow(data = { type: 'email', value: '', label: '' }) {
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
		<button type="button" class="secondary remove">Remove</button>
	`;
	div.querySelector('.remove').onclick = () => div.remove();
	return div;
}

function getContactsFromForm() {
	const rows = Array.from(dom.contacts.querySelectorAll('.contact-row'));
	return rows.map(r => ({
		type: r.querySelector('.c-type').value,
		value: r.querySelector('.c-value').value.trim(),
		label: r.querySelector('.c-label').value.trim() || null,
	})).filter(c => c.value);
}

function resetForm() {
	dom.visitorId.value = '';
	dom.firstName.value = '';
	dom.lastName.value = '';
	dom.note.value = '';
	dom.contacts.innerHTML = '';
	dom.photoInput.value = '';
	dom.photoPreview.innerHTML = '';
}

async function loadVisitors() {
	const visitors = await api.listVisitors();
	dom.list.innerHTML = '';
	for (const v of visitors) dom.list.appendChild(renderCard(v));
}

function renderCard(v) {
	const card = document.createElement('div');
	card.className = 'card';
	card.innerHTML = `
		<h3>${v.first_name} ${v.last_name}</h3>
		<p class="muted">${v.note ? v.note : ''}</p>
		<div>${(v.contacts||[]).map(c=>`<span class="badge">${c.type}: ${c.value}</span>`).join(' ')}</div>
		<div class="photos">${(v.photos||[]).map(p=>`<img src="${p.url}" alt="${p.originalName||''}" />`).join('')}</div>
		<div class="actions" style="margin-top:8px;">
			<button class="secondary edit">Edit</button>
			<button class="danger delete">Delete</button>
		</div>
	`;
	card.querySelector('.edit').onclick = async () => {
		const full = await api.getVisitor(v.id);
		dom.visitorId.value = full.id;
		dom.firstName.value = full.first_name;
		dom.lastName.value = full.last_name;
		dom.note.value = full.note || '';
		dom.contacts.innerHTML = '';
		for (const c of full.contacts) dom.contacts.appendChild(renderContactRow(c));
		dom.photoPreview.innerHTML = (full.photos||[]).map(p => `
			<div>
				<img src="${p.url}" alt="${p.originalName||''}" />
				<div><button data-id="${p.id}" class="secondary small del-photo">Remove</button></div>
			</div>
		`).join('');
		Array.from(dom.photoPreview.querySelectorAll('.del-photo')).forEach(btn => {
			btn.onclick = async () => { await api.deletePhoto(btn.getAttribute('data-id')); await loadVisitors(); card.querySelector('.edit').click(); };
		});
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};
	card.querySelector('.delete').onclick = async () => { await api.deleteVisitor(v.id); await loadVisitors(); };
	return card;
}

dom.addContactBtn.onclick = () => dom.contacts.appendChild(renderContactRow());
dom.resetBtn.onclick = () => resetForm();

dom.form.onsubmit = async (e) => {
	e.preventDefault();
	const payload = {
		first_name: dom.firstName.value.trim(),
		last_name: dom.lastName.value.trim(),
		note: dom.note.value.trim() || null,
		contacts: getContactsFromForm()
	};
	let saved;
	if (dom.visitorId.value) {
		saved = await api.updateVisitor(Number(dom.visitorId.value), payload);
	} else {
		saved = await api.createVisitor(payload);
		dom.visitorId.value = saved.id;
	}
	if (dom.photoInput.files.length > 0) {
		await api.uploadPhotos(saved.id, dom.photoInput.files);
		dom.photoInput.value = '';
	}
	await loadVisitors();
};

loadVisitors();


