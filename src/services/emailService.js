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
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || 'BoundByLove <noreply@boundbylove.com>';

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
 * @param {string} purpose - 'verify' or 'reset'
 * @returns {Promise<boolean>}
 */
export const sendOtpEmail = async (to, otp, purpose = 'reset') => {
  const isVerify = purpose === 'verify';
  const subject = isVerify ? 'Verify your email - BoundByLove' : 'Password Reset OTP - BoundByLove';
  const heading = isVerify ? 'Verify Your Email' : 'Reset Your Password';
  const introText = isVerify
    ? 'Welcome to BoundByLove! Use the following One-Time Password (OTP) to verify your email address:'
    : 'We received a request to reset your password. Use the following One-Time Password (OTP) to complete the verification step:';
  
  const text = isVerify 
    ? `Your verification OTP is: ${otp}. It is valid for 10 minutes.`
    : `Your OTP for resetting password is: ${otp}. It is valid for 10 minutes.`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px 20px; border: 1px solid #ddd; border-radius: 12px; background-color: #fdf5f1; text-align: center;">
      <img src="https://res.cloudinary.com/doprzd6cd/image/upload/v1784283904/dating_app/assets/applogo.jpg" alt="BoundByLove Logo" style="width: 80px; height: 80px; border-radius: 40px; margin-bottom: 20px; border: 2px solid #A70B26;" />
      <h2 style="color: #A70B26; text-align: center; margin-top: 0;">${heading}</h2>
      <p style="color: #333; font-size: 16px;">Hello,</p>
      <p style="color: #333; font-size: 16px;">${introText}</p>
      <div style="font-size: 32px; font-weight: bold; text-align: center; color: #fff; background-color: #FF6B9E; padding: 20px; border-radius: 8px; letter-spacing: 8px; margin: 30px auto; max-width: 250px; border: 2px solid #A70B26;">
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

/**
 * Send Account Deletion Confirmation Email
 * @param {string} to
 * @param {string} firstName
 * @returns {Promise<boolean>}
 */
export const sendAccountDeletionEmail = async (to, firstName) => {
  const subject = 'Your Account Has Been Successfully Deleted - BoundByLove';
  const text = `Hi ${firstName}, your account has been successfully deleted. All your personal data has been securely removed. We wish you all the best on your journey.`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Deleted</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fdf5f1; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
  <div style="width: 100%; background-color: #fdf5f1; padding: 40px 0;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 16px rgba(167, 11, 38, 0.08); border: 1px solid #f9e3d9;">
      <div style="background: #fdf5f1; padding: 40px 20px 30px; text-align: center; border-bottom: 2px solid #A70B26;">
        <img src="https://res.cloudinary.com/doprzd6cd/image/upload/v1784283904/dating_app/assets/applogo.jpg" alt="BoundByLove Logo" style="width: 80px; height: 80px; border-radius: 40px; border: 2px solid #A70B26; margin-bottom: 20px;" />
        <h1 style="color: #A70B26; margin: 0; font-size: 24px; font-weight: 800;">Account Successfully Deleted</h1>
      </div>
      
      <div style="padding: 40px 30px; color: #333333; line-height: 1.6;">
        <p style="margin: 0 0 20px 0; font-size: 16px;">Hi ${firstName},</p>
        <p style="margin: 0 0 20px 0; font-size: 16px;">Thank you for being a part of the BoundByLove community. We're writing to confirm that your account has been permanently deleted as per your request.</p>
        
        <h2 style="color: #A70B26; font-size: 20px; margin: 0 0 15px 0;">What does this mean?</h2>
        <p style="margin: 0 0 20px 0; font-size: 16px;">All personal data associated with your account—including your profile, photos, matches, chats, preferences, and account information—has been securely removed from our active systems in accordance with our <a href="#" style="color: #FF6B9E; text-decoration: none; font-weight: 600;">Privacy Policy</a>, except where limited retention may be required by applicable laws or security purposes.</p>
        
        <p style="margin: 0 0 20px 0; font-size: 16px;">You can rest assured that your personal information will never be misused or shared.</p>
        
        <div style="background-color: #fff0f2; border-left: 4px solid #FF6B9E; padding: 15px 20px; border-radius: 0 8px 8px 0; margin: 25px 0;">
          <p style="margin: 0; color: #A70B26; font-weight: 500; font-style: italic;">"If you've found your forever person, we're truly happy for you and wish you a lifetime of love and happiness. If life brings you back to discovering new connections someday, we'd be delighted to welcome you again."</p>
        </div>
        
        <p style="margin: 0 0 20px 0; font-size: 16px;">Until then, we wish you all the best on your journey.</p>
        
        <p style="margin: 30px 0 20px 0; font-size: 16px; font-weight: 600;">
          Warmly,<br>
          The BoundByLove Team
        </p>
      </div>
      
      <div style="background-color: #fcf1eb; padding: 30px; text-align: center; border-top: 1px solid #f5e0d5;">
        <p style="margin: 0 0 10px 0; font-size: 13px; color: #888888;">If you have any questions or need further assistance, please contact us at <a href="mailto:shwtyyyworks@gmail.com" style="color: #A70B26; text-decoration: none; font-weight: 600;">shwtyyyworks@gmail.com</a>.</p>
        <p style="margin: 0 0 10px 0; font-size: 13px; color: #888888;">&copy; ${new Date().getFullYear()} BoundByLove. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  return await sendEmail(to, subject, text, html);
};
