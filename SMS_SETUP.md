# SMS Integration Setup Guide

This guide will help you set up SMS functionality for the Exhibition Visitors app using Twilio.

## Prerequisites

1. A Twilio account (sign up at https://www.twilio.com/)
2. A Twilio phone number
3. Node.js installed

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Get Twilio Credentials

1. Go to your [Twilio Console](https://console.twilio.com/)
2. Find your Account SID and Auth Token on the main dashboard
3. Purchase a phone number from Twilio (if you don't have one)

### 3. Configure Environment Variables

1. Copy `config.env` to `.env` (or edit `config.env` directly)
2. Replace the placeholder values with your actual Twilio credentials:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### 4. Test SMS Functionality

1. Start the server:
```bash
npm start
```

2. Test SMS sending:
```bash
# Test with a phone number (replace with your actual number)
curl "http://localhost:3000/api/sms/test?phone=+1234567890"
```

## How It Works

### Automatic SMS Sending

When a visitor is registered with a phone number:
1. The system validates the phone number format
2. Sends a welcome SMS automatically
3. Returns SMS status in the API response

### SMS Message Format

```
Welcome [Visitor Name]! Thank you for registering for [Exhibition Name]. We look forward to seeing you at the event.
```

### API Endpoints

- `POST /api/visitors` - Creates visitor and sends SMS if phone number provided
- `POST /api/sms/send` - Manually send SMS
- `GET /api/sms/test?phone=+1234567890` - Test SMS functionality

### Phone Number Format

- Supports international format: `+1234567890`
- Automatically formats numbers without country code
- Validates phone number before sending

## Troubleshooting

### Common Issues

1. **"Invalid phone number format"**
   - Ensure phone number includes country code
   - Use international format: `+1234567890`

2. **"SMS sending failed"**
   - Check Twilio credentials in config.env
   - Verify Twilio account has sufficient balance
   - Check Twilio phone number is active

3. **"Account SID not found"**
   - Verify TWILIO_ACCOUNT_SID is correct
   - Check for extra spaces or characters

### Testing

Use the test endpoint to verify SMS functionality:
```bash
curl "http://localhost:3000/api/sms/test?phone=+YOUR_PHONE_NUMBER"
```

## Cost Considerations

- Twilio charges per SMS sent
- Check Twilio pricing for your region
- Consider implementing rate limiting for production use

## Security Notes

- Keep your Twilio Auth Token secure
- Don't commit `.env` file to version control
- Use environment variables in production
