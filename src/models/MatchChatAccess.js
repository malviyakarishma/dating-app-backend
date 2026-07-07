import mongoose from 'mongoose';

/**
 * MatchChatAccess Model
 * Tracks paid chat access between matched users.
 * Each record represents a single payment/subscription granting
 * time-limited chat access for a specific match pair.
 */
const matchChatAccessSchema = new mongoose.Schema(
  {
    // The user who initiated and paid for the chat unlock
    payerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // The other user in the match (recipient of the unlock)
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Stripe Payment Intent ID (for one-time payments)
    stripePaymentIntentId: {
      type: String,
      default: null,
    },
    // Stripe Subscription ID (for recurring payments)
    stripeSubscriptionId: {
      type: String,
      default: null,
    },
    // Stripe Checkout Session ID (for tracking pending sessions)
    stripeCheckoutSessionId: {
      type: String,
      default: null,
    },
    // Stripe Customer ID (for managing subscriptions)
    stripeCustomerId: {
      type: String,
      default: null,
    },
    // Payment type: one-time 24h access or daily recurring subscription
    accessType: {
      type: String,
      enum: ['ONE_TIME', 'SUBSCRIPTION'],
      required: true,
    },
    // Amount in smallest currency unit (paise for INR — 2000 = ₹20)
    amount: {
      type: Number,
      required: true,
      default: 2000,
    },
    // Currency code
    currency: {
      type: String,
      default: 'inr',
    },
    // Current status of this access record
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED'],
      default: 'PENDING',
    },
    // When the paid access window started
    startDate: {
      type: Date,
      default: null,
    },
    // When the paid access window expires
    expiryDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
// Fast lookup: "Does this user pair have active access?"
matchChatAccessSchema.index({ payerUserId: 1, targetUserId: 1, status: 1 });
// Fast lookup: reverse direction (either user can be payer)
matchChatAccessSchema.index({ targetUserId: 1, payerUserId: 1, status: 1 });
// Cron job efficiency: find all expired records quickly
matchChatAccessSchema.index({ expiryDate: 1, status: 1 });
// Webhook lookup by checkout session
matchChatAccessSchema.index({ stripeCheckoutSessionId: 1 });
// Webhook lookup by subscription
matchChatAccessSchema.index({ stripeSubscriptionId: 1 });

const MatchChatAccess = mongoose.model('MatchChatAccess', matchChatAccessSchema);
export default MatchChatAccess;
