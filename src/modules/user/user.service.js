import User from '../../models/User.js';
import Swipe from '../../models/Swipe.js';
import AppError from '../../utils/AppError.js';
import cloudinary from '../../config/cloudinary.js';

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
  const swipedUserIds = await Swipe.find({ liker: userId }).distinct('liked');

  const query = {
    _id: { $nin: [...swipedUserIds, userId] },
    isProfileComplete: true,
  };

  if (filters.gender) {
    query.gender = filters.gender;
  }

  const profiles = await User.find(query);
  return profiles;
};
