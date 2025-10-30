async function listVisitors() {
	const r = await fetch('/api/visitors');
	return r.json();
}

function renderRow(v) {
    const tr = document.createElement('tr');
    const contacts = (v.contacts||[]).map(c=>{
        const icons = {
            email: '📧',
            phone: '📞', 
            address: '📍',
            website: '🌐'
        };
        return `<span class="contact-badge" data-type="${c.type}">${icons[c.type] || '📋'} ${c.value}</span>`;
    }).join('');
    const photos = (v.photos||[]).slice(0,3).map(p=>`<img src="${p.url}" alt="${p.originalName||''}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;border:1px solid #e5e7eb;margin-right:4px;" />`).join('');
    tr.innerHTML = `
        <td>
            <div style="font-weight:600;">${v.first_name} ${v.last_name}</div>
            <div class="muted">${v.note || ''}</div>
        </td>
        <td>${v.academic_degree || '-'}</td>
        <td>${v.job_position || '-'}</td>
        <td><div class="contacts-container">${contacts}</div></td>
        <td><div style="display:flex;align-items:center;gap:4px;">${photos}</div></td>
        <td>
            <div class="actions">
                <a class="btn btn-edit" href="/visitor.html?id=${v.id}"><span class="btn-icon">✏️</span><span data-i18n="table.edit">Edit</span></a>
                <button class="btn btn-delete del"><span class="btn-icon">🗑️</span><span data-i18n="table.delete">Delete</span></button>
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
			en: ['Name', 'Academic Degree', 'Job Position', 'Email', 'Phone', 'Address', 'Website', 'Note', 'Photos Count'],
			fa: ['نام', 'مدرک تحصیلی', 'سمت شغلی', 'ایمیل', 'تلفن', 'آدرس', 'وب‌سایت', 'یادداشت', 'تعداد عکس']
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

			const row = [
				`${v.first_name || ''} ${v.last_name || ''}`.trim(),
				v.academic_degree || '',
				v.job_position || '',
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
			{ wch: 18 }, // Academic Degree
			{ wch: 18 }, // Job Position
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
		container.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">Failed to load data. Please refresh the page.</td></tr>';
	}
}

load();


