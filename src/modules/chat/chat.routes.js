import Router from 'express';
import { protect } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import * as chatValidation from './chat.validation.js';
import * as chatController from './chat.controller.js';

const router = Router();

router.use(protect);

router.post('/message', validate(chatValidation.sendMessage), chatController.postMessage);
router.get('/history/:otherUserId', validate(chatValidation.getHistory), chatController.getChatHistory);
router.get('/conversations', chatController.getChatsList);

export default router;
