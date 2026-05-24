import Router from 'express';
import { protect } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import * as swipeValidation from './swipe.validation.js';
import * as swipeController from './swipe.controller.js';

const router = Router();

router.use(protect);

router.post('/', validate(swipeValidation.swipe), swipeController.swipe);
router.get('/matches', swipeController.getMatchesList);

export default router;
