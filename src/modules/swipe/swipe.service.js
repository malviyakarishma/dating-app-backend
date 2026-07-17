import Swipe from '../../models/Swipe.js';
import User from '../../models/User.js';
import AppError from '../../utils/AppError.js';
import { sendPushNotification } from '../../services/socketService.js';

/**
 * Register a swipe action (like or dislike).
 * - dislike: just records it so the user won't see them again
 * - like:    creates a pending request to the liked user.
 *            Exception: if the liked user already sent a pending request
 *            to this user (they liked us first), auto-accept both sides.
 */
export const createSwipe = async (likerId, likedId, status) => {
  const targetUser = await User.findById(likedId);
  const liker = await User.findById(likerId);
  if (!targetUser) throw new AppError('Target user not found', 404);

  if (likerId.toString() === likedId.toString()) {
    throw new AppError('You cannot swipe on yourself', 400);
  }

  // Enforce swipe limits
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  if (status === 'like') {
    const recentLikes = await Swipe.countDocuments({
      liker: likerId,
      status: 'like',
      createdAt: { $gte: twoDaysAgo }
    });
    if (recentLikes >= 3) {
      throw new AppError('You have reached your limit of 3 right swipes per 2 days.', 429);
    }
  } else if (status === 'dislike') {
    const recentDislikes = await Swipe.countDocuments({
      liker: likerId,
      status: 'dislike',
      createdAt: { $gte: twoDaysAgo }
    });
    if (recentDislikes >= 5) {
      throw new AppError('You have reached your limit of 5 left swipes per 2 days.', 429);
    }
  }


  if (status === 'dislike') {
    await Swipe.findOneAndUpdate(
      { liker: likerId, liked: likedId },
      { status: 'dislike', matchStatus: 'declined' },
      { upsert: true, new: true }
    );
    return { isMatch: false, targetUser };
  }

  // status === 'like'
  // Check if the other person already sent us a pending request
  const theirPendingRequest = await Swipe.findOne({
    liker: likedId,
    liked: likerId,
    status: 'like',
    matchStatus: 'pending',
  });

  if (theirPendingRequest) {
    // Auto-accept: both swiped right on each other → instant match
    theirPendingRequest.matchStatus = 'accepted';
    await theirPendingRequest.save();

    // Create or update our own swipe as accepted
    await Swipe.findOneAndUpdate(
      { liker: likerId, liked: likedId },
      { status: 'like', matchStatus: 'accepted' },
      { upsert: true, new: true }
    );

    await sendPushNotification(
      likedId,
      'New Match!',
      `You matched with ${liker.name}!`,
      { type: 'match' }
    );

    await sendPushNotification(
      likerId,
      'New Match!',
      `You matched with ${targetUser.name}!`,
      { type: 'match' }
    );

    return { isMatch: true, targetUser };
  }

  // No mutual pending request — create a new pending like request
  await Swipe.findOneAndUpdate(
    { liker: likerId, liked: likedId },
    { status: 'like', matchStatus: 'pending' },
    { upsert: true, new: true }
  );

  await sendPushNotification(
    likedId,
    'New Request',
    `${liker.name} wants to connect with you!`,
    { type: 'request' }
  );

  return { isMatch: false, targetUser };
};

/**
 * Get all incoming pending like requests for a user.
 * These are profiles that swiped right on the user but haven't been responded to yet.
 */
export const getPendingRequests = async (userId) => {
  const requests = await Swipe.find({
    liked: userId,
    status: 'like',
    matchStatus: 'pending',
  }).populate('liker');

  return requests
    .filter((s) => s.liker != null)
    .map((s) => ({ swipeId: s._id, user: s.liker, createdAt: s.createdAt }));
};

/**
 * Accept or decline an incoming like request.
 * - accept:  sets the incoming swipe to 'accepted', creates/updates our outgoing swipe as 'accepted'
 * - decline: deletes the incoming swipe document entirely
 */
export const respondToRequest = async (swipeId, responderId, action) => {
  const swipe = await Swipe.findById(swipeId).populate('liker');

  if (!swipe) throw new AppError('Request not found', 404);
  if (swipe.liked.toString() !== responderId.toString()) {
    throw new AppError('Not authorised to respond to this request', 403);
  }
  if (swipe.status !== 'like' || swipe.matchStatus !== 'pending') {
    throw new AppError('This request is no longer pending', 400);
  }

  if (action === 'accept') {
    swipe.matchStatus = 'accepted';
    await swipe.save();

    // Create/update our outgoing swipe as accepted so both sides are matched
    await Swipe.findOneAndUpdate(
      { liker: responderId, liked: swipe.liker._id },
      { status: 'like', matchStatus: 'accepted' },
      { upsert: true, new: true }
    );

    const responder = await User.findById(responderId);
    await sendPushNotification(
      swipe.liker._id,
      'Request Accepted',
      `${responder.name} accepted your request. Say hi!`,
      { type: 'match' }
    );

    return { accepted: true, matchedUser: swipe.liker };
  }

  // action === 'decline': remove the request entirely
  await Swipe.findByIdAndDelete(swipeId);
  return { accepted: false };
};

/**
 * Get all accepted matches for a user.
 * A match = our outgoing like is 'accepted' AND the other side's like is also 'accepted'.
 */
export const getMatches = async (userId) => {
  // Our accepted outgoing likes
  const ourAccepted = await Swipe.find({
    liker: userId,
    status: 'like',
    matchStatus: 'accepted',
  }).distinct('liked');

  // Of those, find users who also have an accepted like toward us
  const mutualSwipes = await Swipe.find({
    liker: { $in: ourAccepted },
    liked: userId,
    status: 'like',
    matchStatus: 'accepted',
  }).populate('liker');

  return mutualSwipes
    .filter((s) => s.liker != null)
    .map((s) => s.liker);
};
