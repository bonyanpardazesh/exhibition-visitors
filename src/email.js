import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables (in case they weren't loaded before)
dotenv.config({ path: './config.env' });

// Email Configuration
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = process.env.EMAIL_PORT || 587;
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER;

// Debug: Log configuration (without password)
console.log('Email Config:', {
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    user: EMAIL_USER,
    from: EMAIL_FROM,
    hasPassword: !!EMAIL_PASS
});

// Create transporter only if credentials are provided
let transporter = null;
if (EMAIL_USER && EMAIL_PASS) {
    transporter = nodemailer.createTransport({
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: false, // true for 465, false for other ports
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false // For development only
        }
    });

    // Verify email configuration on startup (non-blocking)
    transporter.verify().then(() => {
        console.log('✓ Email server is ready to send messages');
    }).catch((error) => {
        console.warn('⚠ Email configuration warning:', error.message);
    });
} else {
    console.warn('⚠ Email credentials not configured. Email sending will be disabled.');
}

/**
 * Send welcome email to visitor
 * @param {string} emailAddress - Visitor's email address
 * @param {string} visitorName - Visitor's full name
 * @param {string} exhibitionName - Name of the exhibition
 * @returns {Promise<Object>} - Email sending result
 */
export async function sendVisitorEmail(emailAddress, visitorName, exhibitionName = 'Bonyan Group') {
    try {
        // Check if transporter is configured
        if (!transporter) {
            return {
                success: false,
                error: 'Email transporter not configured. Please check EMAIL_USER and EMAIL_PASS in config.env',
                email: emailAddress
            };
        }

        // Validate email format
        if (!isValidEmail(emailAddress)) {
            return {
                success: false,
                error: 'Invalid email format',
                email: emailAddress
            };
        }

        const mailOptions = {
            from: `"${exhibitionName}" <${EMAIL_FROM}>`,
            to: emailAddress,
            subject: `Welcome to ${exhibitionName}!`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #0ea5e9; margin-bottom: 20px;">Welcome ${visitorName}!</h2>
                    <p style="font-size: 16px; line-height: 1.6; color: #333;">
                        Thank you for registering for <strong>${exhibitionName}</strong>.
                    </p>
                    <p style="font-size: 16px; line-height: 1.6; color: #333;">
                        We are delighted to have you join us and look forward to seeing you at the event.
                    </p>
                    <p style="font-size: 16px; line-height: 1.6; color: #333;">
                        If you have any questions or need assistance, please don't hesitate to contact us.
                    </p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    <p style="font-size: 14px; color: #64748b; margin-top: 20px;">
                        Best regards,<br>
                        <strong>${exhibitionName} Team</strong>
                    </p>
                </div>
            `,
            text: `Welcome ${visitorName}! Thank you for registering for ${exhibitionName}. We look forward to seeing you at the event.`
        };

        const result = await transporter.sendMail(mailOptions);

        console.log(`Email sent successfully to ${emailAddress}:`, result.messageId);
        return {
            success: true,
            messageId: result.messageId,
            email: emailAddress
        };
    } catch (error) {
        console.error('Email sending failed:', error);
        return {
            success: false,
            error: error.message,
            email: emailAddress
        };
    }
}

/**
 * Send bulk emails to multiple visitors
 * @param {Array} visitors - Array of visitor objects with email and name
 * @param {string} exhibitionName - Name of the exhibition
 * @returns {Promise<Array>} - Array of email results
 */
export async function sendBulkEmails(visitors, exhibitionName = 'Bonyan Group Exhibition') {
    const results = [];
    
    for (const visitor of visitors) {
        if (visitor.email) {
            const result = await sendVisitorEmail(visitor.email, visitor.name, exhibitionName);
            results.push({
                visitorId: visitor.id,
                visitorName: visitor.name,
                ...result
            });
        }
    }
    
    return results;
}

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} - Whether email is valid
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Verify email transporter configuration
 * @returns {Promise<boolean>} - Whether email configuration is valid
 */
export async function verifyEmailConfig() {
    try {
        await transporter.verify();
        console.log('Email server is ready to send messages');
        return true;
    } catch (error) {
        console.error('Email configuration error:', error);
        return false;
    }
}
