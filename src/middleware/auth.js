import * as tokenServices from '../services/tokenServices.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';

/**
 * Protect routes - verify user is authenticated with JWT Access Token
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // 1) Get token from authorization headers
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(
        new AppError('You are not logged in! Please log in to get access.', 401)
      );
    }

    // 2) Verify token (uses tokenServices verification helper for 'access' tokens)
    const decoded = await tokenServices.verifyToken(token, 'access');

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(
        new AppError('The user belonging to this token no longer exists.', 401)
      );
    }

    // 4) Grant access and store currentUser in req.user
    req.user = currentUser;
    next();
  } catch (error) {
    next(error);
  }
};
