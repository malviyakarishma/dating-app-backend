import * as userService from './user.service.js';
import AppError from '../../utils/AppError.js';
import cloudinary from '../../config/cloudinary.js';
import fs from 'fs';
import Swipe from '../../models/Swipe.js';
import Conversation from '../../models/Conversation.js';

export const getProfile = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.user.id);
    
    // Calculate stats dynamically from DB
    const likesCount = await Swipe.countDocuments({ liked: req.user.id, status: 'like' });
    
    const ourAccepted = await Swipe.find({ liker: req.user.id, status: 'like', matchStatus: 'accepted' }).distinct('liked');
    const matchesCount = await Swipe.countDocuments({
      liker: { $in: ourAccepted },
      liked: req.user.id,
      status: 'like',
      matchStatus: 'accepted',
    });
    
    const chatsCount = await Conversation.countDocuments({ participants: req.user.id });

    res.status(200).json({
      status: 'success',
      data: {
        user,
        stats: {
          likes: likesCount,
          matches: matchesCount,
          chats: chatsCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    // Prevent email from being changed via this endpoint
    delete req.body.email;
    const user = await userService.updateProfile(req.user.id, req.body);
    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};



export const getDiscovery = async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.gender) {
      filters.gender = req.query.gender;
    }
    
    const profiles = await userService.getDiscoveryProfiles(req.user.id, filters);
    res.status(200).json({
      status: 'success',
      results: profiles.length,
      data: {
        profiles,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const uploadPhotos = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next(new AppError('No photos uploaded', 400));
    }

    const folderName = `${req.user.id}_${req.user.name.replace(/\s+/g, '_')}`;
    
    // Upload all files in parallel
    const uploadPromises = req.files.map(async (file) => {
      try {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: `dating_app/${folderName}`,
        });
        
        // Delete local temp file
        await fs.promises.unlink(file.path).catch(() => {});
        return result.secure_url;
      } catch (err) {
        // Clean up on failure
        await fs.promises.unlink(file.path).catch(() => {});
        throw err;
      }
    });

    const urls = await Promise.all(uploadPromises);

    // Return secure URLs
    return res.status(200).json({
      status: 'success',
      data: {
        urls,
      },
    });
  } catch (error) {
    // Clean up any remaining files just in case
    if (req.files) {
      for (const file of req.files) {
        await fs.promises.unlink(file.path).catch(() => {});
      }
    }
    next(error);
  }
};
