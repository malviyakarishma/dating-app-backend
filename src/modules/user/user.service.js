import User from '../../models/User.js';
import Swipe from '../../models/Swipe.js';
import MatchChatAccess from '../../models/MatchChatAccess.js';
import AppError from '../../utils/AppError.js';
import cloudinary from '../../config/cloudinary.js';
import stripe from '../../config/stripe.js';
export const getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return user;
};

/**
 * Extract a Cloudinary public_id from a secure_url.
 * e.g. https://res.cloudinary.com/demo/image/upload/v123/dating_app/folder/abc.jpg
 * → dating_app/folder/abc
 */
const extractPublicId = (url) => {
  const parts = url.split('/');
  const uploadIndex = parts.indexOf('upload');
  if (uploadIndex === -1) return null;
  const afterUpload = parts.slice(uploadIndex + 1);
  // Strip version segment (v followed by digits)
  const withoutVersion = /^v\d+$/.test(afterUpload[0]) ? afterUpload.slice(1) : afterUpload;
  return withoutVersion.join('/').replace(/\.[^/.]+$/, '');
};

export const updateProfile = async (userId, updateBody) => {
  const user = await getUserById(userId);

  // If a new photos array is provided, diff against existing DB photos
  // and delete any removed Cloudinary images
  if (Array.isArray(updateBody.photos)) {
    const existingPhotos = user.photos || [];
    const newPhotos = updateBody.photos;

    // Photos that were in DB but are missing from the new array → deleted by user
    const removedPhotos = existingPhotos.filter(
      (url) => url.startsWith('http') && !newPhotos.includes(url)
    );

    if (removedPhotos.length > 0) {
      // Delete from Cloudinary in parallel — non-blocking failures are logged but don't abort save
      await Promise.allSettled(
        removedPhotos.map(async (url) => {
          const publicId = extractPublicId(url);
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
        })
      );
    }
  }

  Object.keys(updateBody).forEach((key) => {
    user[key] = updateBody[key];
  });

  await user.save();
  return user;
};


export const getDiscoveryProfiles = async (userId, filters = {}) => {
  // Users we have already swiped on (liked or disliked)
  const ourSwipes = await Swipe.find({ liker: userId }).distinct('liked');
  
  // Users who have swiped on us (including incoming likes/requests)
  const theirSwipes = await Swipe.find({ liked: userId }).distinct('liker');

  // Combine and deduplicate the IDs to exclude
  const excludeIds = [
    ...new Set([
      ...ourSwipes.map(id => id.toString()),
      ...theirSwipes.map(id => id.toString()),
      userId.toString()
    ])
  ];

  const query = {
    _id: { $nin: excludeIds },
    isProfileComplete: true,
  };

  if (filters.gender) {
    query.gender = filters.gender;
  }

  const profiles = await User.find(query);
  return profiles;
};

export const deleteUserAccount = async (userId) => {
  const user = await getUserById(userId);

  // 1. Delete Cloudinary images
  if (user.photos && user.photos.length > 0) {
    await Promise.allSettled(
      user.photos.map(async (url) => {
        if (url.startsWith('http')) {
          const publicId = extractPublicId(url);
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
        }
      })
    );
  }

  // 2. Cancel any active subscriptions involving this user (either they are paying, or someone is paying for them)
  const activeSubscriptions = await MatchChatAccess.find({
    $or: [{ payerUserId: userId }, { targetUserId: userId }],
    status: 'ACTIVE',
    accessType: 'SUBSCRIPTION',
    stripeSubscriptionId: { $ne: null }
  });

  for (const sub of activeSubscriptions) {
    try {
      await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
      sub.status = 'CANCELLED';
      await sub.save();
    } catch (err) {
      console.error(`Failed to cancel subscription ${sub.stripeSubscriptionId}:`, err);
    }
  }

  // 3. Delete from Stripe (this also acts as a fallback to cancel their own subscriptions)
  if (user.stripeCustomerId) {
    try {
      await stripe.customers.del(user.stripeCustomerId);
    } catch (error) {
      console.error('Failed to delete Stripe customer:', error);
    }
  }

  // 4. Delete related Swipes
  await Swipe.deleteMany({
    $or: [{ liker: userId }, { liked: userId }]
  });

  // 5. Delete the User record
  await User.findByIdAndDelete(userId);
};
