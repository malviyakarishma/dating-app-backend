import MatchChatAccess from '../models/MatchChatAccess.js';
import AppError from '../utils/AppError.js';

/**
 * Chat Access Middleware
 *
 * Verifies that the requesting user has active, non-expired chat access
 * with the target user before allowing chat operations (send message,
 * load history, open conversation).
 *
 * Checks both directions: either user in the match pair could have paid.
 *
 * Usage:
 *   router.post('/message', protect, verifyChatAccess('body', 'receiverId'), controller)
 *   router.get('/history/:otherUserId', protect, verifyChatAccess('params', 'otherUserId'), controller)
 *
 * @param {'body'|'params'|'query'} source - Where to find the target user ID
 * @param {string} field - The field name containing the target user ID
 */
const verifyChatAccess = (source, field) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id || req.user._id;
      const targetUserId = req[source]?.[field];

      if (!targetUserId) {
        return next(new AppError('Target user ID is required', 400));
      }

      // Look for active access in either direction
      const access = await MatchChatAccess.findOne({
        $or: [
          { payerUserId: userId, targetUserId: targetUserId },
          { payerUserId: targetUserId, targetUserId: userId },
        ],
        status: 'ACTIVE',
        expiryDate: { $gt: new Date() },
      });

      if (!access) {
        return next(
          new AppError('Chat access expired. Please renew access.', 403)
        );
      }

      // Attach access info to request for downstream use
      req.chatAccess = access;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default verifyChatAccess;
