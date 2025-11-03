async function listVisitors() {
	const r = await fetch('/api/visitors');
	return r.json();
}

function renderRow(v) {
    const tr = document.createElement('tr');
    const contactIcons = {
        email: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>',
        phone: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>',
        address: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>',
        website: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>'
    };
    const contacts = (v.contacts||[]).map(c=>{
        return `<span class="contact-badge" data-type="${c.type}">${contactIcons[c.type] || ''} ${c.value}</span>`;
    }).join('');
    const photos = (v.photos||[]).slice(0,3).map(p=>`<img src="${p.url}" alt="${p.originalName||''}" style="width:40px;height:40px;object-fit:cover;border-radius:var(--radius-md);border:2px solid var(--border-color);margin-right:var(--space-1);" />`).join('');
    const photoCount = v.photos.length > 3 ? `<span class="text-muted" style="font-size: var(--font-size-xs);">+${v.photos.length - 3} more</span>` : '';
    const businessTypes = [];
    if (v.is_manufacturer === 1) businessTypes.push('Manufacturer');
    if (v.is_trader === 1) businessTypes.push('Trader');
    if (v.is_distributor === 1) businessTypes.push('Distributor');
    const businessTypeDisplay = businessTypes.length > 0 ? businessTypes.join(', ') : '-';
    tr.innerHTML = `
        <td>
            <div style="font-weight:var(--font-weight-semibold); color: var(--text-primary);">${v.first_name} ${v.last_name}</div>
            ${v.note ? `<div class="text-muted" style="margin-top: var(--space-1); font-size: var(--font-size-sm);">${v.note}</div>` : ''}
        </td>
        <td><span class="text-secondary">${v.company_name || '-'}</span></td>
        <td><span class="text-secondary">${v.job_position || '-'}</span></td>
        <td><span class="text-secondary">${businessTypeDisplay}</span></td>
        <td><span class="text-secondary">${v.field_of_activity || '-'}</span></td>
        <td><div class="contacts-container">${contacts || '<span class="text-muted">-</span>'}</div></td>
        <td><div style="display:flex;align-items:center;gap:var(--space-1);flex-wrap:wrap;">${photos}${photoCount}</div></td>
        <td>
            <div class="actions">
                <a class="btn btn-edit" href="/visitor.html?id=${v.id}">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    <span data-i18n="table.edit">Edit</span>
                </a>
                <button class="btn btn-delete del">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    <span data-i18n="table.delete">Delete</span>
                </button>
            </div>
        </td>
    `;
    tr.querySelector('.del').onclick = async () => {
        await fetch(`/api/visitors/${v.id}`, { method: 'DELETE' });
        load();
    };


    // Translate the buttons
    if (window.translateElements) {
        window.translateElements(tr);
    }
    
    return tr;
}

async function exportToExcel() {
	try {
		// Fetch all visitors
		const r = await fetch('/api/visitors');
		if (r.status === 401) { location.href = '/login.html'; return; }
		const visitors = await r.json();

		// Get current language for headers
		const lang = localStorage.getItem('lang') || 'en';
		const headers = {
			en: ['Name', 'Company Name', 'Job Position', 'Business Type', 'Field of Activity', 'Email', 'Phone', 'Address', 'Website', 'Note', 'Photos Count'],
			fa: ['نام', 'نام شرکت', 'سمت شغلی', 'نوع کسب‌وکار', 'حوزه فعالیت', 'ایمیل', 'تلفن', 'آدرس', 'وب‌سایت', 'یادداشت', 'تعداد عکس']
		};
		const headerRow = headers[lang] || headers.en;

		// Format data for Excel
		const excelData = [headerRow];

		visitors.forEach(v => {
			// Extract contacts by type - handle multiple contacts of same type
			const contacts = (v.contacts || []).reduce((acc, c) => {
				if (!acc[c.type]) {
					acc[c.type] = [];
				}
				acc[c.type].push(c.value);
				return acc;
			}, {});

			// Join multiple contacts of the same type with semicolon
			const formatContacts = (type) => {
				return (contacts[type] || []).join('; ');
			};

			const businessTypes = [];
			if (v.is_manufacturer === 1) businessTypes.push('Manufacturer');
			if (v.is_trader === 1) businessTypes.push('Trader');
			if (v.is_distributor === 1) businessTypes.push('Distributor');
			const businessTypeExport = businessTypes.join('; ') || '';
			
			const row = [
				`${v.first_name || ''} ${v.last_name || ''}`.trim(),
				v.company_name || '',
				v.job_position || '',
				businessTypeExport,
				v.field_of_activity || '',
				formatContacts('email'),
				formatContacts('phone'),
				formatContacts('address'),
				formatContacts('website'),
				v.note || '',
				(v.photos || []).length
			];
			excelData.push(row);
		});

		// Create worksheet
		const ws = XLSX.utils.aoa_to_sheet(excelData);

		// Set column widths
		const colWidths = [
			{ wch: 20 }, // Name
			{ wch: 18 }, // Company Name
			{ wch: 18 }, // Job Position
			{ wch: 20 }, // Business Type
			{ wch: 25 }, // Field of Activity
			{ wch: 25 }, // Email
			{ wch: 15 }, // Phone
			{ wch: 30 }, // Address
			{ wch: 25 }, // Website
			{ wch: 30 }, // Note
			{ wch: 12 }  // Photos Count
		];
		ws['!cols'] = colWidths;

		// Create workbook
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, 'Visitors');

		// Generate filename with timestamp
		const timestamp = new Date().toISOString().split('T')[0];
		const filename = `visitors_export_${timestamp}.xlsx`;

		// Download file
		XLSX.writeFile(wb, filename);

		console.log(`Exported ${visitors.length} visitors to ${filename}`);
	} catch (error) {
		console.error('Export failed:', error);
		alert('Failed to export data. Please try again.');
	}
}

// Setup export button
function setupExportButton() {
	const exportBtn = document.getElementById('exportBtn');
	if (exportBtn) {
		exportBtn.addEventListener('click', exportToExcel);
		// Translate button text
		if (window.translateElements) {
			window.translateElements(exportBtn);
		}
	}
	
	// Translate loader text
	const loader = document.getElementById('loader');
	if (loader && window.translateElements) {
		window.translateElements(loader);
	}
}

// Setup button when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', setupExportButton);
} else {
	setupExportButton();
}

async function load() {
	const loader = document.getElementById('loader');
	const table = document.getElementById('visitorsTable');
	const container = document.getElementById('visitorsList');
	
	// Show loader, hide table
	if (loader) loader.classList.remove('hidden');
	if (table) table.style.display = 'none';
	container.innerHTML = '';
	
	try {
		const r = await fetch('/api/visitors');
		if (r.status === 401) { location.href = '/login.html'; return; }
		const visitors = await r.json();
		
		// Render all rows
		visitors.forEach(v => container.appendChild(renderRow(v)));
		
		// Hide loader, show table
		if (loader) loader.classList.add('hidden');
		if (table) table.style.display = '';
	} catch (error) {
		console.error('Failed to load visitors:', error);
		if (loader) loader.classList.add('hidden');
		if (table) table.style.display = '';
		container.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">Failed to load data. Please refresh the page.</td></tr>';
	}
}

load();


