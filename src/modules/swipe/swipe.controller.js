import * as swipeService from './swipe.service.js';

export const swipe = async (req, res, next) => {
  try {
    const { likedId, status } = req.body;
    const result = await swipeService.createSwipe(req.user.id, likedId, status);

    res.status(200).json({
      status: 'success',
      data: {
        swipe: result.swipe,
        isMatch: result.isMatch,
        matchedUser: result.isMatch ? {
          id: result.targetUser._id,
          name: result.targetUser.name,
          photos: result.targetUser.photos,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMatchesList = async (req, res, next) => {
  try {
    const matches = await swipeService.getMatches(req.user.id);
    
    res.status(200).json({
      status: 'success',
      results: matches.length,
      data: {
        matches,
      },
    });
  } catch (error) {
    next(error);
  }
};
