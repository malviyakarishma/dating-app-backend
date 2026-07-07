import Router from 'express';
import { protect } from '../../middleware/auth.js';
import verifyChatAccess from '../../middleware/chatAccess.js';
import validate from '../../middleware/validate.js';
import * as chatValidation from './chat.validation.js';
import * as chatController from './chat.controller.js';

const router = Router();

router.use(protect);

// Chat access middleware gates message sending and history loading
// Users must have active paid access to use these endpoints
router.post('/message', validate(chatValidation.sendMessage), verifyChatAccess('body', 'receiverId'), chatController.postMessage);
router.get('/history/:otherUserId', validate(chatValidation.getHistory), verifyChatAccess('params', 'otherUserId'), chatController.getChatHistory);
router.get('/conversations', chatController.getChatsList);

export default router;

