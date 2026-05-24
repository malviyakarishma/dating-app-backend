import Message from '../../models/Message.js';
import Swipe from '../../models/Swipe.js';
import User from '../../models/User.js';
import AppError from '../../utils/AppError.js';

const areUsersMatched = async (user1, user2) => {
  const like1 = await Swipe.findOne({ liker: user1, liked: user2, status: 'like' });
  const like2 = await Swipe.findOne({ liker: user2, liked: user1, status: 'like' });
  return !!(like1 && like2);
};

export const sendMessage = async (senderId, receiverId, text) => {
  const isMatched = await areUsersMatched(senderId, receiverId);
  if (!isMatched) {
    throw new AppError('You can only message users you have matched with', 403);
  }

  const message = await Message.create({
    sender: senderId,
    receiver: receiverId,
    text,
  });

  return message;
};

export const getMessages = async (userId, otherUserId) => {
  const isMatched = await areUsersMatched(userId, otherUserId);
  if (!isMatched) {
    throw new AppError('You can only view chat logs with matched users', 403);
  }

  const messages = await Message.find({
    $or: [
      { sender: userId, receiver: otherUserId },
      { sender: otherUserId, receiver: userId },
    ],
  }).sort({ createdAt: 1 });

  return messages;
};

export const getConversations = async (userId) => {
  const usersILiked = await Swipe.find({ liker: userId, status: 'like' }).distinct('liked');
  const mutualSwipes = await Swipe.find({
    liker: { $in: usersILiked },
    liked: userId,
    status: 'like',
  }).populate('liker');

  const matchedUsers = mutualSwipes.map((swipe) => swipe.liker);

  const conversations = await Promise.all(
    matchedUsers.map(async (user) => {
      const latestMessage = await Message.findOne({
        $or: [
          { sender: userId, receiver: user._id },
          { sender: user._id, receiver: userId },
        ],
      }).sort({ createdAt: -1 });

      return {
        user,
        latestMessage: latestMessage || null,
      };
    })
  );

  conversations.sort((a, b) => {
    const timeA = a.latestMessage ? new Date(a.latestMessage.createdAt) : new Date(0);
    const timeB = b.latestMessage ? new Date(b.latestMessage.createdAt) : new Date(0);
    return timeB - timeA;
  });

  return conversations;
};
