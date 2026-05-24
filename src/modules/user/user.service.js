import User from '../../models/User.js';
import Swipe from '../../models/Swipe.js';
import AppError from '../../utils/AppError.js';

export const getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return user;
};

export const updateProfile = async (userId, updateBody) => {
  const user = await getUserById(userId);

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
