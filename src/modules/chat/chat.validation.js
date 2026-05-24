import Joi from 'joi';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const sendMessage = {
  body: Joi.object().keys({
    receiverId: Joi.string().required().regex(objectIdPattern).message('Invalid receiver ID format'),
    text: Joi.string().required().trim().min(1).max(2000),
  }),
};

export const getHistory = {
  params: Joi.object().keys({
    otherUserId: Joi.string().required().regex(objectIdPattern).message('Invalid user ID format'),
  }),
};
