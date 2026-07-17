import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import User from '../../models/User.js';
import Token from '../../models/Token.js';
import PasswordHistory from '../../models/PasswordHistory.js';
import * as tokenServices from '../../services/tokenServices.js';
import * as emailService from '../../services/emailService.js';
import AppError from '../../utils/AppError.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Register a new user
 * @param {Object} userBody
 * @returns {Promise<Object>} Object containing user and tokens
 */
export const registerUser = async (userBody) => {
  const { name, email, password } = userBody;
  
  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('Email is already registered', 400);
  }


  // Create new user (only credentials - profile setup happens in separate PUT steps)
  const user = await User.create({ name, email, password, isEmailVerified: false });

  // Save the initial password to Password History (already hashed inside user.password)
  await PasswordHistory.create({
    user: user._id,
    password: user.password,
  });

  // Generate a random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Save OTP and expiry (valid for 10 minutes)
  user.otp = otp;
  user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  user.otpVerified = false;

  await user.save();

  // Send the OTP email
  await emailService.sendOtpEmail(email, otp, 'verify');

  // Hide password in response
  user.password = undefined;

  return { user };
};

/**
 * Google Sign-In / Sign-Up
 * Verifies the Google ID token, finds or creates the user.
 * @param {string} idToken - Google ID token from the client
 * @returns {Promise<Object>} Object containing user and tokens
 */
export const googleSignIn = async (idToken) => {
  // Verify the ID token with Google
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    throw new AppError('Invalid Google token', 401);
  }

  const { sub: googleId, email, name, picture } = payload;

  if (!email) {
    throw new AppError('Google account does not have an email', 400);
  }

  // Try to find existing user by googleId first, then by email
  let user = await User.findOne({ googleId });

  if (!user) {
    user = await User.findOne({ email });

    if (user) {
      // Existing user with same email but registered via local auth
      // Link their Google account
      user.googleId = googleId;
      if (!user.authProvider || user.authProvider === 'local') {
        user.authProvider = 'google';
      }
      await user.save();
    } else {
      // Brand new user — create account
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        googleId,
        authProvider: 'google',
        isEmailVerified: true, // Google emails are verified
      });
    }
  }

  user.password = undefined;
  const tokens = await tokenServices.generateAuthTokens(user);

  return { user, tokens };
};

/**
 * Login user
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>} Object containing user and tokens
 */
export const loginUser = async (email, password) => {
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Incorrect email or password', 401);
  }

  if (!user.isEmailVerified) {
    throw new AppError('Please verify your email address first', 403);
  }

  user.password = undefined;

  const tokens = await tokenServices.generateAuthTokens(user);

  return { user, tokens };
};

/**
 * Logout user by revoking the refresh token
 * @param {string} refreshToken
 */
export const logoutUser = async (refreshToken) => {
  const tokenDoc = await Token.findOne({
    token: refreshToken,
    type: 'refresh',
  });

  if (!tokenDoc) {
    throw new AppError('Token not found', 404);
  }

  await tokenDoc.deleteOne();
};

/**
 * Refresh access & refresh tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>} user and tokens
 */
export const refreshAuthTokens = async (refreshToken) => {
  // Verify and fetch the refresh token from DB
  const tokenDoc = await tokenServices.verifyToken(refreshToken, 'refresh');
  
  const user = await User.findById(tokenDoc.user);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Delete old refresh token from DB
  await tokenDoc.deleteOne();

  // Generate new token pair
  const tokens = await tokenServices.generateAuthTokens(user);

  return { user, tokens };
};

/**
 * Generate 6-digit OTP for Forgot Password
 * @param {string} email
 */
export const generateForgotPasswordOtp = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('No user found with this email address', 404);
  }

  // Generate a random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Save OTP and expiry (valid for 10 minutes)
  user.otp = otp;
  user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  user.otpVerified = false;

  await user.save();

  // Send the OTP email
  await emailService.sendOtpEmail(email, otp);
};

/**
 * Verify OTP
 * @param {string} email
 * @param {string} otp
 */
export const verifyForgotPasswordOtp = async (email, otp) => {
  // Select fields because they are set to select: false in schema
  const user = await User.findOne({ email }).select('+otp +otpExpires +otpVerified');
  if (!user) {
    throw new AppError('No user found with this email address', 404);
  }

  if (!user.otp || user.otp !== otp || user.otpExpires < new Date()) {
    throw new AppError('Invalid or expired OTP', 400);
  }

  user.otpVerified = true;
  await user.save();
};

/**
 * Verify Registration OTP
 * @param {string} email
 * @param {string} otp
 * @returns {Promise<Object>} Object containing user and tokens
 */
export const verifyRegistrationOtp = async (email, otp) => {
  const user = await User.findOne({ email }).select('+otp +otpExpires');
  if (!user) {
    throw new AppError('No user found with this email address', 404);
  }

  if (user.isEmailVerified) {
    throw new AppError('Email is already verified', 400);
  }

  if (!user.otp || user.otp !== otp || user.otpExpires < new Date()) {
    throw new AppError('Invalid or expired OTP', 400);
  }

  user.isEmailVerified = true;
  user.otp = null;
  user.otpExpires = null;
  user.otpVerified = false; // Registration doesn't need to keep this true
  await user.save();

  const tokens = await tokenServices.generateAuthTokens(user);
  return { user, tokens };
};

/**
 * Resend Registration OTP
 * @param {string} email
 */
export const resendRegistrationOtp = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('No user found with this email address', 404);
  }

  if (user.isEmailVerified) {
    throw new AppError('Email is already verified', 400);
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  user.otp = otp;
  user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  await emailService.sendOtpEmail(email, otp, 'verify');
};

/**
 * Reset password using OTP verification state
 * @param {string} email
 * @param {string} newPassword
 */
export const resetForgotPassword = async (email, newPassword) => {
  const user = await User.findOne({ email }).select('+otpVerified +password');
  if (!user) {
    throw new AppError('No user found with this email address', 404);
  }

  // Verify OTP was validated
  if (!user.otpVerified) {
    throw new AppError('OTP verification required before resetting password', 403);
  }

  // Retrieve password history (fetch up to latest 3 passwords)
  const history = await PasswordHistory.find({ user: user._id })
    .sort({ createdAt: -1 })
    .limit(3);

  // Check new password against user's current password
  const currentPasswordMatch = await bcrypt.compare(newPassword, user.password);
  if (currentPasswordMatch) {
    throw new AppError('New password cannot be the same as any of your last 3 passwords', 400);
  }

  // Check against historical passwords
  for (const historicalPass of history) {
    const isHistoryMatch = await bcrypt.compare(newPassword, historicalPass.password);
    if (isHistoryMatch) {
      throw new AppError('New password cannot be the same as any of your last 3 passwords', 400);
    }
  }

  // Update password and clear OTP states
  user.password = newPassword;
  user.otp = null;
  user.otpExpires = null;
  user.otpVerified = false;

  await user.save();

  // Save the new password to Password History (user.password is now hashed)
  await PasswordHistory.create({
    user: user._id,
    password: user.password,
  });
};
