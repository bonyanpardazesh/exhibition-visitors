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
	await db.createUser('admin', hash, 'admin');
	console.log('Seeded default admin: admin / admin123 (role: admin)');
} else {
	// Ensure existing admin user has admin role
	if (existingAdmin.role !== 'admin') {
		await db.updateUserRole(existingAdmin.id, 'admin');
		console.log('Updated existing admin user to have admin role');
	}
}

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Auth helpers
function requireAuth(req, res, next) {
	if (req.session && req.session.userId) return next();
	return res.status(401).json({ error: 'Unauthorized' });
}

async function requireAdmin(req, res, next) {
	if (!req.session || !req.session.userId) {
		return res.status(401).json({ error: 'Unauthorized' });
	}
	const user = await db.getUserById(req.session.userId);
	if (!user || user.role !== 'admin') {
		return res.status(403).json({ error: 'Forbidden: Admin access required' });
	}
	next();
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

// User management endpoints (admin only)
app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
	try {
		const users = await db.listUsers();
		res.json(users);
	} catch (e) {
		res.status(500).json({ error: e.message });
	}
});

app.post('/api/users', requireAuth, requireAdmin, async (req, res) => {
	try {
		const { username, password, role } = req.body || {};
		if (!username || !password) {
			return res.status(400).json({ error: 'Username and password are required' });
		}
		if (password.length < 6) {
			return res.status(400).json({ error: 'Password must be at least 6 characters long' });
		}
		if (role && !['admin', 'user'].includes(role)) {
			return res.status(400).json({ error: 'Invalid role. Must be "admin" or "user"' });
		}
		
		// Check if username already exists
		const existingUser = await db.getUserByUsername(username);
		if (existingUser) {
			return res.status(400).json({ error: 'Username already exists' });
		}
		
		const passwordHash = await bcrypt.hash(password, 10);
		const userRole = role || 'user';
		const newUser = await db.createUser(username, passwordHash, userRole);
		res.status(201).json(newUser);
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

app.put('/api/users/:id/role', requireAuth, requireAdmin, async (req, res) => {
	try {
		const { role } = req.body || {};
		if (!role || !['admin', 'user'].includes(role)) {
			return res.status(400).json({ error: 'Invalid role. Must be "admin" or "user"' });
		}
		const userId = Number(req.params.id);
		if (userId === req.session.userId) {
			return res.status(400).json({ error: 'Cannot change your own role' });
		}
		const updated = await db.updateUserRole(userId, role);
		res.json(updated);
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

app.post('/api/users/:id/password', requireAuth, requireAdmin, async (req, res) => {
	try {
		const { password } = req.body || {};
		if (!password || password.length < 6) {
			return res.status(400).json({ error: 'Password must be at least 6 characters long' });
		}
		const userId = Number(req.params.id);
		const newPasswordHash = await bcrypt.hash(password, 10);
		await db.setUserPassword(userId, newPasswordHash);
		res.json({ success: true, message: 'Password updated successfully' });
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

app.post('/api/change-password', requireAuth, async (req, res) => {
	try {
		const { currentPassword, newPassword } = req.body || {};
		if (!currentPassword || !newPassword) {
			return res.status(400).json({ error: 'Current password and new password are required', errorKey: 'profile.missingFields' });
		}
		if (newPassword.length < 6) {
			return res.status(400).json({ error: 'New password must be at least 6 characters long', errorKey: 'profile.passwordTooShort' });
		}
		
		const userId = req.session.userId;
		const userInfo = await db.getUserById(userId);
		if (!userInfo) {
			return res.status(404).json({ error: 'User not found', errorKey: 'profile.userNotFound' });
		}
		const user = await db.getUserByUsername(userInfo.username);
		if (!user) {
			return res.status(404).json({ error: 'User not found', errorKey: 'profile.userNotFound' });
		}
		
		// Verify current password
		const isValid = await bcrypt.compare(currentPassword, user.password_hash);
		if (!isValid) {
			return res.status(401).json({ error: 'Current password is incorrect', errorKey: 'profile.incorrectPassword' });
		}
		
		// Hash new password
		const newPasswordHash = await bcrypt.hash(newPassword, 10);
		await db.updatePassword(userId, newPasswordHash);
		
		res.json({ success: true, message: 'Password changed successfully' });
	} catch (e) {
		console.error('Password change error:', e);
		res.status(500).json({ error: e.message || 'Failed to change password', errorKey: 'profile.passwordChangeFailed' });
	}
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
	function takeBoolean(field){
		if (body[field] === undefined) return undefined;
		return Boolean(body[field]);
	}
	const firstName = takeString('first_name', 100);
	const lastName = takeString('last_name', 100);
	const companyName = takeString('company_name', 100);
	const jobPosition = takeString('job_position', 100);
	const fieldOfActivity = takeString('field_of_activity', 200);
	const answer1 = takeString('answer1', 500);
	const answer3 = takeString('answer3', 500);
	const note = takeString('note', 500);
	
	// Boolean fields
	const isManufacturer = takeBoolean('is_manufacturer');
	const isTrader = takeBoolean('is_trader');
	const isDistributor = takeBoolean('is_distributor');
	const unsaturatedPolyester = takeBoolean('unsaturated_polyester');
	const alkydResinLong = takeBoolean('alkyd_resin_long');
	const alkydResinMedium = takeBoolean('alkyd_resin_medium');
	const alkydResinShort = takeBoolean('alkyd_resin_short');
	const dryingAgent = takeBoolean('drying_agent');
	const answer2 = takeBoolean('answer2');
	
	if (!isUpdate) {
		if (!firstName) errors.push('first_name is required');
		if (!lastName) errors.push('last_name is required');
	}
	if (firstName !== undefined) sanitized.first_name = firstName;
	if (lastName !== undefined) sanitized.last_name = lastName;
	
	// Always include optional fields (for creates, set to null if not provided)
	if (companyName !== undefined) {
		sanitized.company_name = companyName || null;
	} else if (!isUpdate) {
		sanitized.company_name = null;
	}
	if (jobPosition !== undefined) {
		sanitized.job_position = jobPosition || null;
	} else if (!isUpdate) {
		sanitized.job_position = null;
	}
	if (fieldOfActivity !== undefined) {
		sanitized.field_of_activity = fieldOfActivity || null;
	} else if (!isUpdate) {
		sanitized.field_of_activity = null;
	}
	
	// Boolean checkbox fields
	if (isManufacturer !== undefined) sanitized.is_manufacturer = isManufacturer;
	else if (!isUpdate) sanitized.is_manufacturer = false;
	if (isTrader !== undefined) sanitized.is_trader = isTrader;
	else if (!isUpdate) sanitized.is_trader = false;
	if (isDistributor !== undefined) sanitized.is_distributor = isDistributor;
	else if (!isUpdate) sanitized.is_distributor = false;
	if (unsaturatedPolyester !== undefined) sanitized.unsaturated_polyester = unsaturatedPolyester;
	else if (!isUpdate) sanitized.unsaturated_polyester = false;
	if (alkydResinLong !== undefined) sanitized.alkyd_resin_long = alkydResinLong;
	else if (!isUpdate) sanitized.alkyd_resin_long = false;
	if (alkydResinMedium !== undefined) sanitized.alkyd_resin_medium = alkydResinMedium;
	else if (!isUpdate) sanitized.alkyd_resin_medium = false;
	if (alkydResinShort !== undefined) sanitized.alkyd_resin_short = alkydResinShort;
	else if (!isUpdate) sanitized.alkyd_resin_short = false;
	if (dryingAgent !== undefined) sanitized.drying_agent = dryingAgent;
	else if (!isUpdate) sanitized.drying_agent = false;
	if (answer2 !== undefined) sanitized.answer2 = answer2;
	else if (!isUpdate) sanitized.answer2 = false;
	
	// Answer fields
	if (answer1 !== undefined) sanitized.answer1 = answer1 || null;
	else if (!isUpdate) sanitized.answer1 = null;
	if (answer3 !== undefined) sanitized.answer3 = answer3 || null;
	else if (!isUpdate) sanitized.answer3 = null;
	
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
		const user = await db.getUserById(req.session.userId);
		const isAdmin = user && user.role === 'admin';
		const visitors = await db.listVisitors(req.session.userId, isAdmin);
		res.json(visitors);
	} catch (e) {
		res.status(500).json({ error: e.message });
	}
});

app.get('/api/visitors/:id', requireAuth, async (req, res) => {
	try {
		const user = await db.getUserById(req.session.userId);
		const isAdmin = user && user.role === 'admin';
		const visitor = await db.getVisitor(Number(req.params.id), req.session.userId, isAdmin);
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
		
		const created = await db.createVisitor(data, req.session.userId);
		
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
		const user = await db.getUserById(req.session.userId);
		const isAdmin = user && user.role === 'admin';
		const updated = await db.updateVisitor(Number(req.params.id), data, req.session.userId, isAdmin);
		res.json(updated);
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

app.delete('/api/visitors/:id', requireAuth, async (req, res) => {
	try {
		const user = await db.getUserById(req.session.userId);
		const isAdmin = user && user.role === 'admin';
		await db.deleteVisitor(Number(req.params.id), req.session.userId, isAdmin);
		res.status(204).end();
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

// Contacts CRUD (scoped to visitor)
app.post('/api/visitors/:id/contacts', requireAuth, async (req, res) => {
	try {
		const user = await db.getUserById(req.session.userId);
		const isAdmin = user && user.role === 'admin';
		// Verify access to visitor
		const visitor = await db.getVisitor(Number(req.params.id), req.session.userId, isAdmin);
		if (!visitor) return res.status(404).json({ error: 'Visitor not found' });
		const contact = await db.addContact(Number(req.params.id), req.body);
		res.status(201).json(contact);
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

app.put('/api/contacts/:contactId', requireAuth, async (req, res) => {
	try {
		// Check access via visitor ownership
		const contact = await db.getContact(Number(req.params.contactId));
		if (!contact) return res.status(404).json({ error: 'Contact not found' });
		const user = await db.getUserById(req.session.userId);
		const isAdmin = user && user.role === 'admin';
		const visitor = await db.getVisitor(contact.visitor_id, req.session.userId, isAdmin);
		if (!visitor) return res.status(404).json({ error: 'Visitor not found' });
		const updated = await db.updateContact(Number(req.params.contactId), req.body);
		res.json(updated);
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

app.delete('/api/contacts/:contactId', requireAuth, async (req, res) => {
	try {
		// Check access via visitor ownership
		const contact = await db.getContact(Number(req.params.contactId));
		if (!contact) return res.status(404).json({ error: 'Contact not found' });
		const user = await db.getUserById(req.session.userId);
		const isAdmin = user && user.role === 'admin';
		const visitor = await db.getVisitor(contact.visitor_id, req.session.userId, isAdmin);
		if (!visitor) return res.status(404).json({ error: 'Visitor not found' });
		await db.deleteContact(Number(req.params.contactId));
		res.status(204).end();
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

// Photos upload and management
app.post('/api/visitors/:id/photos', requireAuth, upload.array('photos', 10), async (req, res) => {
	try {
		const user = await db.getUserById(req.session.userId);
		const isAdmin = user && user.role === 'admin';
		// Verify access to visitor
		const visitor = await db.getVisitor(Number(req.params.id), req.session.userId, isAdmin);
		if (!visitor) return res.status(404).json({ error: 'Visitor not found' });
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
		const user = await db.getUserById(req.session.userId);
		const isAdmin = user && user.role === 'admin';
		// Verify access to visitor
		const visitor = await db.getVisitor(photo.visitor_id, req.session.userId, isAdmin);
		if (!visitor) return res.status(404).json({ error: 'Visitor not found' });
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
        const user = await db.getUserById(req.session.userId);
        const isAdmin = user && user.role === 'admin';
        // Verify access to visitor
        const visitor = await db.getVisitor(Number(req.params.id), req.session.userId, isAdmin);
        if (!visitor) return res.status(404).json({ error: 'Visitor not found' });
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
        const voice = await db.getVoice(Number(req.params.voiceId));
        if (!voice) return res.status(404).json({ error: 'Not found' });
        const user = await db.getUserById(req.session.userId);
        const isAdmin = user && user.role === 'admin';
        // Verify access to visitor
        const visitor = await db.getVisitor(voice.visitor_id, req.session.userId, isAdmin);
        if (!visitor) return res.status(404).json({ error: 'Visitor not found' });
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


