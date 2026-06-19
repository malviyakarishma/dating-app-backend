import Message from '../../models/Message.js';
import Conversation from '../../models/Conversation.js';
import Swipe from '../../models/Swipe.js';
import User from '../../models/User.js';
import AppError from '../../utils/AppError.js';
import { onlineUsers, userActiveConversations, sendPushNotification, io } from '../../services/socketService.js';

/**
 * Verify if two users have mutually accepted swiped/matched.
 */
const areUsersMatched = async (user1, user2) => {
  const like1 = await Swipe.findOne({ liker: user1, liked: user2, status: 'like', matchStatus: 'accepted' });
  const like2 = await Swipe.findOne({ liker: user2, liked: user1, status: 'like', matchStatus: 'accepted' });
  return !!(like1 && like2);
};

/**
 * Create or retrieve an existing Conversation between two participants.
 */
export const getOrCreateConversation = async (user1, user2) => {
  let conversation = await Conversation.findOne({
    participants: { $all: [user1, user2] },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [user1, user2],
      unreadCounts: new Map([[user1.toString(), 0], [user2.toString(), 0]]),
    });
  }

  return conversation;
};

/**
 * REST Endpoint support for sending a text message.
 */
export const sendMessage = async (senderId, receiverId, text) => {
  const isMatched = await areUsersMatched(senderId, receiverId);
  if (!isMatched) {
    throw new AppError('You can only message users you have matched with', 403);
  }

  const conversation = await getOrCreateConversation(senderId, receiverId);
  const conversationId = conversation._id;

  // Save message
  const message = await Message.create({
    conversationId,
    senderId,
    receiverId,
    text,
    status: 'sent',
  });

  // Real-time socket check
  const isReceiverOnline = onlineUsers && onlineUsers.has(receiverId.toString());
  const isReceiverInRoom = userActiveConversations && userActiveConversations.get(receiverId.toString()) === conversationId.toString();

  if (isReceiverOnline) {
    if (isReceiverInRoom) {
      message.status = 'seen';
      await message.save();

      // Emit to room
      if (io) {
        io.to(conversationId.toString()).emit('receiveMessage', message);
        
        // Notify sender of Seen status
        const senderSockets = onlineUsers.get(senderId.toString());
        if (senderSockets) {
          senderSockets.forEach(sId => {
            io.to(sId).emit('messageSeen', { conversationId, readerId: receiverId });
          });
        }
      }
    } else {
      message.status = 'delivered';
      await message.save();

      // Increment unread count
      const currentUnread = conversation.unreadCounts.get(receiverId.toString()) || 0;
      conversation.unreadCounts.set(receiverId.toString(), currentUnread + 1);
      await conversation.save();

      if (io) {
        // Emit to receiver's active sessions
        const receiverSockets = onlineUsers.get(receiverId.toString());
        receiverSockets.forEach(sId => {
          io.to(sId).emit('receiveMessage', message);
          io.to(sId).emit('conversationUpdated', { conversationId });
        });

        // Notify sender of Delivered status
        const senderSockets = onlineUsers.get(senderId.toString());
        if (senderSockets) {
          senderSockets.forEach(sId => {
            io.to(sId).emit('messageDelivered', { messageId: message._id, status: 'delivered' });
          });
        }
      }

      // Dispatch Push Notification
      await sendPushNotification(receiverId, 'New Message', text, { conversationId });
    }
  } else {
    // Offline User
    const currentUnread = conversation.unreadCounts.get(receiverId.toString()) || 0;
    conversation.unreadCounts.set(receiverId.toString(), currentUnread + 1);
    await conversation.save();

    // Dispatch Push Notification
    await sendPushNotification(receiverId, 'New Message', text, { conversationId });
  }

  // Update Conversation preview
  conversation.lastMessage = message._id;
  conversation.lastMessageTime = new Date();
  await conversation.save();

  return message;
};

/**
 * Fetch messages for a conversation with pagination support.
 */
export const getMessages = async (userId, otherUserId, page = 1, limit = 40) => {
  const isMatched = await areUsersMatched(userId, otherUserId);
  if (!isMatched) {
    throw new AppError('You can only view chat logs with matched users', 403);
  }

  const conversation = await getOrCreateConversation(userId, otherUserId);
  
  // Clear unread counts for this user
  conversation.unreadCounts.set(userId.toString(), 0);
  await conversation.save();

  // Mark all unread incoming messages as seen
  await Message.updateMany(
    { conversationId: conversation._id, receiverId: userId, status: { $ne: 'seen' } },
    { status: 'seen' }
  );

  // Notify sender of seen updates
  if (io) {
    const senderSockets = onlineUsers.get(otherUserId.toString());
    if (senderSockets) {
      senderSockets.forEach(sId => {
        io.to(sId).emit('messageSeen', { conversationId: conversation._id, readerId: userId });
      });
    }
  }

  // Retrieve paginated historical records
  const skip = (page - 1) * limit;
  const messages = await Message.find({ conversationId: conversation._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // Reverse list so it is chronological in the Chat window
  return messages.reverse();
};

/**
 * Retrieve all active conversations for the logged-in user.
 */
export const getConversations = async (userId) => {
  // Query all active matched profiles
  const usersILiked = await Swipe.find({ liker: userId, status: 'like', matchStatus: 'accepted' }).distinct('liked');
  const mutualSwipes = await Swipe.find({
    liker: { $in: usersILiked },
    liked: userId,
    status: 'like',
    matchStatus: 'accepted',
  }).populate('liker');

  const matchedUsers = mutualSwipes.map((swipe) => swipe.liker);

  const conversations = await Promise.all(
    matchedUsers.map(async (user) => {
      // Only retrieve existing conversations — don't create new ones
      const conversation = await Conversation.findOne({
        participants: { $all: [userId, user._id] },
      });

      // Skip if no conversation exists yet
      if (!conversation || !conversation.lastMessage) return null;

      const latestMessage = await Message.findById(conversation.lastMessage);

      // Skip if there are truly no messages exchanged
      if (!latestMessage) return null;

      const unreadCount = conversation.unreadCounts.get(userId.toString()) || 0;

      return {
        user: {
          id: user._id,
          _id: user._id,
          name: user.name,
          photos: user.photos,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
        },
        conversationId: conversation._id,
        latestMessage: latestMessage || null,
        unreadCount,
      };
    })
  );

  // Filter out null entries (matches with no messages)
  const activeConversations = conversations.filter(c => c !== null);

  // Order conversations: most recent messages first
  activeConversations.sort((a, b) => {
    const timeA = a.latestMessage ? new Date(a.latestMessage.createdAt) : new Date(0);
    const timeB = b.latestMessage ? new Date(b.latestMessage.createdAt) : new Date(0);
    return timeB - timeA;
  });

  return activeConversations;
};
