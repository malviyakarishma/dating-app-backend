import Router from 'express';
import express from 'express';
import { protect } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import * as paymentValidation from './payment.validation.js';
import * as paymentController from './payment.controller.js';

const router = Router();

// ─── Protected Payment Endpoints ────────────────────────────────────────────
// These require user authentication

router.post(
  '/chat/unlock',
  protect,
  validate(paymentValidation.unlockChat),
  paymentController.unlockChat
);

router.get(
  '/chat/access/:matchedUserId',
  protect,
  validate(paymentValidation.getAccess),
  paymentController.getAccess
);

// ─── Stripe Webhook Endpoint ────────────────────────────────────────────────
// NOT protected by auth (Stripe sends events directly).
// Uses express.raw() middleware for signature verification — the raw body
// is needed by Stripe's constructEvent() function.
router.post(
  '/stripe/webhook',
  paymentController.stripeWebhook
);

export default router;
