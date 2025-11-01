# Exhibition Visitors Management System

A modern web application for managing exhibition visitors with features including visitor registration, photo capture, voice notes, automatic SMS and email notifications, and data export capabilities.

## Features

- 🎨 **Modern UI/UX**: Clean, professional design with glass morphism effects
- 🌐 **Multilingual**: Full support for Farsi (FA) and English (EN)
- 👥 **Visitor Management**: Complete CRUD operations for visitor profiles
- 📸 **Photo Management**: Upload and manage multiple photos per visitor
- 📧 **Auto Notifications**: Automatic SMS and email sending via SMS.ir and SMTP
- 📊 **Data Export**: Export visitor data to Excel format
- 🔐 **Secure Authentication**: Session-based authentication system
- 🌍 **Network Accessible**: Configured to run on custom port with network access

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **File Upload**: Multer
- **Authentication**: Express-session, Bcrypt
- **Notifications**: SMS.ir API, Nodemailer

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/bonyanpardazesh/exhibition-visitors.git
cd exhibition-visitors
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp config.env.example config.env
```

4. Edit `config.env` with your credentials:
   - SMS.ir API key and line number
   - Email SMTP settings (Gmail App Password recommended)

## Running the Application

Start the server:
```bash
npm start
```

The application will be available at:
- Local: `http://localhost:2030`
- Network: `http://<your-ip>:2030`

Default credentials (change after first login):
- Username: `admin`
- Password: `admin`

## Configuration

### Port Configuration
The application runs on port 2030 by default (configurable in `config.env`).

### Network Access
The server is configured to accept connections from other devices on your network by listening on `0.0.0.0`.

### Language Switching
Toggle between Farsi (FA) and English (EN) using the language switcher in the header.

## Project Structure

```
Exhibition/
├── public/           # Frontend files
│   ├── i18n/        # Translation files (FA/EN)
│   ├── images/      # Static images
│   └── partials/    # HTML partials
├── src/             # Backend source files
├── data/            # Database files (gitignored)
├── uploads/         # Uploaded files (gitignored)
├── config.env       # Environment variables (gitignored)
└── server.js        # Main server file
```

## Security Notes

- ⚠️ Never commit `config.env` - it contains sensitive credentials
- ⚠️ Change default admin credentials in production
- ⚠️ Use strong session secrets in production
- ⚠️ Configure firewall rules for network access

## License

This project is proprietary software.

## Contact

For issues and questions, please contact: bonyanpardazesh@gmail.com

