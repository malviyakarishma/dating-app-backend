import * as swipeService from './swipe.service.js';

/**
 * POST /swipes
 * Register a swipe (like sends a request, dislike just skips)
 */
export const swipe = async (req, res, next) => {
  try {
    const { likedId, status } = req.body;
    const result = await swipeService.createSwipe(req.user.id, likedId, status);

    res.status(200).json({
      status: 'success',
      data: {
        // isMatch is only true on the auto-accept path (both swiped right)
        isMatch: result.isMatch,
        matchedUser: result.isMatch
          ? {
              id: result.targetUser._id,
              name: result.targetUser.name,
              photos: result.targetUser.photos,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /swipes/requests
 * Get all incoming pending like requests for the logged-in user
 */
export const getRequests = async (req, res, next) => {
  try {
    const requests = await swipeService.getPendingRequests(req.user.id);

    res.status(200).json({
      status: 'success',
      results: requests.length,
      data: { requests },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /swipes/requests/:id
 * Accept or decline an incoming like request
 * Body: { action: 'accept' | 'decline' }
 */
export const respondRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    const result = await swipeService.respondToRequest(id, req.user.id, action);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /swipes/matches
 * Get all accepted mutual matches
 */
export const getMatchesList = async (req, res, next) => {
  try {
    const matches = await swipeService.getMatches(req.user.id);

    res.status(200).json({
      status: 'success',
      results: matches.length,
      data: { matches },
    });
  } catch (error) {
    next(error);
  }
};
