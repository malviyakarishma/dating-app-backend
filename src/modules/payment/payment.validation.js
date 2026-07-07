import Joi from 'joi';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

/**
 * POST /api/chat/unlock
 * Validate the request to create a Stripe Checkout Session for chat unlock.
 */
export const unlockChat = {
  body: Joi.object().keys({
    matchedUserId: Joi.string()
      .required()
      .regex(objectIdPattern)
      .messages({ 'string.pattern.base': 'Invalid matched user ID format' }),
    paymentType: Joi.string()
      .required()
      .valid('ONE_TIME', 'SUBSCRIPTION')
      .messages({ 'any.only': 'paymentType must be ONE_TIME or SUBSCRIPTION' }),
  }),
};

/**
 * GET /api/chat/access/:matchedUserId
 * Validate the matchedUserId param.
 */
export const getAccess = {
  params: Joi.object().keys({
    matchedUserId: Joi.string()
      .required()
      .regex(objectIdPattern)
      .messages({ 'string.pattern.base': 'Invalid matched user ID format' }),
  }),
};
