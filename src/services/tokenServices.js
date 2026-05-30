import jwt from 'jsonwebtoken';
import Token from '../models/Token.js';
import AppError from '../utils/AppError.js';

/**
 * Generate a JWT token
 * @param {string} userId
 * @param {Date} expires
 * @param {string} type - 'access' | 'refresh'
 * @param {string} [secret]
 * @returns {string}
 */
export const generateToken = (userId, expires, type, secret = process.env.JWT_SECRET || 'dating_app_super_secret_jwt_key_2026') => {
  const payload = {
    id: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(expires.getTime() / 1000),
    type,
  };
  return jwt.sign(payload, secret);
};

/**
 * Save a token in database
 * @param {string} tokenStr
 * @param {string} userId
 * @param {Date} expires
 * @param {string} type
 * @returns {Promise<Token>}
 */
export const saveToken = async (tokenStr, userId, expires, type) => {
  const tokenDoc = await Token.create({
    token: tokenStr,
    user: userId,
    type,
    expires,
  });
  return tokenDoc;
};

/**
 * Verify a token and return its document (or payload)
 * @param {string} tokenStr
 * @param {string} type
 * @returns {Promise<Object>} Decoded payload or Token document
 */
export const verifyToken = async (tokenStr, type) => {
  const secret = process.env.JWT_SECRET || 'dating_app_super_secret_jwt_key_2026';
  const payload = jwt.verify(tokenStr, secret);

  if (payload.type !== type) {
    throw new AppError('Invalid token type', 400);
  }

  if (type === 'refresh') {
    const tokenDoc = await Token.findOne({
      token: tokenStr,
      type,
      user: payload.id,
      blacklisted: false,
    });
    if (!tokenDoc) {
      throw new AppError('Refresh token not found or revoked', 401);
    }
    return tokenDoc;
  }

  return payload;
};

/**
 * Parse time duration string (e.g. '7d', '1h', '30m') to milliseconds
 * @param {string} str
 * @returns {number} Milliseconds
 */
const parseExpiresIn = (str) => {
  const match = str.match(/^(\d+)(ms|s|m|h|d|w|y)?$/);
  if (!match) return 60 * 60 * 1000; // default 1 hour
  const value = parseInt(match[1], 10);
  const unit = match[2] || 'ms';
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'w': return value * 7 * 24 * 60 * 60 * 1000;
    default: return value;
  }
};

/**
 * Generate Access and Refresh tokens for a user
 * @param {User} user
 * @returns {Promise<Object>} Object containing access and refresh token details
 */
export const generateAuthTokens = async (user) => {
  const expiresStr = process.env.JWT_EXPIRES_IN || '1h';
  const accessTokenExpires = new Date(Date.now() + parseExpiresIn(expiresStr));
  const accessToken = generateToken(user._id, accessTokenExpires, 'access');

  const refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const refreshToken = generateToken(user._id, refreshTokenExpires, 'refresh');

  // Save refresh token to database
  await saveToken(refreshToken, user._id, refreshTokenExpires, 'refresh');

  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires,
    },
    refresh: {
      token: refreshToken,
      expires: refreshTokenExpires,
    },
  };
};
