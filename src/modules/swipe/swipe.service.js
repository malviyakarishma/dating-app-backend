import Swipe from '../../models/Swipe.js';
import User from '../../models/User.js';
import AppError from '../../utils/AppError.js';

export const createSwipe = async (likerId, likedId, status) => {
  const targetUser = await User.findById(likedId);
  if (!targetUser) {
    throw new AppError('Target user not found', 404);
  }

  if (likerId.toString() === likedId.toString()) {
    throw new AppError('You cannot swipe on yourself', 400);
  }

  const swipe = await Swipe.findOneAndUpdate(
    { liker: likerId, liked: likedId },
    { status },
    { upsert: true, new: true }
  );

  let isMatch = false;

  if (status === 'like') {
    const mutualLike = await Swipe.findOne({
      liker: likedId,
      liked: likerId,
      status: 'like',
    });

    if (mutualLike) {
      isMatch = true;
    }
  }

  return { swipe, isMatch, targetUser };
};

export const getMatches = async (userId) => {
  const usersILiked = await Swipe.find({ liker: userId, status: 'like' }).distinct('liked');

  const mutualSwipes = await Swipe.find({
    liker: { $in: usersILiked },
    liked: userId,
    status: 'like',
  }).populate('liker');

  return mutualSwipes.map((swipe) => swipe.liker);
};
