import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import Notification from '../models/Notification.js';
import MatchChatAccess from '../models/MatchChatAccess.js';

// active memory maps
export const onlineUsers = new Map(); // userId -> Set of socket.id
export const userActiveConversations = new Map(); // userId -> conversationId (active room)

let io = null;

/**
 * Send push notification (simulated push dispatch system)
 */
export const sendPushNotification = async (recipientId, title, body, data = {}) => {
  try {
    const recipient = await User.findById(recipientId);
    if (!recipient) return;

    // Save mock Notification document to MongoDB
    await Notification.create({
      userId: recipientId,
      title,
      body,
    });

    console.log(`[Push Notification] Sent to ${recipient.name}: "${title}: ${body}"`, data);
    
    // In production, we'd fire actual FCM payload here using admin.messaging().send()
    // For local simulation, if the user has active sockets anywhere, we also emit a background notification alert event
    const sockets = onlineUsers.get(recipientId.toString());
    if (sockets) {
      sockets.forEach(socketId => {
        io.to(socketId).emit('pushNotification', { title, body, data });
      });
    }
  } catch (error) {
    console.error('Error dispatching simulated push notification:', error);
  }
};

/**
 * Initialize Socket.IO Server
 */
export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const secret = process.env.JWT_SECRET || 'dating_app_super_secret_jwt_key_2026';
      const decoded = jwt.verify(token, secret);
      
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      console.error('Socket authentication failed:', err.message);
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`User connected to Socket.IO: ${socket.user.name} (${userId})`);

    // 1) Track socket session
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // 2) Update DB Online status
    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
    
    // Broadcast status to mutual matches
    socket.broadcast.emit('userOnline', { userId, lastSeen: new Date() });

    // 3) Join Conversation event
    socket.on('joinConversation', async ({ conversationId }) => {
      socket.join(conversationId);
      userActiveConversations.set(userId, conversationId);
      console.log(`Socket ${socket.id} (User: ${socket.user.name}) joined room: ${conversationId}`);

      // Reset unread count for this user in this conversation
      const conversation = await Conversation.findById(conversationId);
      if (conversation) {
        conversation.unreadCounts.set(userId, 0);
        await conversation.save();
        
        // Mark all messages from the other user in this conversation as seen
        await Message.updateMany(
          { conversationId, receiverId: userId, status: { $ne: 'seen' } },
          { status: 'seen' }
        );

        // Notify the other user (sender) that their messages have been seen
        const otherParticipantId = conversation.participants
          .find(p => p.toString() !== userId)
          ?.toString();

        if (otherParticipantId) {
          const otherSockets = onlineUsers.get(otherParticipantId);
          if (otherSockets) {
            otherSockets.forEach(sId => {
              io.to(sId).emit('messageSeen', { conversationId, readerId: userId });
            });
          }
        }

        // Notify self of status/conversations refresh
        socket.emit('unreadReset', { conversationId });
      }
    });

    // 4) Leave Conversation event
    socket.on('leaveConversation', ({ conversationId }) => {
      socket.leave(conversationId);
      userActiveConversations.delete(userId);
      console.log(`Socket ${socket.id} (User: ${socket.user.name}) left room: ${conversationId}`);
    });

    // 5) Send Message event (Optimistic or REST Fallback compatibility)
    socket.on('sendMessage', async ({ conversationId, text, receiverId }) => {
      try {
        // ── Chat Access Gate ──────────────────────────────────────────
        // Verify the sender has active paid chat access with the receiver
        const chatAccess = await MatchChatAccess.findOne({
          payerUserId: userId,
          targetUserId: receiverId,
          status: 'ACTIVE',
          expiryDate: { $gt: new Date() },
        });

        if (!chatAccess) {
          return socket.emit('error', {
            message: 'Chat access expired. Please renew access.',
            code: 'CHAT_ACCESS_EXPIRED',
          });
        }
        // ─────────────────────────────────────────────────────────────

        let conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          return socket.emit('error', { message: 'Conversation not found' });
        }

        // Create and save message
        const message = await Message.create({
          conversationId,
          senderId: userId,
          receiverId,
          text,
          status: 'sent',
        });

        // Determine if receiver is online and active in room
        const isReceiverOnline = onlineUsers.has(receiverId);
        const isReceiverInRoom = userActiveConversations.get(receiverId) === conversationId;

        if (isReceiverOnline) {
          if (isReceiverInRoom) {
            message.status = 'seen';
            await message.save();
            
            // Emit instantly to room
            io.to(conversationId).emit('receiveMessage', message);
            
            // Notify sender of Seen status
            socket.emit('messageSeen', { conversationId, readerId: receiverId });
          } else {
            message.status = 'delivered';
            await message.save();

            // Increment unread count
            const currentUnread = conversation.unreadCounts.get(receiverId) || 0;
            conversation.unreadCounts.set(receiverId, currentUnread + 1);
            await conversation.save();

            // Emit to receiver's individual sockets (so they receive real-time payload)
            const receiverSockets = onlineUsers.get(receiverId);
            receiverSockets.forEach(sId => {
              io.to(sId).emit('receiveMessage', message);
              io.to(sId).emit('conversationUpdated', { conversationId });
            });

            // Notify sender that it is delivered
            socket.emit('messageDelivered', { messageId: message._id, status: 'delivered' });

            // Send push notification
            await sendPushNotification(
              receiverId,
              socket.user.name,
              text,
              { conversationId, senderId: userId }
            );
          }
        } else {
          // Receiver is offline
          const currentUnread = conversation.unreadCounts.get(receiverId) || 0;
          conversation.unreadCounts.set(receiverId, currentUnread + 1);
          await conversation.save();

          // Send push notification
          await sendPushNotification(
            receiverId,
            socket.user.name,
            text,
            { conversationId, senderId: userId }
          );
        }

        // Update conversation's last message tracker
        conversation.lastMessage = message._id;
        conversation.lastMessageTime = new Date();
        await conversation.save();

      } catch (err) {
        console.error('Error handling sendMessage socket event:', err);
        socket.emit('error', { message: 'Message could not be sent' });
      }
    });

    // 6) Typing events
    socket.on('typingStart', ({ conversationId, receiverId }) => {
      const receiverSockets = onlineUsers.get(receiverId.toString());
      if (receiverSockets) {
        receiverSockets.forEach(sId => {
          io.to(sId).emit('typingStart', { conversationId, senderId: userId });
        });
      }
    });

    socket.on('typingStop', ({ conversationId, receiverId }) => {
      const receiverSockets = onlineUsers.get(receiverId.toString());
      if (receiverSockets) {
        receiverSockets.forEach(sId => {
          io.to(sId).emit('typingStop', { conversationId, senderId: userId });
        });
      }
    });

    // 7) Explicit seen marker from view trigger
    socket.on('markSeen', async ({ conversationId, senderId }) => {
      await Message.updateMany(
        { conversationId, senderId, status: { $ne: 'seen' } },
        { status: 'seen' }
      );

      const senderSockets = onlineUsers.get(senderId.toString());
      if (senderSockets) {
        senderSockets.forEach(sId => {
          io.to(sId).emit('messageSeen', { conversationId, readerId: userId });
        });
      }
    });

    // 8) Disconnect handling
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id} (User: ${socket.user.name})`);
      
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          userActiveConversations.delete(userId);

          // Update online status in database
          const lastSeenTime = new Date();
          await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: lastSeenTime });

          // Broadcast offline state
          socket.broadcast.emit('userOffline', { userId, lastSeen: lastSeenTime });
        }
      }
    });
  });

  return io;
};

export { io };
