import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export class Database {
	constructor(dbPath) {
		this.dbPath = dbPath;
		this.dbPromise = open({ filename: dbPath, driver: sqlite3.Database });
	}

	async migrate() {
		const db = await this.dbPromise;
		await db.exec(`
			PRAGMA foreign_keys = ON;
			CREATE TABLE IF NOT EXISTS users (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				username TEXT UNIQUE NOT NULL,
				password_hash TEXT NOT NULL,
				role TEXT DEFAULT 'user',
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				deleted_at DATETIME
			);
			CREATE TABLE IF NOT EXISTS visitors (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				first_name TEXT NOT NULL,
				last_name TEXT NOT NULL,
				company_name TEXT,
				job_position TEXT,
				is_manufacturer INTEGER DEFAULT 0,
				is_trader INTEGER DEFAULT 0,
				is_distributor INTEGER DEFAULT 0,
				field_of_activity TEXT,
				unsaturated_polyester INTEGER DEFAULT 0,
				alkyd_resin_long INTEGER DEFAULT 0,
				alkyd_resin_medium INTEGER DEFAULT 0,
				alkyd_resin_short INTEGER DEFAULT 0,
				drying_agent INTEGER DEFAULT 0,
				answer1 TEXT,
				answer2 INTEGER DEFAULT 0,
				answer3 TEXT,
				note TEXT,
				created_by INTEGER,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				deleted_at DATETIME,
				FOREIGN KEY(created_by) REFERENCES users(id)
			);

			CREATE TABLE IF NOT EXISTS contacts (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				visitor_id INTEGER NOT NULL,
				type TEXT NOT NULL,
				value TEXT NOT NULL,
				label TEXT,
				deleted_at DATETIME,
				FOREIGN KEY(visitor_id) REFERENCES visitors(id) ON DELETE CASCADE
			);

			CREATE TABLE IF NOT EXISTS photos (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				visitor_id INTEGER NOT NULL,
				filename TEXT NOT NULL,
				url TEXT NOT NULL,
				original_name TEXT,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				deleted_at DATETIME,
				FOREIGN KEY(visitor_id) REFERENCES visitors(id) ON DELETE CASCADE
			);

			CREATE TABLE IF NOT EXISTS voices (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				visitor_id INTEGER NOT NULL,
				filename TEXT NOT NULL,
				url TEXT NOT NULL,
				mime_type TEXT,
				duration_ms INTEGER,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				deleted_at DATETIME,
				FOREIGN KEY(visitor_id) REFERENCES visitors(id) ON DELETE CASCADE
			);
		`);
		// Backfill columns if DB existed prior (SQLite allows ADD COLUMN)
		await db.exec(`
			ALTER TABLE users ADD COLUMN deleted_at DATETIME;
		`).catch(()=>{});
		await db.exec(`
			ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
		`).catch(()=>{});
		// Update existing users without role to 'admin' if they're the first user (backward compatibility)
		try {
			const existingUsers = await db.all(`SELECT id FROM users WHERE role IS NULL LIMIT 1`);
			if (existingUsers.length > 0) {
				await db.exec(`UPDATE users SET role = 'admin' WHERE role IS NULL`);
			}
		} catch(e) {}
		await db.exec(`
			ALTER TABLE visitors ADD COLUMN deleted_at DATETIME;
		`).catch(()=>{});
		await db.exec(`
			ALTER TABLE contacts ADD COLUMN deleted_at DATETIME;
		`).catch(()=>{});
		await db.exec(`
			ALTER TABLE photos ADD COLUMN deleted_at DATETIME;
		`).catch(()=>{});
		await db.exec(`
			ALTER TABLE voices ADD COLUMN deleted_at DATETIME;
		`).catch(()=>{});
		await db.exec(`
			ALTER TABLE visitors ADD COLUMN academic_degree TEXT;
		`).catch(()=>{});
		await db.exec(`
			ALTER TABLE visitors ADD COLUMN company_name TEXT;
		`).catch(()=>{});
		// Migrate academic_degree to company_name if academic_degree exists and company_name doesn't
		try {
			const hasOld = await db.get(`SELECT academic_degree FROM visitors LIMIT 1`).catch(()=>null);
			const hasNew = await db.get(`SELECT company_name FROM visitors LIMIT 1`).catch(()=>null);
			if (hasOld !== null && hasNew === null) {
				await db.exec(`ALTER TABLE visitors RENAME COLUMN academic_degree TO company_name`);
			}
		} catch(e) {
			// If RENAME COLUMN is not supported (SQLite < 3.25.0), copy data and drop old column
			try {
				const hasOld = await db.get(`SELECT academic_degree FROM visitors LIMIT 1`).catch(()=>null);
				const hasNew = await db.get(`SELECT company_name FROM visitors LIMIT 1`).catch(()=>null);
				if (hasOld !== null && hasNew === null) {
					await db.exec(`UPDATE visitors SET company_name = academic_degree WHERE company_name IS NULL AND academic_degree IS NOT NULL`);
				}
			} catch(e2) {}
		}
		await db.exec(`
			ALTER TABLE visitors ADD COLUMN job_position TEXT;
		`).catch(()=>{});
		await db.exec(`
			ALTER TABLE visitors ADD COLUMN is_manufacturer INTEGER DEFAULT 0;
		`).catch(()=>{});
		await db.exec(`
			ALTER TABLE visitors ADD COLUMN is_trader INTEGER DEFAULT 0;
		`).catch(()=>{});
		await db.exec(`
			ALTER TABLE visitors ADD COLUMN is_distributor INTEGER DEFAULT 0;
		`).catch(()=>{});
		await db.exec(`
			ALTER TABLE visitors ADD COLUMN field_of_activity TEXT;
		`).catch(()=>{});
		await db.exec(`
			ALTER TABLE visitors ADD COLUMN unsaturated_polyester INTEGER DEFAULT 0;
		`).catch(()=>{});
		await db.exec(`
			ALTER TABLE visitors ADD COLUMN alkyd_resin INTEGER DEFAULT 0;
		`).catch(()=>{});
		await db.exec(`
			ALTER TABLE visitors ADD COLUMN alkyd_resin_long INTEGER DEFAULT 0;
		`).catch(()=>{});
		await db.exec(`
			ALTER TABLE visitors ADD COLUMN alkyd_resin_medium INTEGER DEFAULT 0;
		`).catch(()=>{});
		await db.exec(`
			ALTER TABLE visitors ADD COLUMN alkyd_resin_short INTEGER DEFAULT 0;
		`).catch(()=>{});
		// Migrate old alkyd_resin to alkyd_resin_long if it exists
		try {
			const hasOld = await db.get(`SELECT alkyd_resin FROM visitors WHERE alkyd_resin = 1 LIMIT 1`).catch(()=>null);
			if (hasOld !== null) {
				await db.exec(`UPDATE visitors SET alkyd_resin_long = alkyd_resin WHERE alkyd_resin = 1 AND alkyd_resin_long = 0`);
			}
		} catch(e) {}
		await db.exec(`
			ALTER TABLE visitors ADD COLUMN drying_agent INTEGER DEFAULT 0;
		`).catch(()=>{});
		await db.exec(`
			ALTER TABLE visitors ADD COLUMN answer1 TEXT;
		`).catch(()=>{});
		await db.exec(`
			ALTER TABLE visitors ADD COLUMN answer2 TEXT;
		`).catch(()=>{});
		await db.exec(`
			ALTER TABLE visitors ADD COLUMN answer2 INTEGER DEFAULT 0;
		`).catch(()=>{});
		// Migrate old answer2 text values to boolean (1 for any text, 0 for empty/null)
		try {
			await db.exec(`UPDATE visitors SET answer2 = CASE WHEN answer2 IS NOT NULL AND answer2 != '' THEN 1 ELSE 0 END WHERE typeof(answer2) = 'text'`);
		} catch(e) {}
		await db.exec(`
			ALTER TABLE visitors ADD COLUMN answer3 TEXT;
		`).catch(()=>{});
		await db.exec(`
			ALTER TABLE visitors ADD COLUMN created_by INTEGER;
		`).catch(()=>{});
	}

	async getUserByUsername(username) {
		const db = await this.dbPromise;
		return db.get(`SELECT * FROM users WHERE username = ? AND deleted_at IS NULL`, username);
	}

	async getUserById(id) {
		const db = await this.dbPromise;
		return db.get(`SELECT id, username, role, created_at FROM users WHERE id = ? AND deleted_at IS NULL`, id);
	}

	async createUser(username, passwordHash, role = 'user') {
		const db = await this.dbPromise;
		const res = await db.run(`INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)`, username, passwordHash, role);
		return db.get(`SELECT id, username, role, created_at FROM users WHERE id = ?`, res.lastID);
	}

	async listUsers() {
		const db = await this.dbPromise;
		return db.all(`
			SELECT 
				u.id, 
				u.username, 
				u.role, 
				u.created_at,
				COUNT(v.id) AS visitor_count
			FROM users u
			LEFT JOIN visitors v ON u.id = v.created_by AND v.deleted_at IS NULL
			WHERE u.deleted_at IS NULL
			GROUP BY u.id, u.username, u.role, u.created_at
			ORDER BY u.created_at DESC
		`);
	}

	async updateUserRole(userId, role) {
		const db = await this.dbPromise;
		if (!['admin', 'user'].includes(role)) {
			throw new Error('Invalid role. Must be "admin" or "user"');
		}
		await db.run(`UPDATE users SET role = ? WHERE id = ? AND deleted_at IS NULL`, role, userId);
		return db.get(`SELECT id, username, role, created_at FROM users WHERE id = ? AND deleted_at IS NULL`, userId);
	}

	async setUserPassword(userId, newPasswordHash) {
		const db = await this.dbPromise;
		await db.run(`UPDATE users SET password_hash = ? WHERE id = ? AND deleted_at IS NULL`, newPasswordHash, userId);
		return true;
	}

	async listVisitors(userId = null, isAdmin = false) {
		const db = await this.dbPromise;
		let whereClause = 'v.deleted_at IS NULL';
		if (!isAdmin && userId !== null) {
			whereClause += ' AND v.created_by = ?';
		}
		const params = !isAdmin && userId !== null ? [userId] : [];
		const rows = await db.all(`
			SELECT v.*, 
			u.username AS created_by_username,
			(
				SELECT json_group_array(json_object('id', c.id, 'type', c.type, 'value', c.value, 'label', c.label))
				FROM contacts c WHERE c.visitor_id = v.id AND c.deleted_at IS NULL
			) AS contacts,
			(
				SELECT json_group_array(json_object('id', p.id, 'filename', p.filename, 'url', p.url, 'originalName', p.original_name))
				FROM photos p WHERE p.visitor_id = v.id AND p.deleted_at IS NULL
			) AS photos,
			(
				SELECT json_group_array(json_object('id', s.id, 'filename', s.filename, 'url', s.url, 'mimeType', s.mime_type, 'durationMs', s.duration_ms))
				FROM voices s WHERE s.visitor_id = v.id AND s.deleted_at IS NULL
			) AS voices
			FROM visitors v
			LEFT JOIN users u ON v.created_by = u.id
			WHERE ${whereClause}
			ORDER BY v.created_at DESC
		`, ...params);
		return rows.map(r => ({
			...r,
			contacts: r.contacts ? JSON.parse(r.contacts) : [],
			photos: r.photos ? JSON.parse(r.photos) : [],
			voices: r.voices ? JSON.parse(r.voices) : [],
		}));
	}

	async getVisitor(id, userId = null, isAdmin = false) {
		const db = await this.dbPromise;
		let whereClause = 'id = ? AND deleted_at IS NULL';
		const params = [id];
		if (!isAdmin && userId !== null) {
			whereClause += ' AND created_by = ?';
			params.push(userId);
		}
		const v = await db.get(`SELECT * FROM visitors WHERE ${whereClause}`, ...params);
		if (!v) return null;
		const contacts = await db.all(`SELECT * FROM contacts WHERE visitor_id = ? AND deleted_at IS NULL`, id);
		const photos = await db.all(`SELECT id, filename, url, original_name AS originalName FROM photos WHERE visitor_id = ? AND deleted_at IS NULL`, id);
		const voices = await db.all(`SELECT id, filename, url, mime_type AS mimeType, duration_ms AS durationMs FROM voices WHERE visitor_id = ? AND deleted_at IS NULL`, id);
		return { ...v, contacts, photos, voices };
	}

	async createVisitor(body, userId = null) {
		const { first_name, last_name, company_name, job_position, is_manufacturer, is_trader, is_distributor, field_of_activity, unsaturated_polyester, alkyd_resin_long, alkyd_resin_medium, alkyd_resin_short, drying_agent, answer1, answer2, answer3, note, contacts = [] } = body;
		if (!first_name || !last_name) throw new Error('first_name and last_name are required');
		const db = await this.dbPromise;
		const result = await db.run(`INSERT INTO visitors (first_name, last_name, company_name, job_position, is_manufacturer, is_trader, is_distributor, field_of_activity, unsaturated_polyester, alkyd_resin_long, alkyd_resin_medium, alkyd_resin_short, drying_agent, answer1, answer2, answer3, note, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
			first_name, last_name, company_name || null, job_position || null, 
			is_manufacturer ? 1 : 0, is_trader ? 1 : 0, is_distributor ? 1 : 0, 
			field_of_activity || null, unsaturated_polyester ? 1 : 0, 
			alkyd_resin_long ? 1 : 0, alkyd_resin_medium ? 1 : 0, alkyd_resin_short ? 1 : 0, 
			drying_agent ? 1 : 0, answer1 || null, answer2 ? 1 : 0, answer3 || null, note || null, userId);
		const id = result.lastID;
		for (const c of contacts) {
			await db.run(`INSERT INTO contacts (visitor_id, type, value, label) VALUES (?, ?, ?, ?)`, id, c.type, c.value, c.label || null);
		}
		return await this.getVisitor(id, userId, false);
	}

	async updateVisitor(id, body, userId = null, isAdmin = false) {
		const { first_name, last_name, company_name, job_position, is_manufacturer, is_trader, is_distributor, field_of_activity, unsaturated_polyester, alkyd_resin_long, alkyd_resin_medium, alkyd_resin_short, drying_agent, answer1, answer2, answer3, note, contacts } = body;
		const db = await this.dbPromise;
		let whereClause = 'id = ?';
		const params = [id];
		if (!isAdmin && userId !== null) {
			whereClause += ' AND created_by = ?';
			params.push(userId);
		}
		const current = await db.get(`SELECT * FROM visitors WHERE ${whereClause}`, ...params);
		if (!current) throw new Error('Visitor not found');
		const isManu = is_manufacturer !== undefined ? (is_manufacturer ? 1 : 0) : null;
		const isTrad = is_trader !== undefined ? (is_trader ? 1 : 0) : null;
		const isDist = is_distributor !== undefined ? (is_distributor ? 1 : 0) : null;
		const unsatPoly = unsaturated_polyester !== undefined ? (unsaturated_polyester ? 1 : 0) : null;
		const alkydLong = alkyd_resin_long !== undefined ? (alkyd_resin_long ? 1 : 0) : null;
		const alkydMedium = alkyd_resin_medium !== undefined ? (alkyd_resin_medium ? 1 : 0) : null;
		const alkydShort = alkyd_resin_short !== undefined ? (alkyd_resin_short ? 1 : 0) : null;
		const drying = drying_agent !== undefined ? (drying_agent ? 1 : 0) : null;
		const answer2Val = answer2 !== undefined ? (answer2 ? 1 : 0) : null;
		await db.run(`UPDATE visitors SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name), company_name = COALESCE(?, company_name), job_position = COALESCE(?, job_position), is_manufacturer = COALESCE(?, is_manufacturer), is_trader = COALESCE(?, is_trader), is_distributor = COALESCE(?, is_distributor), field_of_activity = COALESCE(?, field_of_activity), unsaturated_polyester = COALESCE(?, unsaturated_polyester), alkyd_resin_long = COALESCE(?, alkyd_resin_long), alkyd_resin_medium = COALESCE(?, alkyd_resin_medium), alkyd_resin_short = COALESCE(?, alkyd_resin_short), drying_agent = COALESCE(?, drying_agent), answer1 = COALESCE(?, answer1), answer2 = COALESCE(?, answer2), answer3 = COALESCE(?, answer3), note = COALESCE(?, note), updated_at = CURRENT_TIMESTAMP WHERE id = ?`, 
			first_name ?? null, last_name ?? null, company_name ?? null, job_position ?? null, 
			isManu, isTrad, isDist, field_of_activity ?? null, unsatPoly, alkydLong, alkydMedium, alkydShort, drying, 
			answer1 ?? null, answer2Val, answer3 ?? null, note ?? null, id);
		if (Array.isArray(contacts)) {
		// soft-delete existing contacts then insert new ones
		await db.run(`UPDATE contacts SET deleted_at = CURRENT_TIMESTAMP WHERE visitor_id = ? AND deleted_at IS NULL`, id);
			for (const c of contacts) {
				await db.run(`INSERT INTO contacts (visitor_id, type, value, label) VALUES (?, ?, ?, ?)`, id, c.type, c.value, c.label || null);
			}
		}
		return await this.getVisitor(id, userId, isAdmin);
	}

	async deleteVisitor(id, userId = null, isAdmin = false) {
		const db = await this.dbPromise;
		let whereClause = 'id = ? AND deleted_at IS NULL';
		const params = [id];
		if (!isAdmin && userId !== null) {
			whereClause += ' AND created_by = ?';
			params.push(userId);
		}
		const result = await db.run(`UPDATE visitors SET deleted_at = CURRENT_TIMESTAMP WHERE ${whereClause}`, ...params);
		if (result.changes === 0) throw new Error('Visitor not found');
		//await db.run(`UPDATE contacts SET deleted_at = CURRENT_TIMESTAMP WHERE visitor_id = ? AND deleted_at IS NULL`, id);
		//await db.run(`UPDATE photos SET deleted_at = CURRENT_TIMESTAMP WHERE visitor_id = ? AND deleted_at IS NULL`, id);
	}

	async addContact(visitorId, contact) {
		const db = await this.dbPromise;
		const v = await db.get(`SELECT id FROM visitors WHERE id = ?`, visitorId);
		if (!v) throw new Error('Visitor not found');
		const result = await db.run(`INSERT INTO contacts (visitor_id, type, value, label) VALUES (?, ?, ?, ?)`, visitorId, contact.type, contact.value, contact.label || null);
		return await db.get(`SELECT * FROM contacts WHERE id = ?`, result.lastID);
	}

	async updateContact(contactId, contact) {
		const db = await this.dbPromise;
		const existing = await db.get(`SELECT * FROM contacts WHERE id = ?`, contactId);
		if (!existing) throw new Error('Contact not found');
		await db.run(`UPDATE contacts SET type = COALESCE(?, type), value = COALESCE(?, value), label = COALESCE(?, label) WHERE id = ?`, contact.type ?? null, contact.value ?? null, contact.label ?? null, contactId);
		return await db.get(`SELECT * FROM contacts WHERE id = ?`, contactId);
	}

	async getContact(contactId) {
		const db = await this.dbPromise;
		return db.get(`SELECT * FROM contacts WHERE id = ? AND deleted_at IS NULL`, contactId);
	}

	async deleteContact(contactId) {
		const db = await this.dbPromise;
		await db.run(`UPDATE contacts SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`, contactId);
	}

	async addPhotos(visitorId, photos) {
		const db = await this.dbPromise;
		const v = await db.get(`SELECT id FROM visitors WHERE id = ?`, visitorId);
		if (!v) throw new Error('Visitor not found');
		const created = [];
		for (const p of photos) {
			const result = await db.run(`INSERT INTO photos (visitor_id, filename, url, original_name) VALUES (?, ?, ?, ?)`, visitorId, p.filename, p.url, p.originalName || null);
			created.push(await db.get(`SELECT id, filename, url, original_name AS originalName FROM photos WHERE id = ?`, result.lastID));
		}
		return created;
	}

	async getPhoto(id) {
		const db = await this.dbPromise;
		return db.get(`SELECT * FROM photos WHERE id = ? AND deleted_at IS NULL`, id);
	}

	async deletePhoto(id) {
		const db = await this.dbPromise;
		await db.run(`UPDATE photos SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`, id);
	}

	async addVoice(visitorId, voice) {
		const db = await this.dbPromise;
		const v = await db.get(`SELECT id FROM visitors WHERE id = ?`, visitorId);
		if (!v) throw new Error('Visitor not found');
		const result = await db.run(`INSERT INTO voices (visitor_id, filename, url, mime_type, duration_ms) VALUES (?, ?, ?, ?, ?)`, visitorId, voice.filename, voice.url, voice.mimeType || null, voice.durationMs || null);
		return await db.get(`SELECT id, filename, url, mime_type AS mimeType, duration_ms AS durationMs FROM voices WHERE id = ?`, result.lastID);
	}

	async getVoice(id) {
		const db = await this.dbPromise;
		return db.get(`SELECT * FROM voices WHERE id = ? AND deleted_at IS NULL`, id);
	}

	async deleteVoice(id) {
		const db = await this.dbPromise;
		await db.run(`UPDATE voices SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`, id);
	}

	async updatePassword(userId, newPasswordHash) {
		const db = await this.dbPromise;
		await db.run(`UPDATE users SET password_hash = ? WHERE id = ? AND deleted_at IS NULL`, newPasswordHash, userId);
		return true;
	}
}


