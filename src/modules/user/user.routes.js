import Router from 'express';
import { protect } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import upload from '../../middleware/upload.js';
import * as userValidation from './user.validation.js';
import * as userController from './user.controller.js';

const router = Router();

router.use(protect);

router.get('/profile', userController.getProfile);
router.patch('/profile', validate(userValidation.updateProfile), userController.updateProfile);
router.get('/discover', userController.getDiscovery);
router.post('/upload', upload.array('photos', 6), userController.uploadPhotos);

export default router;

