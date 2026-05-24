import nodemailer from 'nodemailer';

/**
 * Create transport configuration
 */
const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      auth: {
        user,
        pass,
      },
    });
  }
  
  // Return null if not configured to indicate fallback to logging
  return null;
};

/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @param {string} [html]
 * @returns {Promise<boolean>}
 */
export const sendEmail = async (to, subject, text, html) => {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || 'Dating App <noreply@datingapp.com>';

  if (transporter) {
    try {
      await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html: html || text,
      });
      console.log(`Email successfully sent to ${to}`);
      return true;
    } catch (error) {
      console.error(`Error sending email to ${to}:`, error);
      // Still log fallback so the developer knows the email failed but sees the OTP
      logEmailToConsole(to, subject, text);
      return false;
    }
  } else {
    logEmailToConsole(to, subject, text);
    return true;
  }
};

/**
 * Send OTP Verification Email
 * @param {string} to
 * @param {string} otp
 * @returns {Promise<boolean>}
 */
export const sendOtpEmail = async (to, otp) => {
  const subject = 'Password Reset OTP - Dating App';
  const text = `Your OTP for resetting password is: ${otp}. It is valid for 10 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
      <h2 style="color: #FF4D67; text-align: center;">Reset Your Password</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password. Use the following One-Time Password (OTP) to complete the verification step:</p>
      <div style="font-size: 28px; font-weight: bold; text-align: center; color: #fff; background-color: #FF4D67; padding: 15px; border-radius: 6px; letter-spacing: 5px; margin: 20px 0;">
        ${otp}
      </div>
      <p style="color: #666; font-size: 14px; text-align: center;">This OTP is valid for 10 minutes. If you did not make this request, you can safely ignore this email.</p>
    </div>
  `;

  return await sendEmail(to, subject, text, html);
};

/**
 * Log email fallback helper
 */
const logEmailToConsole = (to, subject, text) => {
  console.log('\n==================================================');
  console.log('📧  EMAIL SEND LOG (SMTP NOT CONFIGURED)  📧');
  console.log(`TO      : ${to}`);
  console.log(`SUBJECT : ${subject}`);
  console.log(`CONTENT : ${text}`);
  console.log('==================================================\n');
};
