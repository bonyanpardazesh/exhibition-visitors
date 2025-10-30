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
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				deleted_at DATETIME
			);
			CREATE TABLE IF NOT EXISTS visitors (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				first_name TEXT NOT NULL,
				last_name TEXT NOT NULL,
				academic_degree TEXT,
				job_position TEXT,
				note TEXT,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				deleted_at DATETIME
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
			ALTER TABLE visitors ADD COLUMN job_position TEXT;
		`).catch(()=>{});
	}

	async getUserByUsername(username) {
		const db = await this.dbPromise;
		return db.get(`SELECT * FROM users WHERE username = ? AND deleted_at IS NULL`, username);
	}

	async getUserById(id) {
		const db = await this.dbPromise;
		return db.get(`SELECT id, username, created_at FROM users WHERE id = ? AND deleted_at IS NULL`, id);
	}

	async createUser(username, passwordHash) {
		const db = await this.dbPromise;
		const res = await db.run(`INSERT INTO users (username, password_hash) VALUES (?, ?)`, username, passwordHash);
		return db.get(`SELECT id, username, created_at FROM users WHERE id = ?`, res.lastID);
	}

	async listVisitors() {
		const db = await this.dbPromise;
		const rows = await db.all(`
			SELECT v.*, (
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
			WHERE v.deleted_at IS NULL
			ORDER BY v.created_at DESC
		`);
		return rows.map(r => ({
			...r,
			contacts: r.contacts ? JSON.parse(r.contacts) : [],
			photos: r.photos ? JSON.parse(r.photos) : [],
			voices: r.voices ? JSON.parse(r.voices) : [],
		}));
	}

	async getVisitor(id) {
		const db = await this.dbPromise;
		const v = await db.get(`SELECT * FROM visitors WHERE id = ? AND deleted_at IS NULL`, id);
		if (!v) return null;
		const contacts = await db.all(`SELECT * FROM contacts WHERE visitor_id = ? AND deleted_at IS NULL`, id);
		const photos = await db.all(`SELECT id, filename, url, original_name AS originalName FROM photos WHERE visitor_id = ? AND deleted_at IS NULL`, id);
		const voices = await db.all(`SELECT id, filename, url, mime_type AS mimeType, duration_ms AS durationMs FROM voices WHERE visitor_id = ? AND deleted_at IS NULL`, id);
		return { ...v, contacts, photos, voices };
	}

	async createVisitor(body) {
		const { first_name, last_name, academic_degree, job_position, note, contacts = [] } = body;
		if (!first_name || !last_name) throw new Error('first_name and last_name are required');
		const db = await this.dbPromise;
		const result = await db.run(`INSERT INTO visitors (first_name, last_name, academic_degree, job_position, note) VALUES (?, ?, ?, ?, ?)`, first_name, last_name, academic_degree || null, job_position || null, note || null);
		const id = result.lastID;
		for (const c of contacts) {
			await db.run(`INSERT INTO contacts (visitor_id, type, value, label) VALUES (?, ?, ?, ?)`, id, c.type, c.value, c.label || null);
		}
		return await this.getVisitor(id);
	}

	async updateVisitor(id, body) {
		const { first_name, last_name, academic_degree, job_position, note, contacts } = body;
		const db = await this.dbPromise;
		const current = await db.get(`SELECT * FROM visitors WHERE id = ?`, id);
		if (!current) throw new Error('Visitor not found');
		await db.run(`UPDATE visitors SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name), academic_degree = COALESCE(?, academic_degree), job_position = COALESCE(?, job_position), note = COALESCE(?, note), updated_at = CURRENT_TIMESTAMP WHERE id = ?`, first_name ?? null, last_name ?? null, academic_degree ?? null, job_position ?? null, note ?? null, id);
		if (Array.isArray(contacts)) {
		// soft-delete existing contacts then insert new ones
		await db.run(`UPDATE contacts SET deleted_at = CURRENT_TIMESTAMP WHERE visitor_id = ? AND deleted_at IS NULL`, id);
			for (const c of contacts) {
				await db.run(`INSERT INTO contacts (visitor_id, type, value, label) VALUES (?, ?, ?, ?)`, id, c.type, c.value, c.label || null);
			}
		}
		return await this.getVisitor(id);
	}

	async deleteVisitor(id) {
		const db = await this.dbPromise;
		await db.run(`UPDATE visitors SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`, id);
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

	async deleteVoice(id) {
		const db = await this.dbPromise;
		await db.run(`UPDATE voices SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`, id);
	}
}


