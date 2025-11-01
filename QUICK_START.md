# 🚀 Quick Start Guide - Exhibition Visitors

## Prerequisites

1. **Node.js** installed (v14 or higher)
   - Check: `node --version`
   - Download: https://nodejs.org/

2. **npm** (comes with Node.js)
   - Check: `npm --version`

## Step-by-Step Setup

### 1. Install Dependencies

Open terminal in the project directory and run:

```bash
npm install
```

This installs all required packages (Express, SQLite, etc.)

### 2. Configure Environment (Optional)

The app will work with default settings, but you can customize `config.env`:

- **Port:** Default is 3000
- **SMS:** Already configured for SMS.ir
- **Email:** Configure your Gmail credentials if needed
- **Session Secret:** Change for production use

### 3. Run the Application

```bash
npm start
```

Or use the dev script:

```bash
npm run dev
```

### 4. Access the Application

Open your browser and go to:

```
http://localhost:3000
```

## Default Login Credentials

- **Username:** `admin`
- **Password:** `admin123`

⚠️ **Important:** Change these in production!

## First Steps

1. **Login** with the default credentials
2. **Create a visitor** by clicking "New Visitor"
3. **View all visitors** in the Visitors list
4. **Export data** to Excel using the export button

## Troubleshooting

### Port Already in Use

If port 3000 is busy, change it in `config.env`:
```
PORT=3001
```

### Database Issues

The database is created automatically at:
```
data/app.sqlite
```

If you need to reset, delete this file and restart the server.

### Module Not Found Errors

Make sure dependencies are installed:
```bash
npm install
```

## Development Commands

```bash
# Start server
npm start          # or npm run dev

# Check Node version
node --version

# Check npm version
npm --version
```

## What You'll See

When the server starts, you should see:

```
🚀 Server listening on http://localhost:3000
📧 Email functionality enabled
📱 SMS functionality enabled

⚠️  Configure credentials in config.env for full functionality
```

## Testing the Application

1. **Login Page:** http://localhost:3000/login.html
2. **Home Page:** http://localhost:3000/
3. **Visitors List:** http://localhost:3000/visitors.html
4. **Create Visitor:** http://localhost:3000/visitor.html

## Next Steps

- Configure email settings in `config.env` for email notifications
- Customize SMS messages in `src/sms.js`
- Change the default admin password for security
- Review `PROJECT_STRUCTURE_REVIEW.md` for development guidance

## Need Help?

- Check `PROJECT_STRUCTURE_REVIEW.md` for detailed project information
- Review `UI_REDESIGN_SUMMARY.md` for UI/UX changes
- Check server logs in terminal for errors

---

**Happy Coding! 🎉**

