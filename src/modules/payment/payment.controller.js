import stripe from '../../config/stripe.js';
import * as paymentService from './payment.service.js';
import AppError from '../../utils/AppError.js';

/**
 * POST /api/chat/unlock
 * Creates a Stripe Checkout Session to unlock chat with a matched user.
 */
export const unlockChat = async (req, res, next) => {
  try {
    const { matchedUserId, paymentType } = req.body;
    const result = await paymentService.createCheckoutSession(
      req.user.id,
      matchedUserId,
      paymentType
    );

    res.status(200).json({
      status: 'success',
      data: {
        checkoutUrl: result.checkoutUrl,
        sessionId: result.sessionId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chat/access/:matchedUserId
 * Returns chat access status for a specific match.
 */
export const getAccess = async (req, res, next) => {
  try {
    const { matchedUserId } = req.params;
    const access = await paymentService.getChatAccess(req.user.id, matchedUserId);

    res.status(200).json({
      status: 'success',
      data: access,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/stripe/webhook
 * Handles incoming Stripe webhook events.
 * This endpoint does NOT use the auth middleware — Stripe sends these directly.
 * The raw body is required for signature verification.
 */
export const stripeWebhook = async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify webhook signature using the raw body
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`[Stripe Webhook] Signature verification failed: ${err.message}`);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle supported event types
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log(`[Stripe Webhook] checkout.session.completed: ${session.id}`);
        await paymentService.activateAccess(session);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        console.log(`[Stripe Webhook] invoice.paid: ${invoice.id}`);
        // Only process renewal invoices (not the initial one which is handled by checkout.session.completed)
        if (invoice.billing_reason === 'subscription_cycle') {
          await paymentService.renewSubscriptionAccess(invoice);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log(`[Stripe Webhook] customer.subscription.updated: ${subscription.id} status=${subscription.status}`);
        // If subscription becomes past_due or unpaid, cancel access
        if (['past_due', 'unpaid', 'canceled'].includes(subscription.status)) {
          await paymentService.cancelSubscriptionAccess(subscription);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log(`[Stripe Webhook] customer.subscription.deleted: ${subscription.id}`);
        await paymentService.cancelSubscriptionAccess(subscription);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        console.log(`[Stripe Webhook] payment_intent.succeeded: ${paymentIntent.id}`);
        // Access activation is handled by checkout.session.completed
        // This event is logged for audit purposes
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[Stripe Webhook] Error processing event ${event.type}:`, err);
    // Return 200 to Stripe to prevent retries for application errors
    // (Stripe would keep retrying on 500s)
  }

  // Always acknowledge receipt to Stripe
  res.status(200).json({ received: true });
};
