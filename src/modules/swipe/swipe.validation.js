import Joi from 'joi';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const swipe = {
  body: Joi.object().keys({
    likedId: Joi.string().required().regex(objectIdPattern).message('Invalid user ID format'),
    status: Joi.string().required().valid('like', 'dislike'),
  }),
};

export const respondRequest = {
  body: Joi.object().keys({
    action: Joi.string().required().valid('accept', 'decline'),
  }),
};
