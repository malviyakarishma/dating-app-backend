import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

import connectDB from './src/config/db.js';
import User from './src/models/User.js';
import Swipe from './src/models/Swipe.js';
import Message from './src/models/Message.js';
import Token from './src/models/Token.js';
import PasswordHistory from './src/models/PasswordHistory.js';

import * as authService from './src/modules/auth/auth.service.js';
import * as tokenServices from './src/services/tokenServices.js';

const runTest = async () => {
  console.log('Starting full auth & password history verification test...');
  
  // 1. Connect to Database
  await connectDB();
  
  // Clean up existing test data
  console.log('Cleaning up previous test users & tokens...');
  await User.deleteMany({ email: /test.*@example\.com/ });
  await Swipe.deleteMany({});
  await Message.deleteMany({});
  await Token.deleteMany({});
  await PasswordHistory.deleteMany({});

  try {
    // 2. Test User Registration (Auth Service)
    console.log('\n--- Testing Auth Service (Registration with Access/Refresh Tokens) ---');
    const { user, tokens } = await authService.registerUser({
      name: 'Test Authentication',
      email: 'testauth@example.com',
      password: 'originalPassword123',
    });
    console.log(`Registered User: ${user.name} (${user.email})`);
    console.log(`Access Token: ${tokens.access.token.substring(0, 20)}... (Expires: ${tokens.access.expires})`);
    console.log(`Refresh Token: ${tokens.refresh.token.substring(0, 20)}... (Expires: ${tokens.refresh.expires})`);

    // Verify refresh token is saved in database
    const savedToken = await Token.findOne({ user: user._id, type: 'refresh' });
    console.log(`Saved refresh token in database: ${savedToken ? 'YES' : 'NO'}`);

    // Verify original password is saved in PasswordHistory
    const initialHistory = await PasswordHistory.find({ user: user._id });
    console.log(`Passwords in history table: ${initialHistory.length}`);

    // 3. Test Refresh Token endpoint logic
    console.log('\n--- Testing Token Refreshing ---');
    const refreshed = await authService.refreshAuthTokens(tokens.refresh.token);
    console.log(`Successfully generated new tokens using refresh token!`);
    console.log(`New Access Token: ${refreshed.tokens.access.token.substring(0, 20)}...`);

    // 4. Test Forgot Password OTP Request
    console.log('\n--- Testing Forgot Password (OTP Generation) ---');
    await authService.generateForgotPasswordOtp(user.email);
    
    // Read user from database to get the generated OTP
    let userWithOtp = await User.findOne({ email: user.email }).select('+otp +otpExpires +otpVerified');
    console.log(`Generated OTP code in database: ${userWithOtp.otp}`);
    console.log(`OTP Expires at: ${userWithOtp.otpExpires}`);

    // 5. Test OTP Verification
    console.log('\n--- Testing OTP Verification ---');
    console.log('Testing incorrect OTP verification...');
    try {
      await authService.verifyForgotPasswordOtp(user.email, '000000');
    } catch (err) {
      console.log(`Expected Error Catch: ${err.message}`);
    }

    console.log('Testing correct OTP verification...');
    await authService.verifyForgotPasswordOtp(user.email, userWithOtp.otp);
    userWithOtp = await User.findOne({ email: user.email }).select('+otpVerified');
    console.log(`OTP Verified State in database: ${userWithOtp.otpVerified}`);

    // 6. Test Reset Password & Password History Constraint
    console.log('\n--- Testing Reset Password & Password History Constraints ---');
    
    // Attempt 1: Attempt to reset to the same original password
    console.log('Attempting to reset to the original password...');
    try {
      await authService.resetForgotPassword(user.email, 'originalPassword123');
      console.error('FAIL: Should have blocked reuse of original password');
    } catch (err) {
      console.log(`Expected Error Catch (Blocked Reuse): ${err.message}`);
    }

    // Attempt 2: Reset to a new password
    console.log('Resetting to a brand new password: "newPassword456"...');
    await authService.resetForgotPassword(user.email, 'newPassword456');
    console.log('Success! Password reset completed.');

    // Verify PasswordHistory has 2 entries now
    const historyAfterReset = await PasswordHistory.find({ user: user._id }).sort({ createdAt: -1 });
    console.log(`Passwords in history table: ${historyAfterReset.length}`);
    historyAfterReset.forEach((h, idx) => console.log(`- entry ${idx + 1}: ${h.password.substring(0, 15)}...`));

    // 7. Verification of Login with new credentials
    console.log('\n--- Testing Login with New Password ---');
    const loginResult = await authService.loginUser(user.email, 'newPassword456');
    console.log(`Successfully logged in with new password! Returned token: ${loginResult.tokens.access.token.substring(0, 20)}...`);

    // 8. Test reuse restriction of last 3 passwords
    console.log('\n--- Testing Last 3 Passwords Reuse Restriction ---');
    
    // Step A: Request OTP again to do another reset
    console.log('Requesting OTP for second password change...');
    await authService.generateForgotPasswordOtp(user.email);
    userWithOtp = await User.findOne({ email: user.email }).select('+otp');
    await authService.verifyForgotPasswordOtp(user.email, userWithOtp.otp);
    
    // Step B: Attempt to reuse the first password "originalPassword123"
    console.log('Attempting to reuse "originalPassword123" (which is in history)...');
    try {
      await authService.resetForgotPassword(user.email, 'originalPassword123');
      console.error('FAIL: Should have blocked reuse of originalPassword123');
    } catch (err) {
      console.log(`Expected Error Catch (Blocked Reuse from history): ${err.message}`);
    }

    // Step C: Reset to a third password
    console.log('Resetting to third password: "thirdPassword789"...');
    await authService.resetForgotPassword(user.email, 'thirdPassword789');
    console.log('Success! Reset completed.');

    console.log('\n✅ Verification Test Completed Successfully!');
  } catch (error) {
    console.error('\n❌ Verification Test Failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
};

runTest();
