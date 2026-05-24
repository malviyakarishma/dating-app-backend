import Router from 'express';
import validate from '../../middleware/validate.js';
import * as authValidation from './auth.validation.js';
import * as authController from './auth.controller.js';

const router = Router();

router.post('/register', validate(authValidation.register), authController.register);
router.post('/login', validate(authValidation.login), authController.login);
router.post('/logout', validate(authValidation.refresh), authController.logout);
router.post('/refresh', validate(authValidation.refresh), authController.refresh);
router.post('/forgot-password', validate(authValidation.forgotPassword), authController.forgotPassword);
router.post('/verify-otp', validate(authValidation.verifyOtp), authController.verifyOtp);
router.post('/reset-password', validate(authValidation.resetPassword), authController.resetPassword);

export default router;
