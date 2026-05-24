import * as chatService from './chat.service.js';

export const postMessage = async (req, res, next) => {
  try {
    const { receiverId, text } = req.body;
    const message = await chatService.sendMessage(req.user.id, receiverId, text);

    res.status(201).json({
      status: 'success',
      data: {
        message,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getChatHistory = async (req, res, next) => {
  try {
    const { otherUserId } = req.params;
    const messages = await chatService.getMessages(req.user.id, otherUserId);

    res.status(200).json({
      status: 'success',
      results: messages.length,
      data: {
        messages,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getChatsList = async (req, res, next) => {
  try {
    const conversations = await chatService.getConversations(req.user.id);

    res.status(200).json({
      status: 'success',
      results: conversations.length,
      data: {
        conversations,
      },
    });
  } catch (error) {
    next(error);
  }
};
