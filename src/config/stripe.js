/**
 * Stripe SDK Configuration
 * Initializes the Stripe instance with the secret key from environment variables.
 * The SDK will use its built-in default API version.
 */
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default stripe;

