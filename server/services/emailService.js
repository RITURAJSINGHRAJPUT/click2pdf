const https = require('https');
const fs = require('fs');
const archiver = require('archiver');

const MAX_EMAIL_SIZE = 18 * 1024 * 1024;
const COMPRESS_THRESHOLD = 15 * 1024 * 1024;

function compressToZip(filePath, filename) {
    return new Promise((resolve, reject) => {
        const zipPath = filePath + '.zip';
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 6 } });
        output.on('close', () => resolve(zipPath));
        archive.on('error', reject);
        archive.pipe(output);
        archive.file(filePath, { name: filename });
        archive.finalize();
    });
}

/**
 * Calls the Brevo (Sendinblue) REST API to send an email.
 * Uses Node's built-in https module — no extra package needed.
 */
function brevoRequest(payload, apiKey) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const options = {
            hostname: 'api.brevo.com',
            path: '/v3/smtp/email',
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'accept': 'application/json',
                'api-key': apiKey,
                'content-length': Buffer.byteLength(body),
            },
        };

        console.log(`[Email] Initiating request to Brevo API...`);
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`[Email] Brevo API responded with status: ${res.statusCode}`);
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(data || '{}'));
                } else {
                    reject(new Error(`Brevo API error ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (err) => {
            console.error(`[Email] Request error: ${err.message}`);
            reject(err);
        });
        req.setTimeout(120000, () => {
            console.error(`[Email] Request timed out after 120s`);
            req.destroy();
            reject(new Error('Request timeout'));
        });
        req.write(body);
        req.end();
    });
}

/**
 * Sends a PDF email via Brevo's HTTP API.
 * Works on Render (no outbound SMTP required).
 * Free plan: 300 emails/day, send to any recipient once sender is verified.
 *
 * @param {string} toEmail - Recipient email
 * @param {string} pdfPath - Absolute path to the PDF
 * @param {string} filename - Attachment filename
 */
async function sendPdfEmail(toEmail, pdfPath, filename = 'filled-form.pdf', password = null) {
    if (!toEmail) throw new Error('Recipient email address is required');
    if (!fs.existsSync(pdfPath)) throw new Error('PDF file not found');

    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) throw new Error('BREVO_API_KEY environment variable is not set');

    const fromEmail = process.env.EMAIL_FROM || 'sparshnfc@gmail.com';
    const fromName = process.env.EMAIL_FROM_NAME || 'Intern Logbook';

    // File size / compression
    const fileStats = fs.statSync(pdfPath);
    const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
    let attachPath = pdfPath;
    let attachFilename = filename;
    let wasCompressed = false;

    if (fileStats.size > MAX_EMAIL_SIZE) {
        console.log(`[Email] File is ${fileSizeMB}MB, attempting ZIP compression...`);
        try {
            const zipPath = await compressToZip(pdfPath, filename);
            const zipStats = fs.statSync(zipPath);
            if (zipStats.size > MAX_EMAIL_SIZE) {
                fs.unlinkSync(zipPath);
                console.warn(`[Email] Skipped: file too large after compression.`);
                return { success: false, reason: 'File too large' };
            }
            attachPath = zipPath;
            attachFilename = filename.replace(/\.[^.]+$/, '') + '.zip';
            wasCompressed = true;
        } catch (compErr) {
            console.error('[Email] Compression failed:', compErr.message);
            return { success: false, reason: 'Compression failed' };
        }
    } else if (fileStats.size > COMPRESS_THRESHOLD) {
        try {
            const zipPath = await compressToZip(pdfPath, filename);
            attachPath = zipPath;
            attachFilename = filename.replace(/\.[^.]+$/, '') + '.zip';
            wasCompressed = true;
        } catch (compErr) {
            console.log('[Email] Compression failed, sending uncompressed.');
        }
    }

    const fileBuffer = fs.readFileSync(attachPath);
    const fileBase64 = fileBuffer.toString('base64');
    const mimeType = attachFilename.endsWith('.zip') ? 'application/zip' : 'application/pdf';

    const siteUrl = process.env.DOMAIN || 'https://click2pdf.in';
    const logoUrl = `${siteUrl}/assets/favicon_io/logo2.png`;

    const payload = {
        sender: { name: fromName, email: fromEmail },
        to: [{ email: toEmail }],
        subject: password ? '🔒 Your Secured PDF is Ready — Click2PDF' : '📄 Your PDF Document is Ready — Click2PDF',
        htmlContent: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f4f8; padding: 32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header with gradient -->
    <tr>
        <td style="background: linear-gradient(135deg, #4DD0E1 0%, #00ACC1 50%, #00838F 100%); padding: 32px 40px; text-align: center;">
            <img src="${logoUrl}" alt="Click2PDF" width="56" height="56" style="border-radius: 12px; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto;" />
            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Your Document is Ready</h1>
            <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Powered by Click2PDF</p>
        </td>
    </tr>

    <!-- Body -->
    <tr>
        <td style="padding: 36px 40px 20px;">
            <p style="margin: 0 0 16px; color: #1a202c; font-size: 16px; line-height: 1.6;">Hi there 👋</p>
            <p style="margin: 0 0 24px; color: #4a5568; font-size: 15px; line-height: 1.7;">
                Your filled PDF document has been generated and is attached to this email. ${wasCompressed ? '<br/><em style="color: #718096; font-size: 13px;">📦 The file was compressed into a ZIP archive due to its size.</em>' : ''}
            </p>

            ${password ? `
            <!-- Password Card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 28px;">
            <tr><td style="background: linear-gradient(135deg, #FFF8E1 0%, #FFF3CD 100%); border: 1px solid #FFD54F; border-radius: 12px; padding: 24px 28px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td width="36" valign="top"><span style="font-size: 24px;">🔐</span></td>
                    <td style="padding-left: 12px;">
                        <p style="margin: 0 0 4px; font-size: 14px; font-weight: 700; color: #E65100; text-transform: uppercase; letter-spacing: 1px;">Password Protected</p>
                        <p style="margin: 0 0 12px; color: #795548; font-size: 14px; line-height: 1.5;">Use this password to open your document:</p>
                        <table cellpadding="0" cellspacing="0"><tr>
                            <td style="background-color: #ffffff; border: 2px dashed #FFB300; border-radius: 8px; padding: 12px 24px;">
                                <code style="font-size: 22px; font-weight: 800; color: #E65100; letter-spacing: 3px; font-family: 'Courier New', Courier, monospace;">${password}</code>
                            </td>
                        </tr></table>
                        <p style="margin: 12px 0 0; color: #a1887f; font-size: 12px;">⚠️ Keep this password safe. You'll need it every time you open this file.</p>
                    </td>
                </tr>
                </table>
            </td></tr>
            </table>
            ` : ''}

            <!-- File Info -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 28px;">
            <tr><td style="background-color: #f7fafc; border-radius: 10px; padding: 16px 20px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td width="40" valign="top"><span style="font-size: 28px;">📎</span></td>
                    <td style="padding-left: 12px;">
                        <p style="margin: 0; font-size: 14px; font-weight: 600; color: #2d3748;">${attachFilename}</p>
                        <p style="margin: 4px 0 0; font-size: 12px; color: #a0aec0;">Attached to this email • ${fileSizeMB} MB</p>
                    </td>
                </tr>
                </table>
            </td></tr>
            </table>

            <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
                Need help? Just reply to this email or visit our <a href="${siteUrl}/contact.html" style="color: #4DD0E1; text-decoration: none; font-weight: 600;">support page</a>.
            </p>
        </td>
    </tr>

    <!-- Divider -->
    <tr><td style="padding: 0 40px;"><hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0;" /></td></tr>

    <!-- Footer -->
    <tr>
        <td style="padding: 24px 40px 32px; text-align: center;">
            <p style="margin: 0 0 8px; color: #a0aec0; font-size: 12px;">
                © ${new Date().getFullYear()} Sparsh Digital Solutions • <a href="${siteUrl}" style="color: #4DD0E1; text-decoration: none;">click2pdf.in</a>
            </p>
            <p style="margin: 0; color: #cbd5e0; font-size: 11px;">
                <a href="${siteUrl}/privacy-policy.html" style="color: #a0aec0; text-decoration: none;">Privacy</a> &nbsp;•&nbsp;
                <a href="${siteUrl}/return-policy.html" style="color: #a0aec0; text-decoration: none;">Terms</a> &nbsp;•&nbsp;
                <a href="${siteUrl}/contact.html" style="color: #a0aec0; text-decoration: none;">Contact</a>
            </p>
        </td>
    </tr>

</table>
</td></tr>
</table>
</body>
</html>
        `,
        attachment: [
            {
                name: attachFilename,
                content: fileBase64,
            },
        ],
    };

    try {
        const result = await brevoRequest(payload, apiKey);
        console.log(`Email sent successfully to ${toEmail}. Message ID: ${result.messageId}`);
        if (wasCompressed && attachPath !== pdfPath) fs.unlink(attachPath, () => { });
        return { success: true, messageId: result.messageId };
    } catch (error) {
        if (wasCompressed && attachPath !== pdfPath) fs.unlink(attachPath, () => { });
        console.error('Error sending email:', error.message);
        throw new Error(`Failed to send email: ${error.message}`);
    }
}

/**
 * Sends a payment verification notification email to the admin via Brevo's HTTP API.
 *
 * @param {Object} paymentData - Information about the payment request
 * @param {Object} file - The file object from Multer representing the uploaded screenshot
 */
async function sendPaymentNotificationToAdmin(paymentData, file) {
    const toEmail = process.env.ADMIN_EMAIL;
    if (!toEmail) {
        console.warn('⚠️ ADMIN_EMAIL is not set. Payment notification will not be sent.');
        return { success: false, reason: 'ADMIN_EMAIL not configured' };
    }

    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) throw new Error('BREVO_API_KEY environment variable is not set');

    const fromEmail = process.env.EMAIL_FROM || 'sparshnfc@gmail.com';
    const fromName = process.env.EMAIL_FROM_NAME || 'Intern Logbook';

    let attachment = [];

    // Process the uploaded screenshot if available
    if (file && file.path && fs.existsSync(file.path)) {
        try {
            const fileBuffer = fs.readFileSync(file.path);
            const fileBase64 = fileBuffer.toString('base64');
            // Assuming image based on multer config in payments.js
            const mimeType = file.mimetype || 'image/png';

            attachment.push({
                name: file.filename || 'payment-screenshot.png',
                content: fileBase64,
            });
        } catch (err) {
            console.error('[Email] Failed to process payment screenshot for email:', err.message);
            // We'll proceed without attachment rather than failing entirely, 
            // but we'll add a note in the HTML content below.
        }
    }

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #2b6cb0; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">New Payment Verification Request</h2>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold; width: 35%;">User Email:</td>
                    <td style="padding: 10px; border-bottom: 1px solid #edf2f7;">${paymentData.email || 'N/A'}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold;">User Name:</td>
                    <td style="padding: 10px; border-bottom: 1px solid #edf2f7;">${paymentData.displayName || 'N/A'}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold;">User ID:</td>
                    <td style="padding: 10px; border-bottom: 1px solid #edf2f7;">${paymentData.uid || 'N/A'}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold;">Transaction ID:</td>
                    <td style="padding: 10px; border-bottom: 1px solid #edf2f7; color: #c53030; font-family: monospace;">${paymentData.transactionId}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; font-weight: bold;">Submitted At:</td>
                    <td style="padding: 10px;">${new Date().toLocaleString()}</td>
                </tr>
            </table>

            <div style="margin-top: 30px; padding: 15px; background-color: #f7fafc; border-radius: 6px;">
                <p style="margin: 0; color: #4a5568; font-size: 14px;">
                    📝 <strong>Action Required:</strong> Please verify this payment using the attached screenshot in the admin dashboard and grant credits accordingly.
                </p>
                ${attachment.length === 0 ? '<p style="color: #e53e3e; font-size: 14px; margin-top: 10px;">⚠️ Note: The payment screenshot could not be attached to this email. Please log in to the admin panel to view it.</p>' : ''}
            </div>
        </div>
    `;

    const payload = {
        sender: { name: fromName, email: fromEmail },
        to: [{ email: toEmail }],
        subject: `Payment Verification Required - ${paymentData.email || paymentData.displayName || 'User'}`,
        htmlContent,
    };

    if (attachment.length > 0) {
        payload.attachment = attachment;
    }

    try {
        const result = await brevoRequest(payload, apiKey);
        console.log(`Payment notification email sent successfully to admin (${toEmail}). Message ID: ${result.messageId}`);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('Error sending payment notification email:', error.message);
        throw new Error(`Failed to send payment notification email: ${error.message}`);
    }
}

module.exports = { sendPdfEmail, sendPaymentNotificationToAdmin };
