import stripe from '../../config/stripe.js';
import MatchChatAccess from '../../models/MatchChatAccess.js';
import Swipe from '../../models/Swipe.js';
import User from '../../models/User.js';
import AppError from '../../utils/AppError.js';

/** Duration of chat access in milliseconds (24 hours) */
const ACCESS_DURATION_MS = 24 * 60 * 60 * 1000;

/** Amount in paise (₹50 = 5000 paise) */
const AMOUNT_PAISE = 5000;

/** Currency */
const CURRENCY = 'inr';

// ─── Cached Stripe Price IDs ────────────────────────────────────────────────
// Created on first use and reused for all subsequent checkouts.
let oneTimePriceId = null;
let subscriptionPriceId = null;

/**
 * Verify that two users have a mutual match (both swiped right and accepted).
 */
const verifyMutualMatch = async (user1, user2) => {
  const like1 = await Swipe.findOne({
    liker: user1,
    liked: user2,
    status: 'like',
    matchStatus: 'accepted',
  });
  const like2 = await Swipe.findOne({
    liker: user2,
    liked: user1,
    status: 'like',
    matchStatus: 'accepted',
  });
  return !!(like1 && like2);
};

/**
 * Get or create a Stripe Product and Price for one-time chat access.
 * @returns {string} Stripe Price ID
 */
const getOrCreateOneTimePrice = async () => {
  if (oneTimePriceId) return oneTimePriceId;

  // Search for existing product by metadata
  const products = await stripe.products.search({
    query: "metadata['type']:'dating_chat_onetime_v2'",
  });

  let product;
  if (products.data.length > 0) {
    product = products.data[0];
  } else {
    product = await stripe.products.create({
      name: 'Chat Access — 24 Hours',
      description: 'Unlock chat with your match for 24 hours',
      metadata: { type: 'dating_chat_onetime_v2' },
    });
  }

  // Look for existing price on this product
  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 1,
  });

  if (prices.data.length > 0) {
    oneTimePriceId = prices.data[0].id;
  } else {
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: AMOUNT_PAISE,
      currency: CURRENCY,
    });
    oneTimePriceId = price.id;
  }

  return oneTimePriceId;
};

/**
 * Get or create a Stripe Product and recurring Price for subscription chat access.
 * The subscription bills ₹20 every day.
 * @returns {string} Stripe Price ID
 */
const getOrCreateSubscriptionPrice = async () => {
  if (subscriptionPriceId) return subscriptionPriceId;

  const products = await stripe.products.search({
    query: "metadata['type']:'dating_chat_subscription_v2'",
  });

  let product;
  if (products.data.length > 0) {
    product = products.data[0];
  } else {
    product = await stripe.products.create({
      name: 'Chat Access — Daily Auto-Renew',
      description: 'Automatic daily renewal of 24-hour chat access with your match',
      metadata: { type: 'dating_chat_subscription_v2' },
    });
  }

  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    recurring: { interval: 'day' },
    limit: 1,
  });

  if (prices.data.length > 0) {
    subscriptionPriceId = prices.data[0].id;
  } else {
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: AMOUNT_PAISE,
      currency: CURRENCY,
      recurring: { interval: 'day' },
    });
    subscriptionPriceId = price.id;
  }

  return subscriptionPriceId;
};

/**
 * Create a Stripe Checkout Session for chat unlock.
 *
 * @param {string} userId       - The paying user's ID
 * @param {string} matchedUserId - The matched user to unlock chat with
 * @param {'ONE_TIME'|'SUBSCRIPTION'} paymentType - Type of payment
 * @returns {{ checkoutUrl: string, sessionId: string }}
 */
export const createCheckoutSession = async (userId, matchedUserId, paymentType) => {
  // 1) Validate target user exists
  const targetUser = await User.findById(matchedUserId);
  if (!targetUser) {
    throw new AppError('Matched user not found', 404);
  }

  // 2) Verify mutual match
  const isMatched = await verifyMutualMatch(userId, matchedUserId);
  if (!isMatched) {
    throw new AppError('You can only unlock chat with mutual matches', 403);
  }

  // 3) Check for existing active access (only for current user)
  const existingAccess = await MatchChatAccess.findOne({
    payerUserId: userId,
    targetUserId: matchedUserId,
    status: 'ACTIVE',
    expiryDate: { $gt: new Date() },
  });

  if (existingAccess) {
    throw new AppError('You already have active chat access with this match', 400);
  }

  // 4) Get or create Stripe Customer for the paying user
  const payerUser = await User.findById(userId);
  let customerId = payerUser.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: payerUser.email,
      name: payerUser.name,
      metadata: { userId: userId.toString() },
    });
    customerId = customer.id;
    payerUser.stripeCustomerId = customerId;
    await payerUser.save({ validateBeforeSave: false });
  }

  // 5) Build checkout session parameters
  const clientUrl = process.env.CLIENT_URL || 'datingapp://';
  const sessionParams = {
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [],
    metadata: {
      payerUserId: userId.toString(),
      targetUserId: matchedUserId.toString(),
      paymentType,
    },
    success_url: `${clientUrl}payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${clientUrl}payment-cancel`,
  };

  if (paymentType === 'ONE_TIME') {
    const priceId = await getOrCreateOneTimePrice();
    sessionParams.mode = 'payment';
    sessionParams.line_items.push({ price: priceId, quantity: 1 });
  } else {
    // SUBSCRIPTION
    const priceId = await getOrCreateSubscriptionPrice();
    sessionParams.mode = 'subscription';
    sessionParams.line_items.push({ price: priceId, quantity: 1 });
    // Pass metadata to the subscription itself for webhook identification
    sessionParams.subscription_data = {
      metadata: {
        payerUserId: userId.toString(),
        targetUserId: matchedUserId.toString(),
      },
    };
  }

  // 6) Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create(sessionParams);

  // 7) Create a PENDING MatchChatAccess record
  await MatchChatAccess.create({
    payerUserId: userId,
    targetUserId: matchedUserId,
    stripeCheckoutSessionId: session.id,
    stripeCustomerId: customerId,
    accessType: paymentType,
    amount: AMOUNT_PAISE,
    currency: CURRENCY,
    status: 'PENDING',
  });

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
  };
};

/**
 * Get chat access status for a specific match.
 * Checks both directions (either user could have paid).
 *
 * @param {string} userId - The requesting user
 * @param {string} matchedUserId - The other user in the match
 * @returns {{ hasAccess: boolean, canSend: boolean, expiryDate: Date|null, remainingTime: number|null, accessType: string|null, status: string|null }}
 */
export const getChatAccess = async (userId, matchedUserId) => {
  const access = await MatchChatAccess.findOne({
    $or: [
      { payerUserId: userId, targetUserId: matchedUserId },
      { payerUserId: matchedUserId, targetUserId: userId },
    ],
    status: 'ACTIVE',
    expiryDate: { $gt: new Date() },
  }).sort({ expiryDate: -1 });

  if (!access) {
    return {
      hasAccess: false,
      canSend: false,
      expiryDate: null,
      remainingTime: null,
      accessType: null,
      status: null,
    };
  }

  // Determine if the current user has paid independently to send messages
  const currentUserPaid = await MatchChatAccess.findOne({
    payerUserId: userId,
    targetUserId: matchedUserId,
    status: 'ACTIVE',
    expiryDate: { $gt: new Date() },
  });

  const remainingTime = access.expiryDate.getTime() - Date.now();

  return {
    hasAccess: !!currentUserPaid,
    canSend: !!currentUserPaid,
    expiryDate: currentUserPaid ? currentUserPaid.expiryDate : (access ? access.expiryDate : null),
    remainingTime: Math.max(0, remainingTime),
    accessType: access.accessType,
    status: access.status,
  };
};

/**
 * Check if two users have active chat access (used by middleware and sockets).
 * @param {string} user1 - First user ID
 * @param {string} user2 - Second user ID
 * @returns {boolean}
 */
export const hasActiveAccess = async (user1, user2) => {
  const access = await MatchChatAccess.findOne({
    $or: [
      { payerUserId: user1, targetUserId: user2 },
      { payerUserId: user2, targetUserId: user1 },
    ],
    status: 'ACTIVE',
    expiryDate: { $gt: new Date() },
  });
  return !!access;
};

/**
 * Activate chat access after successful Stripe Checkout.
 * Called from the webhook handler for `checkout.session.completed`.
 *
 * @param {Object} session - Stripe Checkout Session object
 */
export const activateAccess = async (session) => {
  const { id: sessionId, metadata, payment_intent, subscription } = session;

  // Find the pending access record by checkout session ID
  const access = await MatchChatAccess.findOne({
    stripeCheckoutSessionId: sessionId,
    status: 'PENDING',
  });

  if (!access) {
    console.warn(`[Stripe Webhook] No pending access found for session: ${sessionId}`);
    return;
  }

  const now = new Date();
  access.status = 'ACTIVE';
  access.startDate = now;
  access.expiryDate = new Date(now.getTime() + ACCESS_DURATION_MS);
  access.stripePaymentIntentId = payment_intent || null;
  access.stripeSubscriptionId = subscription || null;

  await access.save();
  console.log(`[Chat Access] Activated for payer=${access.payerUserId} target=${access.targetUserId} until ${access.expiryDate}`);
};

/**
 * Renew subscription-based chat access when a recurring invoice is paid.
 * Called from the webhook handler for `invoice.paid`.
 *
 * @param {Object} invoice - Stripe Invoice object
 */
export const renewSubscriptionAccess = async (invoice) => {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  // Find the access record by subscription ID
  const access = await MatchChatAccess.findOne({
    stripeSubscriptionId: subscriptionId,
    accessType: 'SUBSCRIPTION',
  }).sort({ createdAt: -1 });

  if (!access) {
    console.warn(`[Stripe Webhook] No subscription access found for: ${subscriptionId}`);
    return;
  }

  const now = new Date();
  access.status = 'ACTIVE';
  access.startDate = now;
  access.expiryDate = new Date(now.getTime() + ACCESS_DURATION_MS);

  await access.save();
  console.log(`[Chat Access] Renewed subscription for payer=${access.payerUserId} target=${access.targetUserId} until ${access.expiryDate}`);
};

/**
 * Cancel subscription-based chat access.
 * Called from the webhook handler for `customer.subscription.deleted`.
 *
 * @param {Object} subscription - Stripe Subscription object
 */
export const cancelSubscriptionAccess = async (subscription) => {
  const access = await MatchChatAccess.findOne({
    stripeSubscriptionId: subscription.id,
    accessType: 'SUBSCRIPTION',
  });

  if (!access) {
    console.warn(`[Stripe Webhook] No subscription access found to cancel: ${subscription.id}`);
    return;
  }

  access.status = 'CANCELLED';
  await access.save();
  console.log(`[Chat Access] Cancelled subscription for payer=${access.payerUserId} target=${access.targetUserId}`);
};

/**
 * Expire all stale access records.
 * Called by the cron job every hour.
 *
 * @returns {number} Number of records expired
 */
export const expireStaleAccess = async () => {
  const result = await MatchChatAccess.updateMany(
    {
      status: 'ACTIVE',
      expiryDate: { $lte: new Date() },
    },
    {
      $set: { status: 'EXPIRED' },
    }
  );

  if (result.modifiedCount > 0) {
    console.log(`[Cron] Expired ${result.modifiedCount} chat access records`);
  }

  return result.modifiedCount;
};
