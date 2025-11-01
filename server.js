import dotenv from 'dotenv';
// Load environment variables FIRST before any other imports
dotenv.config({ path: './config.env' });

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Database } from './src/db.js';
import { sendVisitorSMS, validatePhoneNumber } from './src/sms.js';
import { sendVisitorEmail, isValidEmail } from './src/email.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure required directories exist
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// Multer storage for multiple images per visitor
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, uploadsDir);
	},
	filename: function (req, file, cb) {
		const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
		const ext = path.extname(file.originalname || '') || '';
		cb(null, unique + ext);
	},
});
const upload = multer({ storage });

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));
app.use(session({
	secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
	resave: false,
	saveUninitialized: false,
	cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 }
}));

// Initialize DB
const dbPath = path.join(dataDir, 'app.sqlite');
const db = new Database(dbPath);
await db.migrate();

// Seed default admin if none
const existingAdmin = await db.getUserByUsername('admin');
if (!existingAdmin) {
	const hash = await bcrypt.hash('admin123', 10);
	await db.createUser('admin', hash);
	console.log('Seeded default admin: admin / admin123');
}

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Auth helpers
function requireAuth(req, res, next) {
	if (req.session && req.session.userId) return next();
	return res.status(401).json({ error: 'Unauthorized' });
}

app.post('/api/login', async (req, res) => {
	const { username, password } = req.body || {};
	if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
	const user = await db.getUserByUsername(username);
	if (!user) return res.status(401).json({ error: 'Invalid credentials' });
	const ok = await bcrypt.compare(password, user.password_hash);
	if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
	req.session.userId = user.id;
	res.json({ id: user.id, username });
});

app.post('/api/logout', (req, res) => {
	req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', async (req, res) => {
	if (!req.session || !req.session.userId) return res.status(200).json(null);
	const user = await db.getUserById(req.session.userId);
	res.json(user || null);
});

// Validation helpers
const CONTACT_TYPES = new Set(['email','phone','address','website']);
function isValidPhone(v){
    const digits = String(v).replace(/09(1[0-9]|3[1-9]|2[1-9])-?[0-9]{3}-?[0-9]{4}/g, '');
    return digits.length >= 10 && digits.length <= 14;
}
function isValidUrl(v){
	try { const u = new URL(v.startsWith('http')? v : 'https://' + v); return !!u.hostname; } catch { return false; }
}
function validateVisitorPayload(body, { isUpdate = false } = {}){
	const errors = [];
	const sanitized = {};
	function takeString(field, max=100){
		if (body[field] === undefined || body[field] === null) return undefined;
		const val = String(body[field]).trim();
		if (val.length === 0) return '';
		return val.slice(0, max);
	}
	const firstName = takeString('first_name', 100);
	const lastName = takeString('last_name', 100);
	const academicDegree = takeString('academic_degree', 100);
	const jobPosition = takeString('job_position', 100);
	const note = takeString('note', 500);
	if (!isUpdate) {
		if (!firstName) errors.push('first_name is required');
		if (!lastName) errors.push('last_name is required');
	}
	if (firstName !== undefined) sanitized.first_name = firstName;
	if (lastName !== undefined) sanitized.last_name = lastName;
	// Always include optional fields (for creates, set to null if not provided)
	if (academicDegree !== undefined) {
		sanitized.academic_degree = academicDegree || null;
	} else if (!isUpdate) {
		sanitized.academic_degree = null;
	}
	if (jobPosition !== undefined) {
		sanitized.job_position = jobPosition || null;
	} else if (!isUpdate) {
		sanitized.job_position = null;
	}
	if (note !== undefined) sanitized.note = note || null;

	let contacts = body.contacts;
	if (contacts !== undefined) {
		if (!Array.isArray(contacts)) {
			errors.push('contacts must be an array');
		} else {
			const out = [];
			for (const c of contacts) {
				const type = String((c && c.type) || '').trim().toLowerCase();
				const value = String((c && c.value) || '').trim().slice(0,255);
				const label = c && c.label ? String(c.label).trim().slice(0,100) : null;
				if (!CONTACT_TYPES.has(type)) { errors.push(`invalid contact type: ${type}`); continue; }
				if (!value) { errors.push(`contact value required for ${type}`); continue; }
				if (type === 'email' && !isValidEmail(value)) errors.push(`invalid email: ${value}`);
				if (type === 'phone' && !isValidPhone(value)) errors.push(`invalid phone: ${value}`);
				if (type === 'website' && !isValidUrl(value)) errors.push(`invalid website: ${value}`);
				out.push({ type, value, label });
			}
			sanitized.contacts = out;
		}
	}

	return { ok: errors.length === 0, errors, data: sanitized };
}

// Visitors CRUD
app.get('/api/visitors', requireAuth, async (req, res) => {
	try {
		const visitors = await db.listVisitors();
		res.json(visitors);
	} catch (e) {
		res.status(500).json({ error: e.message });
	}
});

app.get('/api/visitors/:id', requireAuth, async (req, res) => {
	try {
		const visitor = await db.getVisitor(Number(req.params.id));
		if (!visitor) return res.status(404).json({ error: 'Not found' });
		res.json(visitor);
	} catch (e) {
		res.status(500).json({ error: e.message });
	}
});

app.post('/api/visitors', requireAuth, async (req, res) => {
	try {
		const { ok, errors, data } = validateVisitorPayload(req.body, { isUpdate: false });
		if (!ok) return res.status(400).json({ error: 'Validation failed', details: errors });
		
		const created = await db.createVisitor(data);
		
		// Send SMS if visitor has a phone number
		const contacts = created.contacts || [];
		const phoneContact = contacts.find(contact => contact.type === 'phone');
		
		if (phoneContact && phoneContact.value) {
			const visitorName = `${created.first_name} ${created.last_name}`;
			
			// Validate phone number before sending SMS
			if (validatePhoneNumber(phoneContact.value)) {
				try {
					const smsResult = await sendVisitorSMS(phoneContact.value, visitorName);
					console.log('SMS sending result:', smsResult);
					
					// Add SMS result to response
					created.smsSent = smsResult.success;
					if (!smsResult.success) {
						created.smsError = smsResult.error;
					}
				} catch (smsError) {
					console.error('SMS sending failed:', smsError);
					created.smsSent = false;
					created.smsError = smsError.message;
				}
			} else {
				console.log('Invalid phone number format, skipping SMS:', phoneContact.value);
				created.smsSent = false;
				created.smsError = 'Invalid phone number format';
			}
		}
		
		// Send Email if visitor has an email address
		const emailContact = contacts.find(contact => contact.type === 'email');
		
		if (emailContact && emailContact.value) {
			const visitorName = `${created.first_name} ${created.last_name}`;
			
			// Validate email before sending
			if (isValidEmail(emailContact.value)) {
				try {
					const emailResult = await sendVisitorEmail(emailContact.value, visitorName);
					console.log('Email sending result:', emailResult);
					
					// Add Email result to response
					created.emailSent = emailResult.success;
					if (!emailResult.success) {
						created.emailError = emailResult.error;
					}
				} catch (emailError) {
					console.error('Email sending failed:', emailError);
					created.emailSent = false;
					created.emailError = emailError.message;
				}
			} else {
				console.log('Invalid email format, skipping email:', emailContact.value);
				created.emailSent = false;
				created.emailError = 'Invalid email format';
			}
		}
		
		res.status(201).json(created);
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

app.put('/api/visitors/:id', requireAuth, async (req, res) => {
	try {
		const { ok, errors, data } = validateVisitorPayload(req.body, { isUpdate: true });
		if (!ok) return res.status(400).json({ error: 'Validation failed', details: errors });
		const updated = await db.updateVisitor(Number(req.params.id), data);
		res.json(updated);
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

app.delete('/api/visitors/:id', requireAuth, async (req, res) => {
	try {
		await db.deleteVisitor(Number(req.params.id));
		res.status(204).end();
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

// Contacts CRUD (scoped to visitor)
app.post('/api/visitors/:id/contacts', requireAuth, async (req, res) => {
	try {
		const contact = await db.addContact(Number(req.params.id), req.body);
		res.status(201).json(contact);
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

app.put('/api/contacts/:contactId', requireAuth, async (req, res) => {
	try {
		const contact = await db.updateContact(Number(req.params.contactId), req.body);
		res.json(contact);
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

app.delete('/api/contacts/:contactId', requireAuth, async (req, res) => {
	try {
		await db.deleteContact(Number(req.params.contactId));
		res.status(204).end();
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

// Photos upload and management
app.post('/api/visitors/:id/photos', requireAuth, upload.array('photos', 10), async (req, res) => {
	try {
		const files = req.files || [];
		const records = await db.addPhotos(Number(req.params.id), files.map(f => ({
			filename: f.filename,
			url: `/uploads/${f.filename}`,
			originalName: f.originalname || null,
		})));
		res.status(201).json(records);
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

app.delete('/api/photos/:photoId', requireAuth, async (req, res) => {
	try {
		const photo = await db.getPhoto(Number(req.params.photoId));
		if (!photo) return res.status(404).json({ error: 'Not found' });
		// Soft delete only; keep file on disk
		await db.deletePhoto(photo.id);
		res.status(204).end();
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

// Voice upload and management
app.post('/api/visitors/:id/voice', requireAuth, upload.single('voice'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No voice file uploaded' });
        const durationMs = Number(req.body.durationMs) || null;
        const record = await db.addVoice(Number(req.params.id), {
            filename: file.filename,
            url: `/uploads/${file.filename}`,
            mimeType: file.mimetype || null,
            durationMs
        });
        res.status(201).json(record);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.delete('/api/voices/:voiceId', requireAuth, async (req, res) => {
    try {
        await db.deleteVoice(Number(req.params.voiceId));
        res.status(204).end();
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// SMS endpoints
app.post('/api/sms/send', requireAuth, async (req, res) => {
	try {
		const { phoneNumber, visitorName, exhibitionName } = req.body;
		
		if (!phoneNumber || !visitorName) {
			return res.status(400).json({ error: 'Phone number and visitor name are required' });
		}
		
		if (!validatePhoneNumber(phoneNumber)) {
			return res.status(400).json({ error: 'Invalid phone number format' });
		}
		
		const result = await sendVisitorSMS(phoneNumber, visitorName, exhibitionName);
		res.json(result);
	} catch (e) {
		res.status(500).json({ error: e.message });
	}
});

app.get('/api/sms/test', requireAuth, async (req, res) => {
	try {
		const testPhone = req.query.phone;
		if (!testPhone) {
			return res.status(400).json({ error: 'Phone number required as query parameter' });
		}
		
		const result = await sendVisitorSMS(testPhone, 'Test Visitor', 'Test Exhibition');
		res.json(result);
	} catch (e) {
		res.status(500).json({ error: e.message });
	}
});

// Email endpoints
app.post('/api/email/send', requireAuth, async (req, res) => {
	try {
		const { emailAddress, visitorName, exhibitionName } = req.body;
		
		if (!emailAddress || !visitorName) {
			return res.status(400).json({ error: 'Email address and visitor name are required' });
		}
		
		if (!isValidEmail(emailAddress)) {
			return res.status(400).json({ error: 'Invalid email format' });
		}
		
		const result = await sendVisitorEmail(emailAddress, visitorName, exhibitionName);
		res.json(result);
	} catch (e) {
		res.status(500).json({ error: e.message });
	}
});

app.get('/api/email/test', requireAuth, async (req, res) => {
	try {
		const testEmail = req.query.email;
		if (!testEmail) {
			return res.status(400).json({ error: 'Email address required as query parameter' });
		}
		
		const result = await sendVisitorEmail(testEmail, 'Test Visitor', 'Test Exhibition');
		res.json(result);
	} catch (e) {
		res.status(500).json({ error: e.message });
	}
});

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 2030;
app.listen(PORT, '0.0.0.0', () => {
	console.log(`\n🚀 Server listening on http://0.0.0.0:${PORT}`);
	console.log(`🌐 Accessible from network at: http://<your-ip>:${PORT}`);
	console.log('📧 Email functionality enabled');
	console.log('📱 SMS functionality enabled');
	console.log('\n⚠️  Configure credentials in config.env for full functionality\n');
});


